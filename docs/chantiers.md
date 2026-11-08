# Chantiers parallèles

Le socle (design system, gabarits, routes, auth, pages Connexion / Inscription / Photo,
RPC communes des sessions) est sur `main`. Chaque chantier ci-dessous part de `main`,
travaille sur sa propre branche et ouvre sa propre PR. Lire d'abord `CLAUDE.md`
(conventions du socle) et la maquette indiquée dans `docs/maquettes/`.

## Règles communes

- **Fichiers** : chaque chantier ne modifie que les fichiers qu'il possède (listés plus bas)
  et en crée de nouveaux dans `src/features/<chantier>/`. Ne pas modifier `src/App.tsx`,
  `src/components/*`, `src/layouts/*` ni `src/index.css` : si un composant partagé manque,
  le créer dans son dossier `src/features/<chantier>/`. Exception : corriger un vrai bug du socle,
  en le signalant dans la PR.
- **Migrations** : une ou plusieurs par chantier (`npx supabase migration new <nom>`), jamais
  de modification d'une migration existante. Respecter les règles de sécurité de `CLAUDE.md`
  (security definer + `search_path = ''` + vérif `auth.uid()` + revoke/grant, grants table par
  table pour toute nouvelle table). Appliquer sur le projet `zmatzgmsnndmjpvrqmud` avec le MCP
  Supabase (`apply_migration`), tester avec `execute_sql` dans un bloc `do $$ … raise exception $$`
  pour que tout soit annulé, puis renommer le fichier local avec la version de
  `list_migrations`. Lancer les advisors.
- **Types** : régénérer `src/lib/database.types.ts` (MCP `generate_typescript_types`) après la
  migration. En cas de conflit sur ce fichier au moment de fusionner, le régénérer à nouveau.
- **Points** : jamais calculés côté navigateur. Chaque RPC de réponse appelle
  `private.log_activity(user, session, type, item, resultat, points)` qui renvoie les points
  réellement attribués. Côté front, `refreshMyPoints()` après chaque RPC qui rapporte.
- **Sessions** : `start_session(p_chapter_id, p_mode, p_variante)` au lancement,
  `end_session(p_session_id)` à la fin ou en quittant (bouton Quitter de `SessionLayout` :
  prop `onQuit`). Pour la file du jour des flashcards, `p_chapter_id` est `null`.
- **Textes** en français, ton de la maquette. Pas de données fictives en dur : tout vient de
  la base, avec des états vides propres quand il n'y a pas encore de contenu.
- **Vérifier** : `npm run build && npm run lint`, puis captures Playwright de l'écran (le réseau
  du conteneur ne joint pas supabase.co : intercepter les appels Supabase avec `page.route`
  et injecter une session factice dans `localStorage`, clé `sb-zmatzgmsnndmjpvrqmud-auth-token`).
- **PR** vers `main`, titre en français ; fusionner quand la CI est verte.

## A. Révision (accueil) + import du contenu

- Maquette : `Main.dc.html`. Fichiers : `src/pages/Revision.tsx`, `src/features/revision/*`,
  `scripts/import-content.mjs` (+ script npm `content:import`).
- Import CSV (`content/templates/*.csv`) avec la clé secrète (`SUPABASE_SECRET_KEY`, `.env`),
  idempotent (upsert par matière/chapitre/texte), statut `brouillon` par défaut et option
  `--publier`, contrôles (`controles.csv`) dans `exams`. Ajouter un jeu de contenu d'exemple
  publié dans `content/exemple/` pour tester l'appli (2 matières, 3 chapitres, quelques QCM,
  cartes, exercices, un contrôle), et l'importer sur le projet.
- Page : salutation + date + prochain contrôle ; "Reprendre où tu en étais" (dernière session
  non terminée ou dernière session, lien vers le bon mode) ; carte LCD "Prochain contrôle"
  (J-xx, autres contrôles) ; "Flashcards du jour" (cartes dues aujourd'hui depuis `card_states`,
  par matière, durée et points estimés, lien `routes.flashcards()`) ; "Exercices à refaire"
  (`exercise_todo`) ; navigateur Matière → Chapitre → Mode (progression via `chapter_progress`,
  compteurs QCM / cartes à revoir / nouvelles / exercices, variante Entraînement / Examen, bouton
  qui mène à `routes.qcm(id, variante)`, `routes.flashcards(id)` ou `routes.exercises(id)`).
  Le "Défi de la semaine" (v2) est masqué tant que la gamification n'existe pas.
  Si un comptage est trop lourd côté client, une RPC `revision_overview()` est permise.

## B. QCM

- Maquettes : `Qcm.dc.html` (entraînement), `QcmResultat.dc.html` (bilan, mode examen).
  Fichiers : `src/pages/Qcm.tsx`, `src/pages/QcmBilan.tsx`, `src/features/qcm/*`.
- Migration : RPC `submit_qcm_answer(p_session_id, p_question_id, p_choix text[])` qui lit
  `question_answers`, appelle `private.log_activity` (10 pts si juste), et renvoie
  `{ correct, bonnes_reponses, explication, points }` en entraînement ; en examen, renvoie
  seulement `{ enregistre }` sans révéler la correction. RPC `qcm_session_review(p_session_id)`
  pour le bilan (réponses, corrections et explications de la session, seulement si elle est
  terminée et appartient à l'utilisateur). Garder la réponse choisie (nouvelle table
  `qcm_answers` avec RLS, ou colonne dédiée) pour le bilan. Mêmes points en examen.
- Écran : question, choix A-D (une ou plusieurs bonnes réponses : `bonnes_reponses` est un
  tableau), animation juste/faux, explication, progression de la série, pastille de points,
  bilan avec classement de la semaine (RPC `leaderboard`) et corrections des erreurs.

## C. Flashcards (ordinateur + téléphone)

- Maquettes : `Flashcards.dc.html`, `MobileCartes.dc.html`, `MobileCarte.dc.html`.
  Fichiers : `src/pages/Flashcards.tsx`, `src/pages/MobileCartes.tsx`, `src/pages/MobileCarte.tsx`,
  `src/features/flashcards/*`.
- Migration : RPC `review_flashcard(p_session_id, p_flashcard_id, p_note)` avec
  `p_note` ∈ `a_revoir | bien | facile`, paliers 1/3/7/14 de la spec (première vue : lendemain,
  Facile d'emblée : 3 j ; ensuite À revoir → 1 j, Bien → palier suivant, Facile → saute un
  palier, max 14), écrit `card_states` et `private.log_activity` (3 pts). RPC
  `flashcard_queue(p_chapter_id uuid default null, p_new_limit int default 20)` qui renvoie les
  cartes dues aujourd'hui (Paris) puis des nouvelles cartes jamais vues.
- Écran : carte qui se retourne, boutons À revoir / Bien / Facile avec l'échéance affichée,
  fin de file. Téléphone : accueil (file du jour, nouvelles cartes par chapitre) et révision
  plein écran tactile.

## D. Exercices

- Maquette : `Exercice.dc.html`. Fichiers : `src/pages/Exercices.tsx` (liste du chapitre),
  `src/pages/Exercice.tsx`, `src/features/exercices/*`.
- Migration : RPC `submit_exercise(p_session_id, p_exercise_id, p_resultat)` avec
  `reussi | partiel | a_refaire` (100 % / 50 % / 25 % de `duree_min × 10`), ajoute ou retire de
  `exercise_todo`, appelle `private.log_activity`. Ne pas exposer la correction avant le clic
  "Afficher la correction" : la lire alors (la table `exercises` est lisible, c'est assumé par la
  spec, l'exercice étant déclaratif).
- Écran : énoncé, minuteur indicatif, correction révélée, auto-évaluation, points gagnés,
  exercice suivant.

## E. Feed, classement et notifications

- Maquettes : `Feed.dc.html`, `Notifications.dc.html`. Fichiers : `src/pages/Feed.tsx`,
  `src/features/feed/*`, et remplacer l'implémentation de
  `src/features/notifications/useNotifications.ts` et `NotificationsPanel.tsx` (garder la
  signature utilisée par `AppHeader`).
- Classement semaine / cumulé (RPC `leaderboard`) : top 5, puis ta position et tes voisins,
  semaines précédentes (`p_week_of`). Fil : posts 280 caractères, réponses 140, réactions
  🔥 👏 💪 😂, suppression par l'auteur ou l'admin, temps réel (`feed_items`, `reactions`).
  Événements automatiques créés côté serveur (trigger quand une session se termine avec des
  points, entrée dans le top 5) : migration dédiée. Notifications : réponses et réactions à mes
  posts, avec un état "lu" stocké en base (nouvelle table avec RLS).
  Lien vers `routes.publicProfile(pseudo)` sur chaque pseudo.

## F. Profil

- Maquettes : `Profil.dc.html`, `ProfilPublic.dc.html`. Fichiers : `src/pages/Profil.tsx`,
  `src/pages/ProfilPublic.tsx`, `src/features/profil/*`.
- Profil privé : photo (lien `routes.profilePhoto`), pseudo, points, niveau (`levelInfo`), rang
  de la semaine, calendrier d'activité, temps de révision par semaine et par matière (durées de
  `scoring.ts`), progression par matière et chapitre (`chapter_progress`), historique des
  sessions, bouton **Se déconnecter**. Badges et défis : section affichée seulement quand la
  gamification existera (masquée pour l'instant).
- Profil public (`/u/:pseudo`) : photo, niveau, rang de la semaine (badges plus tard). Les
  points cumulés d'un autre viennent de `leaderboard('total')` ; l'historique reste privé.

## Plus tard (après A-F)

- G. Gamification (étape 9 de la spec) : badges, défis hebdomadaires, duels différés, défis à
  un ami, victoire de niveau (modale de `Profil.dc.html`), puis réactivation des sections v2.
