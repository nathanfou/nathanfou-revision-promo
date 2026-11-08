# Révision promo

Plateforme de révision pour la promo : QCM, flashcards à révision espacée, exercices
auto-évalués, points et classement de la semaine. Spec : `docs/specification-v1.txt`.

Stack : React + Vite (Vercel) et Supabase (Auth, Postgres, RLS). Détails pour le
développement dans `CLAUDE.md`.

## Démarrer

```bash
npm install
cp .env.example .env.local   # remplir avec l'URL et la clé publishable du projet Supabase
npm run dev
```

## Base de données

- Migrations : `supabase/migrations/` (déjà appliquées au projet `zmatzgmsnndmjpvrqmud`).
- Local (Docker) : `npm run db:start` puis `npm run db:reset`.
- Distant : `npx supabase login`, `npx supabase link --project-ref zmatzgmsnndmjpvrqmud`, puis `npm run db:push`.

## Administration (tableau de bord Supabase, SQL Editor)

```sql
-- Régler ou changer le code d'inscription partagé dans le groupe
insert into private.app_config (key, value) values ('signup_code', 'ton-code')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Se donner les droits admin (après s'être inscrit dans l'appli)
update public.profiles set is_admin = true where pseudo = 'ton-pseudo';
```

Mot de passe oublié : dans Authentication > Users, ouvrir l'utilisateur et définir un nouveau mot de passe (pas d'e-mail de récupération, les adresses sont factices).
