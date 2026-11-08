// Gabarit des pages de session (QCM, flashcards, exercice) : bouton Quitter, titre, pastille de points.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icons'
import { LeafToggle, LIGHT_DECOR } from '../components/Leaves'
import { fmtInt } from '../lib/format'
import { headerInnerStyle, headerShellStyle } from './AppHeader'
import { PageBackground } from './AppLayout'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  /** pastille de droite : "Série +90 pts" */
  pillLabel?: string
  points?: number
  /** destination du bouton Quitter (défaut : accueil) */
  quitTo?: string
  /** appelé avant de quitter (ex. end_session) */
  onQuit?: () => void
  /** largeur max du contenu (défaut 1280) */
  maxWidth?: number
  children: ReactNode
}

export function SessionLayout({ title, subtitle, pillLabel = 'Série', points, quitTo = '/', onQuit, maxWidth = 1280, children }: Props) {
  return (
    <PageBackground decor={LIGHT_DECOR}>
      <header style={headerShellStyle}>
        <div style={{ ...headerInnerStyle, gap: '12px 24px' }}>
          <Link to={quitTo} onClick={onQuit} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
            <Icon name="arrowLeft" size={16} strokeWidth={2} />
            Quitter
          </Link>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</p>
            {subtitle && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LeafToggle />
            {points !== undefined && (
              <span aria-live="polite" style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '8px 14px', borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{pillLabel}</span>
                <span className="lcd" style={{ fontSize: 17 }}>+{fmtInt(points)}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>pts</span>
              </span>
            )}
          </div>
        </div>
      </header>
      <main style={{ position: 'relative', zIndex: 1, maxWidth, margin: '0 auto', padding: '36px 32px 72px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </main>
    </PageBackground>
  )
}
