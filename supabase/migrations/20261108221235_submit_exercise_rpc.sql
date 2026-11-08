-- Chantier D : exercices auto-évalués.
--
-- public.submit_exercise(session, exercice, résultat)
--   * résultat : reussi (100 %), partiel (50 %), a_refaire (25 %) de duree_min × 10 points
--   * reussi retire l'exercice de exercise_todo ; partiel et a_refaire l'y ajoutent
--   * passe par private.log_activity (règle "une fois par jour" : 0 point sur une répétition)
--   * "Changer d'avis" : une nouvelle déclaration pour le même exercice dans la même
--     session remplace la précédente (sa ligne d'activity_log est retirée avant d'écrire
--     la nouvelle), ce qui évite de bloquer les points sur un premier clic trop rapide.
-- Renvoie { resultat, points, a_refaire, session_points }.

create or replace function public.submit_exercise(
  p_session_id uuid,
  p_exercise_id uuid,
  p_resultat public.activity_result
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_duree smallint;
  v_chapter uuid;
  v_base integer;
  v_points integer;
  v_old_points integer := 0;
  v_old_ok integer := 0;
  v_session public.sessions;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if p_resultat is null or p_resultat not in ('reussi', 'partiel', 'a_refaire') then
    raise exception 'Résultat invalide' using errcode = '22023';
  end if;

  select e.duree_min, e.chapter_id into v_duree, v_chapter
  from public.exercises e
  where e.id = p_exercise_id
    and (e.statut = 'publie' or (select private.is_admin()));
  if v_duree is null then
    raise exception 'Exercice inconnu' using errcode = '22023';
  end if;

  select * into v_session from public.sessions s
  where s.id = p_session_id and s.user_id = v_uid and s.ended_at is null
  for update;
  if v_session.id is null then
    raise exception 'Session inconnue ou terminée' using errcode = '22023';
  end if;
  if v_session.mode <> 'exo' or v_session.chapter_id is distinct from v_chapter then
    raise exception 'Session d''un autre mode ou chapitre' using errcode = '22023';
  end if;

  -- Déclaration précédente dans cette session : on la remplace.
  with gone as (
    delete from public.activity_log l
    where l.session_id = p_session_id and l.user_id = v_uid
      and l.type = 'exo' and l.item_id = p_exercise_id
    returning l.points, l.resultat
  )
  select coalesce(sum(g.points), 0)::integer,
         count(*) filter (where g.resultat = 'reussi')::integer
  into v_old_points, v_old_ok
  from gone g;

  if v_old_points > 0 or v_old_ok > 0 then
    update public.sessions s
    set points = greatest(s.points - v_old_points, 0),
        score = greatest(s.score - v_old_ok, 0)
    where s.id = p_session_id;
  end if;

  v_base := v_duree * 10;
  v_points := case p_resultat
    when 'reussi' then v_base
    when 'partiel' then round(v_base * 0.5)::integer
    else round(v_base * 0.25)::integer
  end;

  v_points := private.log_activity(v_uid, p_session_id, 'exo', p_exercise_id, p_resultat, v_points);

  if p_resultat = 'reussi' then
    delete from public.exercise_todo t where t.user_id = v_uid and t.exercise_id = p_exercise_id;
  else
    insert into public.exercise_todo (user_id, exercise_id)
    values (v_uid, p_exercise_id)
    on conflict (user_id, exercise_id) do nothing;
  end if;

  return jsonb_build_object(
    'resultat', p_resultat,
    'points', v_points,
    'a_refaire', p_resultat <> 'reussi',
    'session_points', (select s.points from public.sessions s where s.id = p_session_id)
  );
end;
$$;

revoke all on function public.submit_exercise(uuid, uuid, public.activity_result) from public, anon;
grant execute on function public.submit_exercise(uuid, uuid, public.activity_result) to authenticated;
