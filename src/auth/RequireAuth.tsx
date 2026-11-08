import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullPageLoader } from '../components/Loader'
import { useAuth } from './AuthProvider'

/** Protège une route : redirige vers /connexion sans session, attend le profil sinon. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, profile } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  if (!profile) return <FullPageLoader />
  return <>{children}</>
}

/** Pages publiques (connexion, inscription) : redirige vers l'accueil si déjà connecté. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  if (loading) return <FullPageLoader />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}
