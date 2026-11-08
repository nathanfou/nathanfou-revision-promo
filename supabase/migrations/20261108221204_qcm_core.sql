-- Chantier B : QCM corrigés côté serveur.
--   * public.qcm_answers                       : réponse choisie par question et par session (bilan)
--   * public.qcm_questions(chapitre, limite, ids) : la série à jouer (sans la correction)
--   * public.submit_qcm_answer(session, question, choix) : corrige, écrit activity_log
--   * public.qcm_session_review(session)       : bilan d'une session terminée
--
-- La bonne réponse n'est jamais renvoyée avant que l'étudiant ait répondu :
--   - entraînement : submit_qcm_answer renvoie la correction de la question répondue ;
--   - examen       : submit_qcm_answer renvoie seulement { enregistre }, la correction
--                    n'est lisible qu'au bilan, une fois la session close.

-- ---------------------------------------------------------------------------
-- qcm_answers : écrite et lue uniquement par les fonctions serveur.
-- Pas de grant ni de policy pour anon/authenticated : en mode examen, la colonne
-- "correct" révélerait la correction avant la fin de la série.
-- ---------------------------------------------------------------------------
create table public.qcm_answers (
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  choix text[] not null check (cardinality(choix) >= 1),
  correct boolean not null,
  points integer not null default 0 check (points >= 0),
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
);
create index qcm_answers_question_id_idx on public.qcm_answers (question_id);
create index qcm_answers_user_id_idx on public.qcm_answers (user_id);

alter table public.qcm_answers enable row level security;
revoke all on public.qcm_answers from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- qcm_questions : questions publiées d'un chapitre, sans la correction.
-- "multiple" indique s'il y a plusieurs bonnes réponses (pour afficher des cases
-- à cocher) : c'est le nombre de bonnes réponses, pas les réponses elles-mêmes.
-- Ordre : d'abord les questions jamais réussies par l'étudiant, puis au hasard.
-- p_question_ids (facultatif) restreint la série (ex. "refaire mes erreurs").
-- ---------------------------------------------------------------------------
create or replace function public.qcm_questions(
  p_chapter_id uuid,
  p_limit integer default 20,
  p_question_ids uuid[] default null
)
returns table (id uuid, enonce text, choix jsonb, multiple boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := (select private.is_admin());
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;

  return query
  select q.id, q.enonce, q.choix, coalesce(cardinality(a.bonnes_reponses), 1) > 1 as multiple
  from public.questions q
  left join public.question_answers a on a.question_id = q.id
  where q.chapter_id = p_chapter_id
    and (q.statut = 'publie' or v_admin)
    and (p_question_ids is null or q.id = any (p_question_ids))
  order by
    exists (
      select 1 from public.activity_log l
      where l.user_id = v_uid and l.type = 'qcm' and l.item_id = q.id and l.resultat = 'correct'
    ),
    random()
  limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

revoke all on function public.qcm_questions(uuid, integer, uuid[]) from public, anon;
grant execute on function public.qcm_questions(uuid, integer, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_qcm_answer
--   p_choix : lettres choisies ('A', 'B'...). Normalisées (majuscules, sans doublon).
--   Juste si l'ensemble choisi est exactement celui des bonnes réponses.
--   10 points si juste (règle "une fois par jour" appliquée par private.log_activity).
--   Une seule réponse par question et par session.
-- ---------------------------------------------------------------------------
create or replace function public.submit_qcm_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_choix text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.sessions;
  v_question public.questions;
  v_answer public.question_answers;
  v_choix text[];
  v_good text[];
  v_nb integer;
  v_correct boolean;
  v_points integer;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;

  select * into v_session from public.sessions s
  where s.id = p_session_id and s.user_id = v_uid;
  if v_session.id is null or v_session.mode <> 'qcm' then
    raise exception 'Session inconnue' using errcode = '22023';
  end if;
  if v_session.ended_at is not null then
    raise exception 'Session terminée' using errcode = '22023';
  end if;

  select * into v_question from public.questions q where q.id = p_question_id;
  if v_question.id is null
     or v_question.chapter_id is distinct from v_session.chapter_id
     or (v_question.statut <> 'publie' and not (select private.is_admin())) then
    raise exception 'Question inconnue' using errcode = '22023';
  end if;

  select * into v_answer from public.question_answers a where a.question_id = p_question_id;
  if v_answer.question_id is null then
    raise exception 'Question sans correction' using errcode = '22023';
  end if;

  v_nb := jsonb_array_length(v_question.choix);
  select coalesce(array_agg(distinct upper(btrim(c)) order by upper(btrim(c))), '{}')
    into v_choix
  from unnest(coalesce(p_choix, '{}')) as c
  where btrim(c) <> '';
  if cardinality(v_choix) = 0 then
    raise exception 'Choisis au moins une réponse' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_choix) as c
    where c !~ '^[A-Z]$' or ascii(c) - ascii('A') >= v_nb
  ) then
    raise exception 'Réponse invalide' using errcode = '22023';
  end if;

  select array_agg(distinct upper(btrim(c)) order by upper(btrim(c))) into v_good
  from unnest(v_answer.bonnes_reponses) as c;
  v_correct := v_choix = v_good;

  begin
    insert into public.qcm_answers (session_id, question_id, user_id, choix, correct)
    values (p_session_id, p_question_id, v_uid, v_choix, v_correct);
  exception when unique_violation then
    raise exception 'Question déjà répondue dans cette série' using errcode = '23505';
  end;

  v_points := private.log_activity(
    v_uid, p_session_id, 'qcm', p_question_id,
    case when v_correct then 'correct' else 'incorrect' end::public.activity_result,
    case when v_correct then 10 else 0 end
  );

  update public.qcm_answers qa set points = v_points
  where qa.session_id = p_session_id and qa.question_id = p_question_id;

  if v_session.variante = 'examen' then
    return jsonb_build_object('enregistre', true);
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'bonnes_reponses', to_jsonb(v_good),
    'explication', v_answer.explication,
    'points', v_points
  );
end;
$$;

revoke all on function public.submit_qcm_answer(uuid, uuid, text[]) from public, anon;
grant execute on function public.submit_qcm_answer(uuid, uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- qcm_session_review : bilan d'une session QCM terminée de l'utilisateur.
-- Renvoie la session (chapitre, matière, durée, score, points), la progression du
-- chapitre avant / après la session, et chaque réponse avec sa correction.
-- ---------------------------------------------------------------------------
create or replace function public.qcm_session_review(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.sessions;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;

  select * into v_session from public.sessions s
  where s.id = p_session_id and s.user_id = v_uid and s.mode = 'qcm';
  if v_session.id is null then
    raise exception 'Session inconnue' using errcode = '22023';
  end if;
  if v_session.ended_at is null then
    raise exception 'Session pas encore terminée' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'chapter_id', v_session.chapter_id,
      'chapitre', c.nom,
      'matiere', sj.nom,
      'variante', v_session.variante,
      'started_at', v_session.started_at,
      'ended_at', v_session.ended_at,
      'score', v_session.score,
      'points', v_session.points,
      'semaine_courante', v_session.started_at >= public.paris_week_start(now())
    ),
    'progression', jsonb_build_object(
      'total', (select count(*) from public.questions q where q.chapter_id = v_session.chapter_id and q.statut = 'publie'),
      'avant', (
        select count(distinct l.item_id) from public.activity_log l
        join public.questions q on q.id = l.item_id and q.chapter_id = v_session.chapter_id and q.statut = 'publie'
        where l.user_id = v_uid and l.type = 'qcm' and l.resultat = 'correct'
          and l.created_at < v_session.started_at
      ),
      'apres', (
        select count(distinct l.item_id) from public.activity_log l
        join public.questions q on q.id = l.item_id and q.chapter_id = v_session.chapter_id and q.statut = 'publie'
        where l.user_id = v_uid and l.type = 'qcm' and l.resultat = 'correct'
          and l.created_at <= v_session.ended_at
      )
    ),
    'reponses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'no', r.no,
        'question_id', r.question_id,
        'enonce', r.enonce,
        'choix', r.qchoix,
        'choix_eleve', to_jsonb(r.choix),
        'bonnes_reponses', to_jsonb(r.bonnes_reponses),
        'explication', r.explication,
        'correct', r.correct,
        'points', r.points
      ) order by r.no)
      from (
        select row_number() over (order by qa.answered_at, qa.question_id) as no,
               qa.question_id, q.enonce, q.choix as qchoix, qa.choix,
               a.bonnes_reponses, a.explication, qa.correct, qa.points
        from public.qcm_answers qa
        join public.questions q on q.id = qa.question_id
        left join public.question_answers a on a.question_id = qa.question_id
        where qa.session_id = v_session.id
      ) r
    ), '[]'::jsonb)
  )
  into v_result
  from public.chapters c
  join public.subjects sj on sj.id = c.subject_id
  where c.id = v_session.chapter_id;

  return v_result;
end;
$$;

revoke all on function public.qcm_session_review(uuid) from public, anon;
grant execute on function public.qcm_session_review(uuid) to authenticated;
