import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example)')
}

/** Client typé. Régénérer les types après chaque migration (`npm run db:types` ou MCP). */
export const supabase = createClient<Database>(url, key)

export const FAKE_EMAIL_DOMAIN = import.meta.env.VITE_FAKE_EMAIL_DOMAIN ?? 'promo.invalid'

/** Pseudo -> e-mail factice utilisé en coulisses par Supabase Auth. */
export const pseudoToEmail = (pseudo: string) => `${normalizePseudo(pseudo)}@${FAKE_EMAIL_DOMAIN}`

export const normalizePseudo = (pseudo: string) => pseudo.trim().toLowerCase()

/** Même règle que la contrainte en base (profiles.pseudo). */
export const PSEUDO_RE = /^[a-z0-9._-]{3,20}$/
