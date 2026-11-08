import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Tables } from '../lib/database.types'
import { normalizePseudo, pseudoToEmail, supabase } from '../lib/supabase'

export type Profile = Tables<'profiles'>

type AuthState = {
  /** true tant que la session initiale n'est pas connue */
  loading: boolean
  session: Session | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
  /** Met à jour la photo (seule colonne modifiable par l'utilisateur). */
  setPhoto: (ppId: string) => Promise<void>
  signIn: (pseudo: string, password: string) => Promise<void>
  signUp: (pseudo: string, password: string, signupCode: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Erreur affichable telle quelle à l'utilisateur. */
export class AuthError extends Error {
  field?: 'pseudo' | 'password' | 'code'
  constructor(message: string, field?: AuthError['field']) {
    super(message)
    this.field = field
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (!cancelled) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Pas d'appel Supabase directement dans ce callback (risque de blocage) : on diffère.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => void loadProfile(s?.user.id), 0)
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session?.user.id])

  const setPhoto = useCallback(
    async (ppId: string) => {
      if (!session) throw new AuthError('Tu n’es pas connecté.')
      const { data, error } = await supabase
        .from('profiles')
        .update({ pp_id: ppId })
        .eq('id', session.user.id)
        .select('*')
        .single()
      if (error) throw new AuthError('Impossible d’enregistrer la photo. Réessaie.')
      setProfile(data)
    },
    [session],
  )

  const signIn = useCallback(async (pseudo: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: pseudoToEmail(pseudo), password })
    if (error) {
      if (error.status === 400 || /invalid/i.test(error.message)) {
        throw new AuthError('Pseudo ou mot de passe incorrect. Vérifie l’orthographe de ton pseudo.')
      }
      throw new AuthError('Connexion impossible pour le moment. Réessaie dans un instant.')
    }
  }, [])

  const signUp = useCallback(async (pseudo: string, password: string, signupCode: string) => {
    const p = normalizePseudo(pseudo)
    const { data, error } = await supabase.auth.signUp({
      email: pseudoToEmail(p),
      password,
      options: { data: { pseudo: p, signup_code: signupCode.trim(), pp_id: 'pp_01' } },
    })
    if (error) {
      if (/already registered|already exists/i.test(error.message)) throw new AuthError('Ce pseudo est déjà pris.', 'pseudo')
      // Le trigger private.handle_new_user refuse un code faux : Auth renvoie "Database error saving new user".
      if (/database error/i.test(error.message)) throw new AuthError('Code d’inscription invalide.', 'code')
      if (/password/i.test(error.message)) throw new AuthError('Mot de passe trop faible : 8 caractères minimum.', 'password')
      throw new AuthError('Inscription impossible pour le moment. Réessaie dans un instant.')
    }
    if (!data.session) {
      // Confirmation d'e-mail encore activée côté Supabase : on tente une connexion directe.
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: pseudoToEmail(p), password })
      if (e2) throw new AuthError('Compte créé, mais la connexion a échoué. Demande à l’admin de désactiver « Confirm email ».')
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ loading, session, profile, refreshProfile, setPhoto, signIn, signUp, signOut }),
    [loading, session, profile, refreshProfile, setPhoto, signIn, signUp, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}

/** Profil de l'utilisateur connecté (à utiliser sous <RequireAuth>, où il est garanti). */
export function useMe(): Profile {
  const { profile } = useAuth()
  if (!profile) throw new Error('useMe() appelé hors d’une route protégée')
  return profile
}
