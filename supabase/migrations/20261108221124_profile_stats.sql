-- Chantier F (Profil) : statistiques privées de l'étudiant connecté.
--   * public.my_revision_time()          -> activité par jour (Paris) et par matière,
--                                            pour le calendrier et le temps de révision
--   * public.my_session_history(n, avant) -> historique des sessions avec chapitre,
--                                            matière et nombre d'éléments
-- Les durées (1 min par QCM, 20 s par carte) restent dans src/lib/scoring.ts : la base
-- renvoie des comptes, le front les convertit en minutes. Pour les exercices, la base
-- renvoie directement la somme des durées estimées (duree_min).
-- security definer : lit activity_log / sessions avec le contenu (même dépublié depuis),
-- mais filtre toujours sur auth.uid() : personne ne voit l'historique d'un autre.

create or replace function public.my_revision_time()
returns table (jour date, subject_id uuid, nb_qcm integer, nb_cartes integer, minutes_exo integer)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select l.jour, l.type, l.item_id
    from public.activity_log l
    where l.user_id = (select auth.uid())
  ),
  items as (
    select m.jour, c.subject_id, m.type, 0 as duree
    from mine m
    join public.questions q on m.type = 'qcm' and q.id = m.item_id
    join public.chapters c on c.id = q.chapter_id
    union all
    select m.jour, c.subject_id, m.type, 0
    from mine m
    join public.flashcards f on m.type = 'flashcard' and f.id = m.item_id
    join public.chapters c on c.id = f.chapter_id
    union all
    select m.jour, c.subject_id, m.type, e.duree_min::int
    from mine m
    join public.exercises e on m.type = 'exo' and e.id = m.item_id
    join public.chapters c on c.id = e.chapter_id
  )
  select
    i.jour,
    i.subject_id,
    (count(*) filter (where i.type = 'qcm'))::int as nb_qcm,
    (count(*) filter (where i.type = 'flashcard'))::int as nb_cartes,
    coalesce(sum(i.duree) filter (where i.type = 'exo'), 0)::int as minutes_exo
  from items i
  group by i.jour, i.subject_id
  order by i.jour;
$$;

revoke all on function public.my_revision_time() from public, anon;
grant execute on function public.my_revision_time() to authenticated;

-- Historique : sessions ayant au moins une réponse, de la plus récente à la plus ancienne.
-- Pagination par curseur : p_before = started_at de la dernière ligne déjà affichée.
create or replace function public.my_session_history(
  p_limit integer default 6,
  p_before timestamptz default null
)
returns table (
  id uuid,
  mode public.activity_mode,
  variante public.session_variant,
  started_at timestamptz,
  ended_at timestamptz,
  chapter_nom text,
  subject_nom text,
  nb_items integer,
  nb_reussis integer,
  resultat_exo public.activity_result,
  minutes_exo integer,
  points integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.mode,
    s.variante,
    s.started_at,
    s.ended_at,
    c.nom as chapter_nom,
    sub.nom as subject_nom,
    a.nb_items,
    a.nb_reussis,
    a.resultat_exo,
    a.minutes_exo,
    a.points
  from public.sessions s
  left join public.chapters c on c.id = s.chapter_id
  left join public.subjects sub on sub.id = c.subject_id
  cross join lateral (
    select
      count(*)::int as nb_items,
      (count(*) filter (where l.resultat in ('correct', 'bien', 'facile', 'reussi')))::int as nb_reussis,
      -- résultat du dernier exercice de la session (une session d'exercices en compte souvent un)
      (array_agg(l.resultat order by l.created_at desc) filter (where l.type = 'exo'))[1] as resultat_exo,
      coalesce(sum(e.duree_min), 0)::int as minutes_exo,
      coalesce(sum(l.points), 0)::int as points
    from public.activity_log l
    left join public.exercises e on l.type = 'exo' and e.id = l.item_id
    where l.session_id = s.id
  ) a
  where s.user_id = (select auth.uid())
    and (p_before is null or s.started_at < p_before)
    and a.nb_items > 0
  order by s.started_at desc
  limit least(greatest(coalesce(p_limit, 6), 1), 50);
$$;

revoke all on function public.my_session_history(integer, timestamptz) from public, anon;
grant execute on function public.my_session_history(integer, timestamptz) to authenticated;
