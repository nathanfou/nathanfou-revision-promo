-- Flashcards : une carte entre 0 et 15 points revient le lendemain (au lieu de 0 à 9).
-- Une carte neuve notée Bien (15 points) revient donc demain. Seuils suivants inchangés.
create or replace function private.flashcard_interval(p_score integer)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_score <= 15 then 1
    when p_score < 30 then 3
    when p_score < 50 then 5
    when p_score < 70 then 9
    when p_score < 90 then 15
    else 30
  end::smallint
$$;

-- Cartes déjà programmées avec un score de 10 à 15 : retour ramené au lendemain du dernier passage.
update public.card_states
set palier = 1,
    due_date = least(due_date, coalesce(dernier_jour, (last_reviewed at time zone 'Europe/Paris')::date) + 1)
where score <= 15 and palier <> 1;
