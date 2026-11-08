// Routes de l'appli. Chaque page vit dans src/pages/ ; les chantiers remplacent les écrans
// provisoires sans toucher à ce fichier (sauf nouvelle route).
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RedirectIfAuthed, RequireAuth } from './auth/RequireAuth'
import { DesktopOnly, Responsive } from './components/DesktopOnly'
import { FullPageLoader } from './components/Loader'
import { AppLayout } from './layouts/AppLayout'
import Connexion from './pages/Connexion'
import Inscription from './pages/Inscription'
import Photo from './pages/Photo'

const Revision = lazy(() => import('./pages/Revision'))
const Feed = lazy(() => import('./pages/Feed'))
const Profil = lazy(() => import('./pages/Profil'))
const ProfilPublic = lazy(() => import('./pages/ProfilPublic'))
const Qcm = lazy(() => import('./pages/Qcm'))
const QcmBilan = lazy(() => import('./pages/QcmBilan'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Exercices = lazy(() => import('./pages/Exercices'))
const Exercice = lazy(() => import('./pages/Exercice'))
const MobileCartes = lazy(() => import('./pages/MobileCartes'))
const MobileCarte = lazy(() => import('./pages/MobileCarte'))

/** Route connectée, réservée à l'ordinateur. */
const Desk = ({ children }: { children: ReactNode }) => (
  <RequireAuth>
    <DesktopOnly>{children}</DesktopOnly>
  </RequireAuth>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/connexion" element={<RedirectIfAuthed><Connexion /></RedirectIfAuthed>} />
            <Route path="/inscription" element={<RedirectIfAuthed><Inscription /></RedirectIfAuthed>} />

            {/* Photo : inscription (étape 2) et profil, aussi sur téléphone pour l'inscription */}
            <Route path="/inscription/photo" element={<RequireAuth><Photo /></RequireAuth>} />
            <Route path="/profil/photo" element={<Desk><Photo /></Desk>} />

            {/* Accueil : page Révision sur ordinateur, accueil flashcards sur téléphone */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Responsive mobile={<MobileCartes />} desktop={<AppLayout />} />
                </RequireAuth>
              }
            >
              <Route index element={<Revision />} />
            </Route>

            {/* Pages principales (ordinateur) */}
            <Route element={<Desk><AppLayout /></Desk>}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/u/:pseudo" element={<ProfilPublic />} />
            </Route>

            {/* Sessions */}
            <Route path="/qcm/bilan/:sessionId" element={<Desk><QcmBilan /></Desk>} />
            <Route path="/qcm/:chapterId" element={<Desk><Qcm /></Desk>} />
            <Route path="/flashcards" element={<RequireAuth><Responsive mobile={<MobileCarte />} desktop={<Flashcards />} /></RequireAuth>} />
            <Route path="/exercices/:chapterId" element={<Desk><Exercices /></Desk>} />
            <Route path="/exercice/:exerciseId" element={<Desk><Exercice /></Desk>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
