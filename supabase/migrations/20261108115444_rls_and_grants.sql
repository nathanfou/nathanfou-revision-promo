-- Droits d'accès (spec, section "Sécurité et garde-fous").
--
-- Principes :
--  * RLS activé sur toutes les tables de public.
--  * Les grants sont explicites, table par table, et ne dépendent pas du réglage
--    "Automatically expose new tables" du projet.
--  * anon n'a accès à rien : toute l'appli est derrière la connexion.
--  * Le navigateur ne peut écrire NI points, NI sessions, NI card_states :
--    ces écritures passeront par des fonctions serveur (étapes 4 et 5 du plan).
--  * Le contenu (matières, chapitres, QCM, cartes, exercices, contrôles) s'écrit
--    uniquement avec la clé secrète (script d'import) ou le tableau de bord.

-- ---------------------------------------------------------------------------
-- Remise à plat des grants
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Les futures tables ne sont pas exposées par défaut : chaque migration donne ses grants.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS partout
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.chapters         enable row level security;
alter table public.questions        enable row level security;
alter table public.question_answers enable row level security;
alter table public.flashcards       enable row level security;
alter table public.exercises        enable row level security;
alter table public.exams            enable row level security;
alter table public.card_states      enable row level security;
alter table public.exercise_todo    enable row level security;
alter table public.sessions         enable row level security;
alter table public.activity_log     enable row level security;
alter table public.feed_items       enable row level security;
alter table public.reactions        enable row level security;
alter table private.app_config      enable row level security;

-- ---------------------------------------------------------------------------
-- Profils : profil public lisible par tous, chacun change sa photo
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (pp_id) on public.profiles to authenticated;   -- ni pseudo, ni is_admin

create policy "profils lisibles par les connectés"
  on public.profiles for select to authenticated
  using (true);

create policy "chacun modifie son profil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Contenu : lecture seule, contenu publié uniquement (l'admin voit aussi les brouillons)
-- ---------------------------------------------------------------------------
grant select on public.subjects, public.chapters, public.exams to authenticated;
grant select on public.questions, public.flashcards, public.exercises to authenticated;

create policy "matières lisibles" on public.subjects for select to authenticated using (true);
create policy "chapitres lisibles" on public.chapters for select to authenticated using (true);
create policy "contrôles lisibles" on public.exams for select to authenticated using (true);

create policy "QCM publiés lisibles" on public.questions for select to authenticated
  using (statut = 'publie' or (select private.is_admin()));
create policy "cartes publiées lisibles" on public.flashcards for select to authenticated
  using (statut = 'publie' or (select private.is_admin()));
create policy "exercices publiés lisibles" on public.exercises for select to authenticated
  using (statut = 'publie' or (select private.is_admin()));

-- question_answers : aucun grant, aucune policy pour anon/authenticated.
-- Seules les fonctions serveur (security definer) et la clé secrète la lisent.

-- ---------------------------------------------------------------------------
-- Données personnelles : chacun lit les siennes, personne n'écrit depuis le navigateur
-- ---------------------------------------------------------------------------
grant select on public.card_states, public.exercise_todo, public.sessions, public.activity_log
  to authenticated;

create policy "mes cartes" on public.card_states for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "mes exercices à refaire" on public.exercise_todo for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "mes sessions" on public.sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "mon journal" on public.activity_log for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Feed (v2) : lecture par tous, posts/réponses/réactions à son nom, pas d'événement
-- fabriqué par le navigateur, suppression par l'auteur ou l'admin
-- ---------------------------------------------------------------------------
grant select, delete on public.feed_items to authenticated;
grant insert (user_id, kind, parent_id, texte) on public.feed_items to authenticated;
grant select, insert, delete on public.reactions to authenticated;

create policy "feed lisible" on public.feed_items for select to authenticated using (true);

create policy "poster à son nom" on public.feed_items for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and kind in ('post', 'reponse')
    and event_data is null
  );

create policy "supprimer ses posts ou admin" on public.feed_items for delete to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy "réactions lisibles" on public.reactions for select to authenticated using (true);
create policy "réagir à son nom" on public.reactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "retirer sa réaction" on public.reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Temps réel (feed et réactions, utile en v2)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.feed_items, public.reactions;
