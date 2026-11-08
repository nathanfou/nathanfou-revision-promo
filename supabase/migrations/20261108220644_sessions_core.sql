-- Socle commun des sessions (spec : "une session est une série de questions ou de
-- cartes sur un chapitre ; elle est enregistrée avec sa date, sa durée, son score
-- et les points gagnés").
--
-- Fourni ici pour que les chantiers QCM, Flashcards et Exercices partagent la même
-- mécanique :
--   * public.start_session(chapitre, mode, variante)  -> id de session
--   * public.end_session(session)                      -> ligne de session clôturée
--   * private.log_activity(...)                        -> écrit activity_log en appliquant
--     "un élément ne rapporte des points qu'une fois par jour" (points = 0 sinon)
-- Chaque chantier ajoute seulement sa RPC de réponse (submit_qcm_answer,
-- review_flashcard, submit_exercise) qui appelle private.log_activity.

-- La file du jour des flashcards mélange plusieurs chapitres : chapter_id facultatif.
alter table public.sessions alter column chapter_id drop not null;

-- ---------------------------------------------------------------------------
-- start_session
-- ---------------------------------------------------------------------------
create or replace function public.start_session(
  p_chapter_id uuid,
  p_mode public.activity_mode,
  p_variante public.session_variant default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if p_chapter_id is null and p_mode <> 'flashcard' then
    raise exception 'Chapitre obligatoire pour ce mode' using errcode = '22023';
  end if;
  if p_chapter_id is not null and not exists (select 1 from public.chapters c where c.id = p_chapter_id) then
    raise exception 'Chapitre inconnu' using errcode = '22023';
  end if;
  if p_mode = 'qcm' then
    p_variante := coalesce(p_variante, 'entrainement');
  else
    p_variante := null;
  end if;

  insert into public.sessions (user_id, chapter_id, mode, variante)
  values (v_uid, p_chapter_id, p_mode, p_variante)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_session(uuid, public.activity_mode, public.session_variant) from public, anon;
grant execute on function public.start_session(uuid, public.activity_mode, public.session_variant) to authenticated;

-- ---------------------------------------------------------------------------
-- end_session : clôture (idempotent) et recalcule score et points depuis activity_log.
-- score = nombre d'éléments réussis (QCM juste, carte Bien/Facile, exercice réussi).
-- ---------------------------------------------------------------------------
create or replace function public.end_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.sessions;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;

  update public.sessions s
  set ended_at = coalesce(s.ended_at, now()),
      score = coalesce((
        select count(*) from public.activity_log l
        where l.session_id = s.id and l.resultat in ('correct', 'bien', 'facile', 'reussi')
      ), 0),
      points = coalesce((select sum(l.points) from public.activity_log l where l.session_id = s.id), 0)
  where s.id = p_session_id and s.user_id = v_uid
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Session inconnue' using errcode = '22023';
  end if;
  return v_row;
end;
$$;

revoke all on function public.end_session(uuid) from public, anon;
grant execute on function public.end_session(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- private.log_activity : écriture unique dans activity_log pour toutes les RPC.
-- Vérifie que la session appartient à l'utilisateur et n'est pas close, puis
-- applique la règle "une fois par jour" : si l'élément a déjà rapporté des points
-- aujourd'hui (jour de Paris), la ligne est écrite avec 0 point.
-- Renvoie les points réellement attribués. Met aussi à jour score/points de la session.
-- Non exposée (schéma private) : seules les RPC security definer l'appellent.
-- ---------------------------------------------------------------------------
create or replace function private.log_activity(
  p_user_id uuid,
  p_session_id uuid,
  p_type public.activity_mode,
  p_item_id uuid,
  p_resultat public.activity_result,
  p_points integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer := greatest(coalesce(p_points, 0), 0);
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_session_id is not null and not exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.user_id = p_user_id and s.ended_at is null
  ) then
    raise exception 'Session inconnue ou terminée' using errcode = '22023';
  end if;

  if v_points > 0 and exists (
    select 1 from public.activity_log l
    where l.user_id = p_user_id and l.type = p_type and l.item_id = p_item_id
      and l.jour = v_jour and l.points > 0
  ) then
    v_points := 0;
  end if;

  begin
    insert into public.activity_log (user_id, session_id, type, item_id, resultat, points, jour)
    values (p_user_id, p_session_id, p_type, p_item_id, p_resultat, v_points, v_jour);
  exception when unique_violation then
    -- course entre deux réponses simultanées : on garde la règle, sans échouer
    v_points := 0;
    insert into public.activity_log (user_id, session_id, type, item_id, resultat, points, jour)
    values (p_user_id, p_session_id, p_type, p_item_id, p_resultat, 0, v_jour);
  end;

  if p_session_id is not null then
    update public.sessions s
    set points = s.points + v_points,
        score = s.score + case when p_resultat in ('correct', 'bien', 'facile', 'reussi') then 1 else 0 end
    where s.id = p_session_id;
  end if;

  return v_points;
end;
$$;

revoke all on function private.log_activity(uuid, uuid, public.activity_mode, uuid, public.activity_result, integer)
  from public, anon, authenticated;
