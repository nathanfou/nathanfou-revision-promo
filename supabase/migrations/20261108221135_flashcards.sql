-- Chantier C : flashcards (révision espacée, spec "Flashcards et révision espacée").
--
--   * private.flashcard_next_palier(palier, note) : règle des paliers 1/3/7/14 jours
--       - première vue (palier null) : Facile -> 3 j, sinon -> 1 j (le lendemain)
--       - ensuite : À revoir -> 1 j, Bien -> palier suivant, Facile -> saute un palier, max 14
--   * public.review_flashcard(session, carte, note) : écrit card_states + activity_log (3 pts)
--   * public.flashcard_queue(chapitre, limite nouvelles) : cartes dues aujourd'hui (Paris)
--     puis nouvelles cartes jamais vues, avec les échéances des trois boutons
--   * public.flashcard_overview() : par chapitre, cartes dues et nouvelles (accueil téléphone)

-- ---------------------------------------------------------------------------
-- Règle des paliers (pure)
-- ---------------------------------------------------------------------------
create or replace function private.flashcard_next_palier(
  p_palier smallint,
  p_note public.activity_result
)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_note not in ('a_revoir', 'bien', 'facile') then null
    when p_palier is null then case when p_note = 'facile' then 3 else 1 end
    when p_note = 'a_revoir' then 1
    when p_note = 'bien' then case p_palier when 1 then 3 when 3 then 7 else 14 end
    else case p_palier when 1 then 7 else 14 end
  end::smallint
$$;

revoke all on function private.flashcard_next_palier(smallint, public.activity_result) from public, anon;
grant execute on function private.flashcard_next_palier(smallint, public.activity_result) to authenticated;

-- ---------------------------------------------------------------------------
-- review_flashcard
-- ---------------------------------------------------------------------------
create or replace function public.review_flashcard(
  p_session_id uuid,
  p_flashcard_id uuid,
  p_note public.activity_result
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_old smallint;
  v_palier smallint;
  v_due date;
  v_points integer;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if p_note is null or p_note not in ('a_revoir', 'bien', 'facile') then
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

  select cs.palier into v_old
  from public.card_states cs
  where cs.user_id = v_uid and cs.flashcard_id = p_flashcard_id
  for update;

  v_palier := private.flashcard_next_palier(v_old, p_note);
  v_due := v_jour + v_palier;

  insert into public.card_states (user_id, flashcard_id, palier, due_date, last_reviewed)
  values (v_uid, p_flashcard_id, v_palier, v_due, now())
  on conflict (user_id, flashcard_id) do update
    set palier = excluded.palier, due_date = excluded.due_date, last_reviewed = excluded.last_reviewed;

  v_points := private.log_activity(v_uid, p_session_id, 'flashcard', p_flashcard_id, p_note, 3);

  return jsonb_build_object(
    'palier', v_palier,
    'due_date', v_due,
    'points', v_points,
    'nouvelle', v_old is null
  );
end;
$$;

revoke all on function public.review_flashcard(uuid, uuid, public.activity_result) from public, anon;
grant execute on function public.review_flashcard(uuid, uuid, public.activity_result) to authenticated;

-- ---------------------------------------------------------------------------
-- flashcard_queue : security invoker, la RLS filtre les cartes publiées et
-- les card_states de l'utilisateur. Dues d'abord (les plus en retard en tête),
-- puis jusqu'à p_new_limit nouvelles cartes dans l'ordre du programme.
-- ---------------------------------------------------------------------------
create or replace function public.flashcard_queue(
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
  next_a_revoir smallint,
  next_bien smallint,
  next_facile smallint
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
           cs.palier, cs.due_date
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
  )
  select q.id, q.chapter_id, q.chapter_nom, q.subject_nom, q.recto, q.verso,
         q.palier is null, q.palier, q.due_date,
         private.flashcard_next_palier(q.palier, 'a_revoir'),
         private.flashcard_next_palier(q.palier, 'bien'),
         private.flashcard_next_palier(q.palier, 'facile')
  from (select * from due union all select * from fresh) q
  where (select auth.uid()) is not null
  order by q.grp, q.rn
$$;

revoke all on function public.flashcard_queue(uuid, integer) from public, anon;
grant execute on function public.flashcard_queue(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- flashcard_overview : par chapitre ayant des cartes publiées, nombre de cartes
-- dues aujourd'hui et de cartes jamais vues (accueil téléphone, page Révision).
-- ---------------------------------------------------------------------------
create or replace function public.flashcard_overview()
returns table (
  chapter_id uuid,
  chapter_nom text,
  subject_id uuid,
  subject_nom text,
  due_count integer,
  new_count integer,
  total_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.nom, s.id, s.nom,
         count(*) filter (where cs.due_date <= (now() at time zone 'Europe/Paris')::date)::integer,
         count(*) filter (where cs.flashcard_id is null)::integer,
         count(*)::integer
  from public.flashcards f
  join public.chapters c on c.id = f.chapter_id
  join public.subjects s on s.id = c.subject_id
  left join public.card_states cs on cs.flashcard_id = f.id and cs.user_id = (select auth.uid())
  where f.statut = 'publie' and (select auth.uid()) is not null
  group by s.id, s.nom, s.ordre, c.id, c.nom, c.ordre
  order by s.ordre, s.nom, c.ordre, c.nom
$$;

revoke all on function public.flashcard_overview() from public, anon;
grant execute on function public.flashcard_overview() to authenticated;
