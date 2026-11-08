-- Feed (lecture), notifications in-app et mouvements du classement.
--
--   * public.notifications : réponses et réactions à mes posts / événements, avec
--     un état "lu" (read_at). Écrites uniquement par des triggers ; le navigateur
--     les lit (RLS : les siennes) et les marque lues via mark_notifications_read().
--   * public.feed_page(avant, limite) : le fil (posts + événements) avec auteurs,
--     compteurs de réactions et réponses à plat, en un seul appel.
--   * public.my_notifications(limite) : mes notifications avec l'auteur et le post.
--   * public.leaderboard_moves(scope) : rang de chacun il y a 24 h, pour les flèches
--     de progression du classement.

-- ---------------------------------------------------------------------------
-- Table des notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- destinataire
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- auteur de la réponse ou de la réaction
  actor_id uuid references public.profiles (id) on delete cascade,
  -- 'reponse' | 'reaction' (duels et défis viendront avec la gamification)
  kind text not null check (kind in ('reponse', 'reaction')),
  -- reponse : la réponse elle-même ; reaction : l'élément qui a reçu la réaction
  feed_item_id uuid references public.feed_items (id) on delete cascade,
  emoji text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_id_idx on public.notifications (actor_id);
create index notifications_feed_item_id_idx on public.notifications (feed_item_id);

alter table public.notifications enable row level security;

grant select on public.notifications to authenticated;

create policy "mes notifications" on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Triggers : réponse -> notifie l'auteur du post ; réaction -> notifie l'auteur
-- de l'élément ; réaction retirée -> la notification disparaît.
-- ---------------------------------------------------------------------------
create or replace function private.notify_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  select f.user_id into v_author from public.feed_items f where f.id = new.parent_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, kind, feed_item_id)
    values (v_author, new.user_id, 'reponse', new.id);
  end if;
  return null;
end;
$$;

revoke all on function private.notify_reply() from public, anon, authenticated;

create trigger feed_items_notify_reply
  after insert on public.feed_items
  for each row
  when (new.kind = 'reponse')
  execute function private.notify_reply();

create or replace function private.notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    select f.user_id into v_author from public.feed_items f where f.id = new.feed_item_id;
    if v_author is not null and v_author <> new.user_id then
      insert into public.notifications (user_id, actor_id, kind, feed_item_id, emoji)
      values (v_author, new.user_id, 'reaction', new.feed_item_id, new.emoji);
    end if;
  else
    delete from public.notifications n
    where n.kind = 'reaction'
      and n.actor_id = old.user_id
      and n.feed_item_id = old.feed_item_id
      and n.emoji = old.emoji;
  end if;
  return null;
end;
$$;

revoke all on function private.notify_reaction() from public, anon, authenticated;

create trigger reactions_notify
  after insert or delete on public.reactions
  for each row
  execute function private.notify_reaction();

-- ---------------------------------------------------------------------------
-- Marquer comme lu (toutes si p_ids est null). Renvoie le nombre de lignes.
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n integer;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  update public.notifications n
  set read_at = now()
  where n.user_id = v_uid
    and n.read_at is null
    and (p_ids is null or n.id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Mes notifications, avec l'auteur et le post concerné (security invoker : RLS).
-- post_id : l'élément de premier niveau (pour faire un lien vers le fil).
-- ---------------------------------------------------------------------------
create or replace function public.my_notifications(p_limit integer default 30)
returns table (
  id uuid,
  kind text,
  created_at timestamptz,
  read_at timestamptz,
  emoji text,
  actor_pseudo text,
  actor_pp_id text,
  item_id uuid,
  item_texte text,
  post_id uuid,
  post_kind public.feed_kind,
  post_texte text
)
language sql
stable
set search_path = ''
as $$
  select
    n.id, n.kind, n.created_at, n.read_at, n.emoji,
    a.pseudo, a.pp_id,
    i.id, i.texte,
    coalesce(p.id, i.id), coalesce(p.kind, i.kind), coalesce(p.texte, i.texte)
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.feed_items i on i.id = n.feed_item_id
  left join public.feed_items p on p.id = i.parent_id
  where n.user_id = (select auth.uid())
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

revoke all on function public.my_notifications(integer) from public, anon;
grant execute on function public.my_notifications(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Le fil : posts et événements (le plus récent en haut), avec leurs réponses à
-- plat et les compteurs de réactions (mine = l'utilisateur courant a réagi).
-- Pagination : p_before = created_at du dernier élément affiché.
-- ---------------------------------------------------------------------------
create or replace function public.feed_page(
  p_before timestamptz default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  kind public.feed_kind,
  user_id uuid,
  pseudo text,
  pp_id text,
  texte text,
  event_data jsonb,
  created_at timestamptz,
  reactions jsonb,
  replies jsonb
)
language sql
stable
set search_path = ''
as $$
  select
    f.id, f.kind, f.user_id, p.pseudo, p.pp_id, f.texte, f.event_data, f.created_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('emoji', r.emoji, 'n', r.n, 'mine', r.mine) order by r.emoji)
      from (
        select x.emoji, count(*)::integer as n, bool_or(x.user_id = (select auth.uid())) as mine
        from public.reactions x
        where x.feed_item_id = f.id
        group by x.emoji
      ) r
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'user_id', c.user_id, 'pseudo', cp.pseudo, 'pp_id', cp.pp_id,
        'texte', c.texte, 'created_at', c.created_at
      ) order by c.created_at)
      from public.feed_items c
      join public.profiles cp on cp.id = c.user_id
      where c.parent_id = f.id
    ), '[]'::jsonb)
  from public.feed_items f
  join public.profiles p on p.id = f.user_id
  where f.parent_id is null
    and (p_before is null or f.created_at < p_before)
    and (select auth.uid()) is not null
  order by f.created_at desc, f.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 200);
$$;

revoke all on function public.feed_page(timestamptz, integer) from public, anon;
grant execute on function public.feed_page(timestamptz, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Rang de chacun il y a 24 h (même règle que leaderboard()), pour afficher
-- "monte de 2" / "descend de 1". Semaine : vide tant que la semaine a moins de 24 h.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_moves(p_scope text default 'week')
returns table (user_id uuid, rang_veille bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      case when p_scope = 'week' then public.paris_week_start(now()) end as start_at,
      now() - interval '24 hours' as end_at
  ),
  totals as (
    select l.user_id, sum(l.points)::bigint as points
    from public.activity_log l, bounds b
    where l.created_at < b.end_at
      and (b.start_at is null or l.created_at >= b.start_at)
    group by l.user_id
  )
  select p.id, rank() over (order by coalesce(t.points, 0) desc)
  from public.profiles p
  left join totals t on t.user_id = p.id
  cross join bounds b
  where (select auth.uid()) is not null
    and p_scope in ('week', 'total')
    and p.created_at < b.end_at
    and (b.start_at is null or b.end_at > b.start_at);
$$;

revoke all on function public.leaderboard_moves(text) from public, anon;
grant execute on function public.leaderboard_moves(text) to authenticated;
