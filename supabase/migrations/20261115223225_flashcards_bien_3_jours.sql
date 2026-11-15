-- Flashcards : Bien fait revenir la carte dans 3 jours au moins, sauf si elle a été ratée
-- aujourd'hui (elle revient alors demain). Difficile n'a pas ce plancher : la carte peut
-- revenir plus vite. Le score n'est pas touché, seul l'intervalle a un plancher.
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
  if p_note = 'bien' and v_pen = 0 then
    intervalle := greatest(intervalle, 3);
  end if;
end;
$$;
