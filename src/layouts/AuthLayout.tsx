// Gabarit Connexion / Inscription : panneau sombre à gauche (pile de feuilles), formulaire à droite.
import type { ReactNode } from 'react'
import { FallingLeaves, LeafToggle, PixelLeaf, type DecorLeaf } from '../components/Leaves'
import { LcdStrip } from '../components/Lcd'
import { APP_NAME, LogoMark } from '../components/Logo'
import { daysUntilMonday, isoWeekLabel, jMinus } from '../lib/format'

const PILE: DecorLeaf[] = [
  ['B', 120, 'orange', -14, { bottom: -26, left: -20 }, false],
  ['A', 84, 'gold', 30, { bottom: 30, left: 90 }, true],
  ['B', 96, 'caramel', 12, { bottom: -30, left: 170 }, false],
  ['A', 70, 'bronze', -50, { bottom: 50, left: 250 }, true],
  ['B', 110, 'gold', 26, { bottom: -36, left: 320 }, false],
  ['A', 64, 'orange', 100, { bottom: 70, left: 410 }, true],
  ['B', 88, 'orange', -20, { bottom: -20, left: 470 }, false],
  ['A', 58, 'caramel', 60, { bottom: 20, left: 560 }, false],
  ['A', 48, 'gold', -30, { top: 120, right: 60 }, true],
  ['B', 40, 'orange', 20, { top: 260, right: 140 }, true],
]

export function AuthLayout({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', background: 'var(--bg-gradient)', color: 'var(--text)' }}>
      <FallingLeaves count={5} />
      <aside style={{ position: 'relative', flex: '1 1 520px', minWidth: 0, minHeight: compact ? 220 : 560, overflow: 'hidden', padding: compact ? '28px 24px' : '48px 56px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: 'var(--ink)', color: 'var(--ink-text)' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: compact ? 'none' : undefined }}>
          {PILE.map(([shape, size, color, rot, pos, sway], i) => (
            <span key={i} className={sway ? 'sway' : undefined} style={{ position: 'absolute', display: 'block', ...pos }}>
              <PixelLeaf shape={shape} size={size} color={color} rotate={rot} />
            </span>
          ))}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={32} center="var(--ink)" />
          <span style={{ fontSize: 20, fontWeight: 600 }}>{APP_NAME}</span>
        </div>
        <div className="rise" style={{ position: 'relative', marginTop: compact ? 0 : 40, maxWidth: 460 }}>
          <h2 style={{ margin: 0, fontSize: compact ? 32 : 48, lineHeight: 1.05, fontWeight: 600, letterSpacing: '-0.03em' }}>Révise avec ta promo.</h2>
          <p style={{ margin: '16px 0 0', fontSize: 18, lineHeight: 1.5, color: 'var(--ink-muted)' }}>QCM, flashcards et exercices. Un classement qui repart à zéro chaque lundi.</p>
        </div>
        {!compact && (
          <div className="rise" style={{ animationDelay: '120ms', position: 'relative', alignSelf: 'flex-start', padding: 10, borderRadius: 16, backgroundColor: 'var(--ink-2)' }}>
            <LcdStrip items={[{ label: 'SEMAINE', value: isoWeekLabel() }, { label: 'RESET', value: jMinus(daysUntilMonday()) }]} />
          </div>
        )}
      </aside>
      <main style={{ position: 'relative', zIndex: 1, flex: '1 1 480px', minWidth: 0, padding: compact ? 16 : 32, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LeafToggle />
        </div>
        {children}
      </main>
    </div>
  )
}

export const authCardStyle = {
  width: '100%', margin: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 18,
  backgroundColor: 'rgba(255,250,243,0.95)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-pop)',
} as const
