# Révision promo : notes pour Claude

Plateforme web de révision pour une promo de 30 à 60 étudiants : QCM, flashcards
(révision espacée), exercices auto-évalués, points, classement hebdo et cumulé,
feed (v2). La spec complète est dans `docs/specification-v1.txt` : la lire avant
toute fonctionnalité. Réponds à Nathan en français.

## Stack

- Front : React 19 + Vite + TypeScript, `react-router`, `@supabase/supabase-js`.
  Site statique sur Vercel (`vercel.json` gère le fallback SPA).
- Back : Supabase (Auth, Postgres, RLS, temps réel). Pas de serveur à nous.
  La logique sensible (correction des QCM, points, révision espacée) vit en base,
  dans des fonctions Postgres appelées en RPC.
- Pas de Storage : les 50 photos de profil sont des fichiers statiques
  `public/avatars/pp_01.webp` à `pp_50.webp` (provisoires pour l'instant ; on les
  remplacera en gardant les mêmes noms).
- Design : maquettes "Bachotage" dans `docs/maquettes/` (14 écrans `.dc.html`, à lire comme
  référence : styles en ligne + classe `Component` en bas de chaque fichier). Le thème est
  **clair pêche/automne** de la maquette ; il remplace le thème sombre de la spec v1.
  Tokens (couleurs, ombres, polices) et classes d'animation dans `src/index.css`.

## Supabase

- Projet : `zmatzgmsnndmjpvrqmud` (organisation `revision-promo`, région eu-west-2, offre gratuite,
  mis en pause après ~1 semaine d'inactivité).
- Migrations dans `supabase/migrations/` (workflow impératif). Créer un nouveau
  fichier avec `npx supabase migration new <nom>`, ne jamais modifier une
  migration déjà appliquée.
- Tester en local : `npm run db:start` (Docker), puis `npm run db:reset`.
- Le MCP Supabase est déclaré dans `.mcp.json`, limité à ce projet.
- Après tout changement de schéma : advisors (MCP `get_advisors` security +
  performance), puis `npm run db:types` pour régénérer `src/lib/database.types.ts`.

### Règles de sécurité déjà en place (ne pas casser)

- RLS activé partout ; grants explicites table par table (les nouvelles tables
  ne sont PAS exposées automatiquement : chaque migration doit faire ses `grant`).
- `anon` n'a accès à rien.
- `question_answers` (bonnes réponses + explication) n'est lisible que par les
  fonctions serveur `security definer` et la clé secrète. Ne jamais la joindre
  dans une requête front ni l'exposer avant que l'étudiant ait répondu.
- Le navigateur ne peut écrire ni `activity_log`, ni `sessions`, ni
  `card_states`, ni `exercise_todo` : ces écritures passent par des RPC.
- `profiles` : seul `pp_id` est modifiable par l'utilisateur (grant de colonne).
- Index unique partiel `activity_log_points_once_per_day` : un même élément ne
  rapporte des points qu'une fois par jour (jour de Paris). Les RPC doivent
  écrire `points = 0` pour une répétition le même jour au lieu d'échouer.
- Fonctions `security definer` : `set search_path = ''`, vérifier `auth.uid()`,
  `revoke ... from public, anon` puis `grant execute ... to authenticated`.

### Auth (pseudo + mot de passe)

- Le front appelle `supabase.auth.signUp({ email: pseudoToEmail(pseudo), password,
  options: { data: { pseudo, signup_code, pp_id } } })` (`src/lib/supabase.ts`).
- Le trigger `private.handle_new_user` vérifie le code d'inscription
  (`private.app_config.signup_code`), crée le profil (le code reste dans les
  user_metadata de l'utilisateur, sans conséquence). Code faux = l'inscription échoue avec "Database error saving new
  user" : afficher "Code d'inscription invalide".
- Pseudo : `^[a-z0-9._-]{3,20}$` (minuscules), unique.
- Confirmation d'e-mail désactivée (adresses factices `@promo.invalid`).
- Admin : `update public.profiles set is_admin = true where pseudo = '...'`
  depuis le SQL Editor.

## Front : conventions du socle

- Routes : `src/App.tsx` (toutes déclarées) ; liens via `routes` de `src/lib/routes.ts`.
  Sous 768 px (`useIsMobile`), seules les flashcards sont accessibles (`/` et `/flashcards`
  basculent sur `MobileCartes` / `MobileCarte`, les autres pages affichent "Disponible sur ordinateur").
- Gabarits (`src/layouts/`) : `AppLayout` (barre de navigation, pages Révision/Feed/Profil),
  `SessionLayout` (Quitter + titre + pastille de points : QCM, flashcards, exercices),
  `AuthLayout`, `MobileLayout`.
- Composants (`src/components/`) : `ui.tsx` (Button, ButtonLink, Card, CardIcon, Chip,
  PointsPill, Segmented, PageTitle, EmptyState), `Meter.tsx` (PixelMeter, MiniMeter, RowMarker),
  `Lcd.tsx` (écran LCD, chiffres Doto), `Leaves.tsx` (feuilles pixel), `Avatar.tsx`,
  `PhotoPicker.tsx`, `Form.tsx` (Field, ErrorBanner), `Icons.tsx`, `Loader.tsx`.
- Styles en ligne + variables CSS (`var(--accent)`, `var(--card)`…), pas de couleur en dur
  hors palette. Respecter `prefers-reduced-motion` (classes `.rise`, `.popin`… déjà conditionnées).
- Auth : `useAuth()` / `useMe()` (`src/auth/AuthProvider.tsx`). Points de l'utilisateur :
  `useMyPoints()` et `refreshMyPoints()` après toute RPC qui rapporte des points (`src/lib/points.ts`).
- Utilitaires : `src/lib/format.ts` (dates Paris, J-xx, nombres), `levels.ts` (niveaux),
  `scoring.ts` (barème affiché), `useCountUp.ts`.
- Sessions côté base (migration `sessions_core`) : `start_session(chapitre, mode, variante)`,
  `end_session(session)`, et `private.log_activity(...)` que chaque RPC de réponse appelle pour
  écrire `activity_log` (règle "une fois par jour" incluse, met à jour score/points de la session).
- Migrations appliquées via le MCP Supabase : après `apply_migration`, renommer le fichier local
  avec la version renvoyée par `list_migrations` pour que l'historique reste aligné.
- Découpage en chantiers parallèles : `docs/chantiers.md`.

## Plan de construction (spec, section "Plan de construction")

1. ✅ Projet Supabase, schéma, droits (ce socle).
2. Connexion pseudo/mot de passe, barre de navigation, page Profil (photos provisoires).
3. Script d'import CSV (`content/templates/*.csv`, clé secrète dans `.env`) + page Révision.
4. QCM corrigés côté serveur : RPC `start_session`, `submit_qcm_answer`
   (lit `question_answers`, écrit `activity_log`, renvoie correction), `end_session`.
5. Flashcards (RPC `review_flashcard`, paliers 1/3/7/14 j dans `card_states`),
   vue téléphone limitée aux flashcards, exercices (RPC `submit_exercise`).
6. Classements (RPC `leaderboard('week'|'total')` déjà en place) et progression
   (vue `chapter_progress` déjà en place) ; mise en ligne.
7. Feed (tables `feed_items`, `reactions` déjà créées, temps réel activé).
8. Images finales. 9. Gamification (nouvelles tables à concevoir). 10. Ajustements.

Barème : 10 points par minute estimée (QCM juste = 10, carte = 3, exercice
5/10/20/30 min = 50/100/200/300, partiel 50 %, à refaire 25 %).

## Commandes

```bash
npm install
cp .env.example .env.local   # puis remplir
npm run dev
npm run build && npm run lint
```
