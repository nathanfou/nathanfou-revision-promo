-- Feed : événements automatiques créés côté serveur (spec, section "Feed social" :
-- "créés par le serveur ... L'étudiant ne peut pas en fabriquer").
--
--   * Série terminée : quand une session se termine (ended_at passe de null à une
--     date) avec des points, un événement "a terminé une série de 20 QCM" est publié.
--   * Classement : quand un gain de points fait entrer l'étudiant dans le top 5 de la
--     semaine, ou le fait passer premier, un événement est publié (une fois par
--     semaine et par type). Seuil : 100 points dans la semaine, pour éviter que les
--     cinq premiers à réviser le lundi matin soient annoncés avec 3 points.
--
-- Les fonctions sont security definer (propriétaire postgres, qui contourne le RLS
-- de feed_items, dont la policy d'insertion refuse kind = 'event' au navigateur).

-- ---------------------------------------------------------------------------
-- Série terminée
-- ---------------------------------------------------------------------------
create or replace function private.feed_session_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items integer;
  v_ok integer;
  v_chapitre text;
  v_matiere text;
  v_texte text;
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

  v_texte := case new.mode
    when 'qcm' then
      case when new.variante = 'examen'
        then 'a terminé un QCM en mode examen (' || v_items || ' questions)'
        else 'a terminé une série de ' || v_items || ' QCM'
      end
    when 'flashcard' then
      'a révisé ' || v_items || case when v_items > 1 then ' flashcards' else ' flashcard' end
    else
      'a fait ' || v_items || case when v_items > 1 then ' exercices' else ' exercice' end
  end;

  insert into public.feed_items (user_id, kind, texte, event_data)
  values (
    new.user_id,
    'event',
    v_texte,
    jsonb_build_object(
      'type', 'session',
      'mode', new.mode,
      'variante', new.variante,
      'session_id', new.id,
      'chapter_id', new.chapter_id,
      'chapitre', v_chapitre,
      'matiere', v_matiere,
      'items', v_items,
      'reussis', v_ok,
      'points', new.points
    )
  );
  return null;
end;
$$;

revoke all on function private.feed_session_event() from public, anon, authenticated;

create trigger sessions_feed_event
  after update of ended_at on public.sessions
  for each row
  when (old.ended_at is null and new.ended_at is not null and new.points > 0)
  execute function private.feed_session_event();

-- ---------------------------------------------------------------------------
-- Entrée dans le top 5 / première place de la semaine
-- ---------------------------------------------------------------------------
create or replace function private.feed_rank_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := public.paris_week_start(now());
  v_mine bigint;
  v_rank integer;
  v_type text;
begin
  select coalesce(sum(l.points), 0) into v_mine
  from public.activity_log l
  where l.user_id = new.user_id and l.created_at >= v_start;

  if v_mine < 100 then
    return null;
  end if;

  select 1 + count(*)::integer into v_rank
  from (
    select l.user_id, sum(l.points) as total
    from public.activity_log l
    where l.created_at >= v_start
    group by l.user_id
  ) t
  where t.total > v_mine;

  if v_rank = 1 and not exists (
    select 1 from public.feed_items f
    where f.user_id = new.user_id and f.kind = 'event' and f.created_at >= v_start
      and f.event_data ->> 'type' = 'premier'
  ) then
    v_type := 'premier';
  elsif v_rank <= 5 and not exists (
    select 1 from public.feed_items f
    where f.user_id = new.user_id and f.kind = 'event' and f.created_at >= v_start
      and f.event_data ->> 'type' in ('top5', 'premier')
  ) then
    v_type := 'top5';
  else
    return null;
  end if;

  insert into public.feed_items (user_id, kind, texte, event_data)
  values (
    new.user_id,
    'event',
    case v_type
      when 'premier' then 'prend la première place de la semaine'
      else 'entre dans le top 5 de la semaine'
    end,
    jsonb_build_object('type', v_type, 'rang', v_rank, 'points', v_mine, 'semaine', v_start)
  );
  return null;
end;
$$;

revoke all on function private.feed_rank_event() from public, anon, authenticated;

create trigger activity_log_feed_rank_event
  after insert on public.activity_log
  for each row
  when (new.points > 0)
  execute function private.feed_rank_event();
