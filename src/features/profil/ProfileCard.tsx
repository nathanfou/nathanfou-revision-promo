// Fiche du haut (maquettes Profil et ProfilPublic) : photo, pseudo, niveau, barre d'XP, écran LCD.
import type { ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { Kata, lcdScreenStyle, LcdDigits, LcdLabel } from '../../components/Lcd'
import { PixelMeter } from '../../components/Meter'
import { Chip } from '../../components/ui'
import { fmtInt } from '../../lib/format'
import { levelInfo } from '../../lib/levels'
import { useCountUp } from '../../lib/useCountUp'
import { longDay, parisDay } from './dates'

export type LcdItem = { label: string; value: string; ghost: string; unit: string }

type Props = {
  pseudo: string
  ppId: string
  createdAt: string
  totalPoints: number
  lcd: LcdItem[]
  lcdNote: string
  /** vue privée : barre d'XP + actions (photo, déconnexion) */
  privateView?: boolean
  actions?: ReactNode
  /** h1 sur le profil public, h2 sous le titre "Profil" */
  headingLevel?: 1 | 2
}

export function ProfileCard({ pseudo, ppId, createdAt, totalPoints, lcd, lcdNote, privateView, actions, headingLevel = 2 }: Props) {
  const lv = levelInfo(totalPoints)
  const animated = useCountUp(privateView ? Math.round(lv.progress * 1000) : 0) / 1000
  const H = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <section
      className="rise"
      aria-label={`Fiche de ${pseudo}`}
      style={{
        animationDelay: '80ms', padding: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '28px 36px',
        backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow-card)',
      }}
    >
      <Avatar ppId={ppId} size={120} ring alt={`Photo de ${pseudo}`} />

      <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px' }}>
          <H style={{ margin: 0, fontSize: headingLevel === 1 ? 36 : 34, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>{pseudo}</H>
          <Chip tone="accent">Niveau {lv.level}</Chip>
        </div>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Dans la promo depuis le {longDay(parisDay(createdAt))}</p>
        {privateView && (
          <div style={{ maxWidth: 440, marginTop: 4 }}>
            <PixelMeter value={animated} segments={20} height={14} label={`Progression vers le niveau ${lv.level + 1}`} />
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4px 12px', fontSize: 14, color: 'var(--muted)' }}>
              <span>Encore {fmtInt(lv.remaining)} pts avant le niveau {lv.level + 1}</span>
              <span className="mono">
                {fmtInt(lv.points)} / {fmtInt(lv.next)}
              </span>
            </div>
          </div>
        )}
        {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>{actions}</div>}
      </div>

      <div style={{ flex: `1 1 ${lcd.length > 2 ? 400 : 300}px`, minWidth: 0, padding: 16, borderRadius: 18, backgroundColor: 'var(--ink)' }}>
        <div style={{ ...lcdScreenStyle, borderRadius: 10, display: 'grid', gridTemplateColumns: `repeat(${lcd.length}, minmax(0, 1fr))` }}>
          {lcd.map((l, i) => (
            <div key={l.label} style={{ padding: '12px 16px 14px', minWidth: 0, borderLeft: i ? '1px solid rgba(105,30,6,0.2)' : undefined }}>
              <LcdLabel>{l.label}</LcdLabel>
              <div style={{ marginTop: 6 }}>
                <LcdDigits value={l.value} ghost={l.ghost} size={38} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>{l.unit}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--ink-faint)' }}>
          <span>{lcdNote}</span>
          <Kata>プロフィール</Kata>
        </div>
      </div>
    </section>
  )
}

/** Bandeau d'information (vue publique). */
export function InfoNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rise" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderRadius: 16, backgroundColor: 'rgba(253,227,200,0.9)', border: '1px solid #f1cfa9', color: 'var(--text-2)' }}>
      <span style={{ marginTop: 1, color: 'var(--link)' }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{children}</p>
    </div>
  )
}
