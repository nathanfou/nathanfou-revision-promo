import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example)')
}

// Une fois le projet relié : `npm run db:types` génère src/lib/database.types.ts,
// puis createClient<Database>(...) pour typer les requêtes.
export const supabase = createClient(url, key)

export const FAKE_EMAIL_DOMAIN = import.meta.env.VITE_FAKE_EMAIL_DOMAIN ?? 'promo.invalid'

/** Pseudo -> e-mail factice utilisé en coulisses par Supabase Auth. */
export const pseudoToEmail = (pseudo: string) => `${pseudo.trim().toLowerCase()}@${FAKE_EMAIL_DOMAIN}`
