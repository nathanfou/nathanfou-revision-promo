// Gabarit des pages principales : fond pêche, feuilles, barre de navigation, contenu centré (1280 px).
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { FallingLeaves, LeafDecor, type DecorLeaf } from '../components/Leaves'
import { AppHeader } from './AppHeader'

export const mainStyle = {
  position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '44px 32px 72px', display: 'flex', flexDirection: 'column', gap: 24,
} as const

export function PageBackground({ children, decor }: { children: ReactNode; decor?: DecorLeaf[] }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg-gradient)', color: 'var(--text)' }}>
      <LeafDecor leaves={decor} />
      <FallingLeaves />
      {children}
    </div>
  )
}

/** Route parente des pages Révision / Feed / Profil / profil public. */
export function AppLayout() {
  return (
    <PageBackground>
      <AppHeader />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </PageBackground>
  )
}
