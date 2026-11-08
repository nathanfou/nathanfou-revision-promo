-- Chantier A : page Révision et import du contenu.
--
-- 1. Clés naturelles du contenu, pour que le script d'import soit idempotent
--    (upsert par matière / chapitre / texte) : relancer un import met à jour
--    au lieu de dupliquer.
-- 2. RPC revision_overview() : compteurs par chapitre pour la page Révision
--    (QCM, cartes, cartes dues aujourd'hui, nouvelles cartes, exercices), en un
--    seul appel plutôt que de rapatrier tout le contenu dans le navigateur.

-- ---------------------------------------------------------------------------
-- Clés naturelles
-- ---------------------------------------------------------------------------
alter table public.questions  add constraint questions_chapter_enonce_key unique (chapter_id, enonce);
alter table public.flashcards add constraint flashcards_chapter_recto_key unique (chapter_id, recto);
alter table public.exercises  add constraint exercises_chapter_titre_key unique (chapter_id, titre);
alter table public.exams      add constraint exams_subject_nom_key unique (subject_id, nom);

-- ---------------------------------------------------------------------------
-- revision_overview : une ligne par chapitre, pour l'étudiant connecté.
-- security invoker : le RLS s'applique (contenu publié, card_states de
-- l'utilisateur seulement). Seul le contenu publié est compté, y compris pour
-- l'admin, pour que les chiffres soient ceux que voient les étudiants.
-- "Dues" = cartes déjà vues dont l'échéance (jour de Paris) est aujourd'hui ou passée.
-- ---------------------------------------------------------------------------
create or replace function public.revision_overview()
returns table (
  chapter_id uuid,
  nb_qcm integer,
  nb_cartes integer,
  cartes_dues integer,
  cartes_nouvelles integer,
  nb_exercices integer,
  exo_duree_min smallint,
  exo_duree_max smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid, (now() at time zone 'Europe/Paris')::date as today
  ),
  q as (
    select q.chapter_id, count(*)::integer as n
    from public.questions q
    where q.statut = 'publie'
    group by q.chapter_id
  ),
  f as (
    select
      fc.chapter_id,
      count(*)::integer as n,
      count(*) filter (where cs.flashcard_id is not null and cs.due_date <= me.today)::integer as dues,
      count(*) filter (where cs.flashcard_id is null)::integer as nouvelles
    from public.flashcards fc
    cross join me
    left join public.card_states cs on cs.flashcard_id = fc.id and cs.user_id = me.uid
    where fc.statut = 'publie'
    group by fc.chapter_id
  ),
  e as (
    select ex.chapter_id, count(*)::integer as n, min(ex.duree_min) as dmin, max(ex.duree_min) as dmax
    from public.exercises ex
    where ex.statut = 'publie'
    group by ex.chapter_id
  )
  select
    c.id,
    coalesce(q.n, 0),
    coalesce(f.n, 0),
    coalesce(f.dues, 0),
    coalesce(f.nouvelles, 0),
    coalesce(e.n, 0),
    e.dmin,
    e.dmax
  from public.chapters c
  left join q on q.chapter_id = c.id
  left join f on f.chapter_id = c.id
  left join e on e.chapter_id = c.id
  where (select auth.uid()) is not null;
$$;

revoke all on function public.revision_overview() from public, anon;
grant execute on function public.revision_overview() to authenticated;
