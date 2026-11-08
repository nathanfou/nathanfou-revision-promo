-- Classements et progression, dérivés de activity_log (spec, sections "Points et
-- classement" et "Modèle de données").

-- Début de la semaine (lundi 00h00, heure de Paris) contenant l'instant donné.
create or replace function public.paris_week_start(p_at timestamptz default now())
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (date_trunc('week', p_at at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
$$;

revoke all on function public.paris_week_start(timestamptz) from public, anon;
grant execute on function public.paris_week_start(timestamptz) to authenticated;

-- Classement de toute la promo.
--   p_scope = 'week'  : semaine contenant p_week_of (par défaut la semaine en cours)
--   p_scope = 'total' : cumulé depuis le début
-- Renvoie tous les profils (0 point inclus) ; le front affiche le top 5 puis
-- la position de l'étudiant et ses voisins.
-- security definer : agrège le journal de tout le monde, mais ne renvoie que
-- pseudo, photo et total de points (pas d'historique).
create or replace function public.leaderboard(
  p_scope text default 'week',
  p_week_of timestamptz default now()
)
returns table (rang bigint, user_id uuid, pseudo text, pp_id text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      case when p_scope = 'week' then public.paris_week_start(p_week_of) end as start_at,
      case when p_scope = 'week' then public.paris_week_start(p_week_of) + interval '7 days' end as end_at
  ),
  totals as (
    select l.user_id, sum(l.points)::bigint as points
    from public.activity_log l, bounds b
    where b.start_at is null
       or (l.created_at >= b.start_at and l.created_at < b.end_at)
    group by l.user_id
  )
  select
    rank() over (order by coalesce(t.points, 0) desc) as rang,
    p.id as user_id,
    p.pseudo,
    p.pp_id,
    coalesce(t.points, 0) as points
  from public.profiles p
  left join totals t on t.user_id = p.id
  where (select auth.uid()) is not null
    and p_scope in ('week', 'total')
  order by rang, p.pseudo;
$$;

revoke all on function public.leaderboard(text, timestamptz) from public, anon;
grant execute on function public.leaderboard(text, timestamptz) to authenticated;

-- Progression par chapitre de l'étudiant connecté : part des QCM publiés du
-- chapitre réussis au moins une fois. security_invoker : le RLS de activity_log
-- limite naturellement aux lignes de l'utilisateur courant.
create or replace view public.chapter_progress
with (security_invoker = true)
as
select
  c.id as chapter_id,
  c.subject_id,
  count(distinct q.id) as total_questions,
  count(distinct l.item_id) as questions_reussies,
  case when count(distinct q.id) = 0 then 0
       else round(count(distinct l.item_id)::numeric / count(distinct q.id), 3)
  end as progression
from public.chapters c
left join public.questions q
  on q.chapter_id = c.id and q.statut = 'publie'
left join public.activity_log l
  on l.type = 'qcm'
 and l.item_id = q.id
 and l.resultat = 'correct'
 and l.user_id = (select auth.uid())
group by c.id, c.subject_id;

grant select on public.chapter_progress to authenticated;
