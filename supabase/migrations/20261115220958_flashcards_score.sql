-- Flashcards : score de maîtrise par carte (remplace les paliers fixes 1/3/7/14 jours).
--
-- Chaque carte a, pour chaque étudiant, un score de 0 à 100 qui fixe son retour :
--   0-9 -> demain, 10-29 -> 3 j, 30-49 -> 5 j, 50-69 -> 9 j, 70-89 -> 15 j, 90-100 -> 30 j.
-- Boutons : À revoir (faux), Difficile (juste), Bien (juste).
--   * Réussite : Bien +15, Difficile +8, multiplié par l'ancienneté (x1 la première fois,
--     +0,25 par jour passé où la carte est revenue, plafond x2), plus un bonus de série
--     (+3 par réussite consécutive déjà acquise, plafond +15).
--   * Erreur : -25 (plancher 0), la série retombe à 0.
--   * Seule la première réponse du jour fait monter le score ; les répétitions dans la
--     séance servent à apprendre. Les erreurs comptent toutes, 2 pénalités par jour au plus.
-- L'ordre dans la séance (découverte, retours selon les erreurs, file rouge) est géré par
-- le front (src/features/flashcards/scheduler.ts) ; le serveur enregistre chaque réponse.
--
-- card_states.palier devient l'intervalle courant (1, 3, 5, 9, 15 ou 30 jours).
-- activity_log ne reçoit que la première réponse d'une carte dans une session : les
-- statistiques, le feed et les points (3 par carte et par jour) comptent des cartes, pas
-- des passages. Difficile y est écrit 'bien' (réussite).

-- ---------------------------------------------------------------------------
-- card_states : nouvelles colonnes, reprise des paliers existants
-- ---------------------------------------------------------------------------
alter table public.card_states drop constraint if exists card_states_palier_check;

alter table public.card_states
  add column score smallint not null default 0 check (score between 0 and 100),
  add column serie smallint not null default 0 check (serie >= 0),
  add column jours_vus smallint not null default 0 check (jours_vus >= 0),
  add column dernier_jour date,
  add column penalites_jour smallint not null default 0 check (penalites_jour between 0 and 2);

-- Personne ne perd sa progression : 1 j -> 5, 3 j -> 20, 7 j -> 40, 14 j -> 60.
-- Jours passés sur la carte et dernier jour : repris d'activity_log ; l'échéance ne bouge pas.
update public.card_states cs
set score = case cs.palier when 1 then 5 when 3 then 20 when 7 then 40 else 60 end,
    palier = case cs.palier when 1 then 1 when 3 then 3 when 7 then 5 else 9 end,
    jours_vus = greatest(1, (
      select count(distinct l.jour) from public.activity_log l
      where l.user_id = cs.user_id and l.type = 'flashcard' and l.item_id = cs.flashcard_id
    )),
    dernier_jour = coalesce((
      select max(l.jour) from public.activity_log l
      where l.user_id = cs.user_id and l.type = 'flashcard' and l.item_id = cs.flashcard_id
    ), (cs.last_reviewed at time zone 'Europe/Paris')::date);

alter table public.card_states
  add constraint card_states_palier_check check (palier in (1, 3, 5, 9, 15, 30));

-- ---------------------------------------------------------------------------
-- Règles (pures)
-- ---------------------------------------------------------------------------
create or replace function private.flashcard_interval(p_score integer)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score < 10 then 1
    when p_score < 30 then 3
    when p_score < 50 then 5
    when p_score < 70 then 9
    when p_score < 90 then 15
    else 30
  end::smallint
$$;

-- État après une réponse. p_dernier_jour null = carte jamais vue.
create or replace function private.flashcard_apply(
  p_score smallint,
  p_serie smallint,
  p_jours_vus smallint,
  p_dernier_jour date,
  p_penalites smallint,
  p_note text,
  p_jour date,
  out score smallint,
  out serie smallint,
  out jours_vus smallint,
  out penalites smallint,
  out intervalle smallint
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_first boolean := p_dernier_jour is distinct from p_jour;
  v_score numeric := coalesce(p_score, 0);
  v_serie integer := coalesce(p_serie, 0);
  v_jours integer := coalesce(p_jours_vus, 0);
  v_pen integer := case when v_first then 0 else coalesce(p_penalites, 0) end;
begin
  if p_note not in ('a_revoir', 'difficile', 'bien') then
    raise exception 'Note invalide' using errcode = '22023';
  end if;

  if p_note = 'a_revoir' then
    if v_pen < 2 then
      v_score := greatest(0, v_score - 25);
      v_pen := v_pen + 1;
    end if;
    v_serie := 0;
  elsif v_first then
    v_score := least(100, v_score + round(
      (case p_note when 'bien' then 15 else 8 end) * least(2, 1 + 0.25 * v_jours)
      + least(15, 3 * v_serie)
    ));
    v_serie := v_serie + 1;
  end if;

  if v_first then
    v_jours := v_jours + 1;
  end if;

  score := v_score;
  serie := least(v_serie, 32767);
  jours_vus := least(v_jours, 32767);
  penalites := v_pen;
  intervalle := private.flashcard_interval(v_score::integer);
end;
$$;

revoke all on function private.flashcard_interval(integer) from public, anon;
revoke all on function private.flashcard_apply(smallint, smallint, smallint, date, smallint, text, date)
  from public, anon;
grant execute on function private.flashcard_interval(integer) to authenticated;
grant execute on function private.flashcard_apply(smallint, smallint, smallint, date, smallint, text, date)
  to authenticated;

-- Échéances que donnerait chacun des trois boutons, depuis l'état courant.
create or replace function private.flashcard_previews(
  p_score smallint,
  p_serie smallint,
  p_jours_vus smallint,
  p_dernier_jour date,
  p_penalites smallint,
  p_jour date
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'a_revoir', (private.flashcard_apply(p_score, p_serie, p_jours_vus, p_dernier_jour, p_penalites, 'a_revoir', p_jour)).intervalle,
    'difficile', (private.flashcard_apply(p_score, p_serie, p_jours_vus, p_dernier_jour, p_penalites, 'difficile', p_jour)).intervalle,
    'bien', (private.flashcard_apply(p_score, p_serie, p_jours_vus, p_dernier_jour, p_penalites, 'bien', p_jour)).intervalle
  )
$$;

revoke all on function private.flashcard_previews(smallint, smallint, smallint, date, smallint, date) from public, anon;
grant execute on function private.flashcard_previews(smallint, smallint, smallint, date, smallint, date) to authenticated;

-- ---------------------------------------------------------------------------
-- review_flashcard : la note devient du texte (a_revoir, difficile, bien)
-- ---------------------------------------------------------------------------
drop function public.review_flashcard(uuid, uuid, public.activity_result);
drop function private.flashcard_next_palier(smallint, public.activity_result);

create function public.review_flashcard(
  p_session_id uuid,
  p_flashcard_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_old public.card_states;
  v_new record;
  v_due date;
  v_points integer := 0;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if p_note is null or p_note not in ('a_revoir', 'difficile', 'bien') then
    raise exception 'Note invalide' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.user_id = v_uid and s.mode = 'flashcard' and s.ended_at is null
  ) then
    raise exception 'Session inconnue ou terminée' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.flashcards f
    where f.id = p_flashcard_id and (f.statut = 'publie' or (select private.is_admin()))
  ) then
    raise exception 'Carte inconnue' using errcode = '22023';
  end if;

  select * into v_old
  from public.card_states cs
  where cs.user_id = v_uid and cs.flashcard_id = p_flashcard_id
  for update;

  select * into v_new
  from private.flashcard_apply(v_old.score, v_old.serie, v_old.jours_vus, v_old.dernier_jour,
                               v_old.penalites_jour, p_note, v_jour);
  v_due := v_jour + v_new.intervalle;

  insert into public.card_states (user_id, flashcard_id, palier, due_date, last_reviewed,
                                  score, serie, jours_vus, dernier_jour, penalites_jour)
  values (v_uid, p_flashcard_id, v_new.intervalle, v_due, now(),
          v_new.score, v_new.serie, v_new.jours_vus, v_jour, v_new.penalites)
  on conflict (user_id, flashcard_id) do update
    set palier = excluded.palier, due_date = excluded.due_date, last_reviewed = excluded.last_reviewed,
        score = excluded.score, serie = excluded.serie, jours_vus = excluded.jours_vus,
        dernier_jour = excluded.dernier_jour, penalites_jour = excluded.penalites_jour;

  -- Une seule ligne d'activité par carte et par session (la première réponse).
  if not exists (
    select 1 from public.activity_log l
    where l.session_id = p_session_id and l.type = 'flashcard' and l.item_id = p_flashcard_id
  ) then
    v_points := private.log_activity(
      v_uid, p_session_id, 'flashcard', p_flashcard_id,
      (case when p_note = 'a_revoir' then 'a_revoir' else 'bien' end)::public.activity_result, 3
    );
  end if;

  return jsonb_build_object(
    'palier', v_new.intervalle,
    'due_date', v_due,
    'points', v_points,
    'nouvelle', v_old.flashcard_id is null,
    'score', v_new.score,
    'next', private.flashcard_previews(v_new.score, v_new.serie, v_new.jours_vus, v_jour, v_new.penalites, v_jour)
  );
end;
$$;

revoke all on function public.review_flashcard(uuid, uuid, text) from public, anon;
grant execute on function public.review_flashcard(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- flashcard_queue : mêmes cartes qu'avant (dues puis nouvelles dans l'ordre du
-- programme), échéances des trois nouveaux boutons et score.
-- ---------------------------------------------------------------------------
drop function public.flashcard_queue(uuid, integer);

create function public.flashcard_queue(
  p_chapter_id uuid default null,
  p_new_limit integer default 20
)
returns table (
  flashcard_id uuid,
  chapter_id uuid,
  chapter_nom text,
  subject_nom text,
  recto text,
  verso text,
  is_new boolean,
  palier smallint,
  due_date date,
  score smallint,
  next_a_revoir smallint,
  next_difficile smallint,
  next_bien smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (select (now() at time zone 'Europe/Paris')::date as d),
  cards as (
    select f.id, f.chapter_id, c.nom as chapter_nom, s.nom as subject_nom, f.recto, f.verso,
           s.ordre as s_ordre, c.ordre as c_ordre, f.ordre as f_ordre, f.created_at,
           cs.palier, cs.due_date, cs.score, cs.serie, cs.jours_vus, cs.dernier_jour, cs.penalites_jour
    from public.flashcards f
    join public.chapters c on c.id = f.chapter_id
    join public.subjects s on s.id = c.subject_id
    left join public.card_states cs on cs.flashcard_id = f.id and cs.user_id = (select auth.uid())
    where f.statut = 'publie'
      and (p_chapter_id is null or f.chapter_id = p_chapter_id)
  ),
  due as (
    select k.*, 0 as grp,
           row_number() over (order by k.due_date, k.s_ordre, k.c_ordre, k.f_ordre, k.created_at) as rn
    from cards k, today t
    where k.due_date is not null and k.due_date <= t.d
  ),
  fresh as (
    select k.*, 1 as grp,
           row_number() over (order by k.s_ordre, k.c_ordre, k.f_ordre, k.created_at) as rn
    from cards k
    where k.palier is null
    order by k.s_ordre, k.c_ordre, k.f_ordre, k.created_at
    limit greatest(coalesce(p_new_limit, 20), 0)
  ),
  q as (
    select x.*, private.flashcard_previews(x.score, x.serie, x.jours_vus, x.dernier_jour, x.penalites_jour, t.d) as nx
    from (select * from due union all select * from fresh) x, today t
  )
  select q.id, q.chapter_id, q.chapter_nom, q.subject_nom, q.recto, q.verso,
         q.palier is null, q.palier, q.due_date, coalesce(q.score, 0)::smallint,
         (q.nx->>'a_revoir')::smallint, (q.nx->>'difficile')::smallint, (q.nx->>'bien')::smallint
  from q
  where (select auth.uid()) is not null
  order by q.grp, q.rn
$$;

revoke all on function public.flashcard_queue(uuid, integer) from public, anon;
grant execute on function public.flashcard_queue(uuid, integer) to authenticated;
