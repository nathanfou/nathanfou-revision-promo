// Sur téléphone, seules les flashcards sont accessibles (spec, section "Pages").
import type { ReactNode } from 'react'
import { MobileLayout } from '../layouts/MobileLayout'
import { useIsMobile } from '../lib/useMediaQuery'
import { Icon } from './Icons'
import { ButtonLink, Card } from './ui'

export function DesktopOnly({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  if (!isMobile) return <>{children}</>
  return (
    <MobileLayout>
      <Card className="rise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <span style={{ color: 'var(--link)' }}><Icon name="laptop" size={32} /></span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Disponible sur ordinateur</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>
          Sur téléphone, seules les flashcards sont accessibles. Les QCM, les exercices, le feed et le profil s’ouvrent sur un ordinateur.
        </p>
        <ButtonLink to="/" block>Aller aux flashcards</ButtonLink>
      </Card>
    </MobileLayout>
  )
}

/** Choisit l'écran selon la largeur. */
export function Responsive({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
  return <>{useIsMobile() ? mobile : desktop}</>
}
