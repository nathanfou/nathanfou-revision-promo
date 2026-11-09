-- Feed : un seul événement par séance de révision au lieu d'un par session.
--
-- Avant : chaque session terminée publiait son événement ("a révisé 1 flashcard,
-- +3 pts"). Or un exercice = une session, quitter l'onglet clôt la session de
-- flashcards, une série de QCM fait 5 à 20 questions : une heure de révision
-- remplissait le fil.
--
-- Maintenant : une "séance" regroupe les sessions d'un étudiant qui se suivent à
-- moins de 45 minutes d'écart. La première session terminée crée l'événement
-- (event_data.type = 'seance') ; les suivantes le complètent (compteurs par mode,
-- matières, total de points) et le remontent en haut du fil. Réactions et réponses
-- déjà posées restent attachées.
--
-- Sessions jamais clôturées (onglet tué, téléphone en veille) : start_session clôt
-- désormais les sessions ouvertes de l'utilisateur sans activité depuis 1 heure,
-- datées de leur dernière réponse ; leurs points rejoignent alors le fil.
--
-- Les anciens événements 'session' sont convertis au format 'seance' (une séance
-- chacun, sans regroupement rétroactif).

-- ---------------------------------------------------------------------------
-- Texte d'une séance : "a révisé 5 QCM, 20 flashcards et 1 exercice"
-- ---------------------------------------------------------------------------
create or replace function private.feed_seance_texte(p_modes jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_parts text[] := '{}';
  v_n integer;
begin
  v_n := coalesce((p_modes -> 'qcm' ->> 'items')::integer, 0);
  if v_n > 0 then
    v_parts := v_parts || (v_n || ' QCM');
  end if;
  v_n := coalesce((p_modes -> 'flashcard' ->> 'items')::integer, 0);
  if v_n > 0 then
    v_parts := v_parts || (v_n || case when v_n > 1 then ' flashcards' else ' flashcard' end);
  end if;
  v_n := coalesce((p_modes -> 'exo' ->> 'items')::integer, 0);
  if v_n > 0 then
    v_parts := v_parts || (v_n || case when v_n > 1 then ' exercices' else ' exercice' end);
  end if;

  if cardinality(v_parts) = 0 then
    return 'a révisé';
  elsif cardinality(v_parts) = 1 then
    return 'a révisé ' || v_parts[1];
  end if;
  return 'a révisé '
    || array_to_string(v_parts[1:cardinality(v_parts) - 1], ', ')
    || ' et ' || v_parts[cardinality(v_parts)];
end;
$$;

revoke all on function private.feed_seance_texte(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Session terminée -> crée ou complète la séance en cours
-- ---------------------------------------------------------------------------
create or replace function private.feed_session_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz := coalesce(new.ended_at, now());
  v_items integer;
  v_ok integer;
  v_chapitre text;
  v_matiere text;
  v_id uuid;
  v_data jsonb;
  v_mode text := new.mode::text;
  v_part jsonb;
begin
  select count(*)::integer,
         (count(*) filter (where l.resultat in ('correct', 'bien', 'facile', 'reussi')))::integer
    into v_items, v_ok
  from public.activity_log l
  where l.session_id = new.id;

  if coalesce(v_items, 0) = 0 then
    return null;
  end if;

  select c.nom, s.nom into v_chapitre, v_matiere
  from public.chapters c
  join public.subjects s on s.id = c.subject_id
  where c.id = new.chapter_id;

  -- deux sessions qui se ferment en même temps (pagehide) ne créent qu'une séance
  perform pg_advisory_xact_lock(hashtextextended('feed_seance:' || new.user_id::text, 0));

  select f.id, f.event_data into v_id, v_data
  from public.feed_items f
  where f.user_id = new.user_id
    and f.kind = 'event'
    and f.event_data ->> 'type' = 'seance'
    and (f.event_data ->> 'fin')::timestamptz >= v_at - interval '45 minutes'
    and (f.event_data ->> 'debut')::timestamptz <= v_at + interval '45 minutes'
  order by f.created_at desc
  limit 1
  for update;

  if v_id is null then
    v_data := jsonb_build_object(
      'type', 'seance',
      'debut', v_at,
      'fin', v_at,
      'sessions', 0,
      'points', 0,
      'modes', '{}'::jsonb,
      'matieres', '[]'::jsonb,
      'chapitres', '[]'::jsonb
    );
  end if;

  v_part := coalesce(v_data -> 'modes' -> v_mode, '{"items": 0, "reussis": 0}'::jsonb);
  v_part := jsonb_build_object(
    'items', (v_part ->> 'items')::integer + v_items,
    'reussis', (v_part ->> 'reussis')::integer + v_ok
  );

  v_data := v_data
    || jsonb_build_object(
      'debut', least((v_data ->> 'debut')::timestamptz, v_at),
      'fin', greatest((v_data ->> 'fin')::timestamptz, v_at),
      'sessions', (v_data ->> 'sessions')::integer + 1,
      'points', (v_data ->> 'points')::integer + new.points,
      'modes', (v_data -> 'modes') || jsonb_build_object(v_mode, v_part)
    );
  if v_matiere is not null and not (v_data -> 'matieres') ? v_matiere then
    v_data := jsonb_set(v_data, '{matieres}', (v_data -> 'matieres') || to_jsonb(v_matiere));
  end if;
  if v_chapitre is not null and not (v_data -> 'chapitres') ? v_chapitre then
    v_data := jsonb_set(v_data, '{chapitres}', (v_data -> 'chapitres') || to_jsonb(v_chapitre));
  end if;

  if v_id is null then
    insert into public.feed_items (user_id, kind, texte, event_data, created_at)
    values (new.user_id, 'event', private.feed_seance_texte(v_data -> 'modes'), v_data, v_at);
  else
    update public.feed_items f
    set texte = private.feed_seance_texte(v_data -> 'modes'),
        event_data = v_data,
        created_at = greatest(f.created_at, v_at)
    where f.id = v_id;
  end if;
  return null;
end;
$$;

revoke all on function private.feed_session_event() from public, anon, authenticated;
-- le trigger sessions_feed_event (feed_events) appelle déjà cette fonction

-- ---------------------------------------------------------------------------
-- start_session : clôt d'abord les sessions abandonnées de l'utilisateur
-- (ouvertes, sans réponse depuis 1 heure), datées de leur dernière réponse.
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

  -- score et points sont tenus à jour par private.log_activity
  update public.sessions s
  set ended_at = t.last_at
  from (
    select s2.id, coalesce(max(l.created_at), s2.started_at) as last_at
    from public.sessions s2
    left join public.activity_log l on l.session_id = s2.id
    where s2.user_id = v_uid and s2.ended_at is null
    group by s2.id, s2.started_at
  ) t
  where s.id = t.id
    and t.last_at < now() - interval '1 hour';

  insert into public.sessions (user_id, chapter_id, mode, variante)
  values (v_uid, p_chapter_id, p_mode, p_variante)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_session(uuid, public.activity_mode, public.session_variant) from public, anon;
grant execute on function public.start_session(uuid, public.activity_mode, public.session_variant) to authenticated;

-- ---------------------------------------------------------------------------
-- Conversion des anciens événements 'session'
-- ---------------------------------------------------------------------------
update public.feed_items f
set event_data = jsonb_build_object(
      'type', 'seance',
      'debut', f.created_at,
      'fin', f.created_at,
      'sessions', 1,
      'points', coalesce((f.event_data ->> 'points')::integer, 0),
      'modes', jsonb_build_object(
        f.event_data ->> 'mode',
        jsonb_build_object(
          'items', coalesce((f.event_data ->> 'items')::integer, 0),
          'reussis', coalesce((f.event_data ->> 'reussis')::integer, 0)
        )
      ),
      'matieres', case when f.event_data ->> 'matiere' is null then '[]'::jsonb else jsonb_build_array(f.event_data ->> 'matiere') end,
      'chapitres', case when f.event_data ->> 'chapitre' is null then '[]'::jsonb else jsonb_build_array(f.event_data ->> 'chapitre') end
    ),
    texte = private.feed_seance_texte(jsonb_build_object(
      f.event_data ->> 'mode',
      jsonb_build_object('items', coalesce((f.event_data ->> 'items')::integer, 0))
    ))
where f.kind = 'event'
  and f.event_data ->> 'type' = 'session';
