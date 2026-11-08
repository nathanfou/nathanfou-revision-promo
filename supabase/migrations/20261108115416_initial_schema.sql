-- Schéma initial de la plateforme de révision (spec v1, section "Modèle de données").
-- Les droits (RLS, grants) sont dans la migration rls_and_grants.

-- Schéma privé : jamais exposé par l'API Data. Contient la config et les helpers.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.content_status as enum ('brouillon', 'publie');
create type public.activity_mode as enum ('qcm', 'flashcard', 'exo');
create type public.session_variant as enum ('entrainement', 'examen');
create type public.feed_kind as enum ('post', 'event', 'reponse');

-- Résultat d'une activité :
--   qcm       : correct | incorrect
--   flashcard : a_revoir | bien | facile
--   exo       : reussi | partiel | a_refaire
create type public.activity_result as enum (
  'correct', 'incorrect',
  'a_revoir', 'bien', 'facile',
  'reussi', 'partiel', 'a_refaire'
);

-- ---------------------------------------------------------------------------
-- Config privée (code d'inscription, etc.)
-- ---------------------------------------------------------------------------
create table private.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- minuscules, chiffres, . _ -  (3 à 20 caractères) : sert aussi à fabriquer l'e-mail factice
  pseudo text not null unique check (pseudo ~ '^[a-z0-9._-]{3,20}$'),
  pp_id text not null default 'pp_01' check (pp_id ~ '^pp_(0[1-9]|[1-4][0-9]|50)$'),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contenu
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ordre integer not null default 0
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  nom text not null,
  ordre integer not null default 0,
  unique (subject_id, nom)
);
create index chapters_subject_id_idx on public.chapters (subject_id);

-- QCM : la bonne réponse et l'explication sont dans question_answers,
-- une table que le navigateur ne peut pas lire (voir rls_and_grants).
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  enonce text not null,
  -- tableau JSON de chaînes, dans l'ordre A, B, C, D...
  choix jsonb not null check (jsonb_typeof(choix) = 'array' and jsonb_array_length(choix) between 2 and 8),
  statut public.content_status not null default 'brouillon',
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
create index questions_chapter_id_idx on public.questions (chapter_id);

create table public.question_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  -- lettres des bonnes réponses ('A', 'B'...). Un tableau pour garder ouverte
  -- la question "une ou plusieurs bonnes réponses" (point ouvert de la spec).
  bonnes_reponses text[] not null check (cardinality(bonnes_reponses) >= 1),
  explication text
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  recto text not null,
  verso text not null,
  statut public.content_status not null default 'brouillon',
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
create index flashcards_chapter_id_idx on public.flashcards (chapter_id);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  titre text not null,
  enonce text not null,
  correction text not null,
  duree_min smallint not null check (duree_min in (5, 10, 20, 30)),
  statut public.content_status not null default 'brouillon',
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
create index exercises_chapter_id_idx on public.exercises (chapter_id);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  nom text not null,
  date timestamptz not null
);
create index exams_subject_id_idx on public.exams (subject_id);

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
-- Révision espacée : paliers 1, 3, 7, 14 jours. Écrit uniquement par les fonctions serveur.
create table public.card_states (
  user_id uuid not null references public.profiles (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  palier smallint not null check (palier in (1, 3, 7, 14)),
  due_date date not null,
  last_reviewed timestamptz not null default now(),
  primary key (user_id, flashcard_id)
);
create index card_states_flashcard_id_idx on public.card_states (flashcard_id);
create index card_states_due_idx on public.card_states (user_id, due_date);

-- Liste libre des exercices "à refaire" (sans date). Écrite par les fonctions serveur.
create table public.exercise_todo (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index exercise_todo_exercise_id_idx on public.exercise_todo (exercise_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  mode public.activity_mode not null,
  variante public.session_variant,          -- QCM uniquement
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score integer not null default 0,
  points integer not null default 0
);
create index sessions_user_id_idx on public.sessions (user_id, started_at desc);
create index sessions_chapter_id_idx on public.sessions (chapter_id);

-- Source unique des points : les classements et la progression en sont dérivés.
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  type public.activity_mode not null,
  item_id uuid not null,                     -- question, flashcard ou exercice selon type
  resultat public.activity_result not null,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  -- jour calendaire à Paris, pour la règle "une question ne rapporte qu'une fois par jour"
  jour date not null default ((now() at time zone 'Europe/Paris')::date)
);
create index activity_log_user_created_idx on public.activity_log (user_id, created_at desc);
create index activity_log_created_idx on public.activity_log (created_at);
create index activity_log_session_id_idx on public.activity_log (session_id);
create index activity_log_item_idx on public.activity_log (type, item_id);
-- Garde-fou en base : un même élément ne rapporte des points qu'une fois par jour.
create unique index activity_log_points_once_per_day
  on public.activity_log (user_id, type, item_id, jour)
  where points > 0;

-- ---------------------------------------------------------------------------
-- Feed (v2, tables créées dès maintenant)
-- ---------------------------------------------------------------------------
create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.feed_kind not null,
  parent_id uuid references public.feed_items (id) on delete cascade,
  texte text not null,
  -- données d'un événement automatique (type, badge, rang...), null pour un post
  event_data jsonb,
  created_at timestamptz not null default now(),
  constraint feed_items_parent_check check ((kind = 'reponse') = (parent_id is not null)),
  constraint feed_items_length_check check (
    (kind = 'post' and char_length(texte) between 1 and 280)
    or (kind = 'reponse' and char_length(texte) between 1 and 140)
    or kind = 'event'
  )
);
create index feed_items_created_idx on public.feed_items (created_at desc);
create index feed_items_parent_id_idx on public.feed_items (parent_id);
create index feed_items_user_id_idx on public.feed_items (user_id);

create table public.reactions (
  feed_item_id uuid not null references public.feed_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- jeu d'emojis fixe (à valider, point ouvert de la spec)
  emoji text not null check (emoji in ('🔥', '👏', '💪', '😂')),
  created_at timestamptz not null default now(),
  primary key (feed_item_id, user_id, emoji)
);
create index reactions_user_id_idx on public.reactions (user_id);
