-- Progression par chapitre : les flashcards comptent aussi.
--
-- Chaque élément publié du chapitre (QCM ou carte) compte pour 1 :
--   * un QCM réussi au moins une fois compte 1 (inchangé) ;
--   * une carte compte pour son score de maîtrise / 100 (card_states.score), donc 0 tant
--     qu'elle n'a jamais été vue, et elle peut redescendre si on l'oublie.
-- progression = (QCM réussis + somme des scores / 100) / (QCM publiés + cartes publiées).
--
-- Les colonnes existantes gardent leur nom et leur sens ; les nouvelles sont ajoutées à la
-- fin (exigence de create or replace view). security_invoker : le RLS de activity_log et
-- de card_states limite aux lignes de l'utilisateur courant.
create or replace view public.chapter_progress
with (security_invoker = true)
as
with q as (
  select q.chapter_id,
         count(*) as total,
         count(*) filter (where exists (
           select 1 from public.activity_log l
           where l.type = 'qcm' and l.item_id = q.id and l.resultat = 'correct'
             and l.user_id = (select auth.uid())
         )) as reussies
  from public.questions q
  where q.statut = 'publie'
  group by q.chapter_id
),
f as (
  select f.chapter_id,
         count(*) as total,
         coalesce(sum(cs.score), 0) / 100.0 as maitrise
  from public.flashcards f
  left join public.card_states cs
    on cs.flashcard_id = f.id and cs.user_id = (select auth.uid())
  where f.statut = 'publie'
  group by f.chapter_id
)
select
  c.id as chapter_id,
  c.subject_id,
  coalesce(q.total, 0) as total_questions,
  coalesce(q.reussies, 0) as questions_reussies,
  case when coalesce(q.total, 0) + coalesce(f.total, 0) = 0 then 0
       else round((coalesce(q.reussies, 0) + coalesce(f.maitrise, 0))
                  / (coalesce(q.total, 0) + coalesce(f.total, 0)), 3)
  end as progression,
  coalesce(f.total, 0) as total_cartes,
  round(coalesce(f.maitrise, 0), 2) as cartes_maitrise
from public.chapters c
left join q on q.chapter_id = c.id
left join f on f.chapter_id = c.id;

grant select on public.chapter_progress to authenticated;
