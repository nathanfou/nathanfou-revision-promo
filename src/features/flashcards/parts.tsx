// Briques visuelles des flashcards (maquettes Flashcards, MobileCarte).
import type { CSSProperties, ReactNode } from 'react'
import type { Note, QueueCard } from './api'
import { tierLabel, whenLong, whenShort } from './labels'

/** Barre de progression pixel de la file (20 cases). */
export function QueueMeter({ value, compact = false }: { value: number; compact?: boolean }) {
  const n = 20
  const lit = Math.round(Math.max(0, Math.min(1, value)) * n)
  const segs = Array.from({ length: n }, (_, i) => i < lit)
  return (
    <div
      role="progressbar"
      aria-label="Progression de la file"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={compact ? 'pxs' : 'px'}
      style={{ flex: compact ? 1 : '1 1 360px', padding: compact ? 2 : 3, backgroundColor: 'var(--frame-on)' }}
    >
      <div className={compact ? 'pxs' : 'px'} style={{ display: 'flex', alignItems: 'center', gap: compact ? 2 : 4, padding: compact ? '3px 4px' : '5px 8px 5px 6px', backgroundColor: 'var(--card)' }}>
        {!compact && (
          <svg width="8" height="14" viewBox="0 0 4 7" shapeRendering="crispEdges" aria-hidden="true" style={{ flex: '0 0 auto', display: 'block', marginRight: 2 }}>
            <path fill="#bb4d00" d="M3 0h1v7h-1zM2 1h1v5h-1zM1 2h1v3h-1zM0 3h1v1h-1z" />
          </svg>
        )}
        {segs.map((on, i) => (
          <span key={i} style={{ flex: 1, minWidth: compact ? undefined : 4, height: compact ? 10 : 16, transition: 'background-color .3s', backgroundColor: on ? 'var(--seg-on)' : 'var(--seg-off)' }} />
        ))}
      </div>
    </div>
  )
}

/** Pile de cartes : deux cartes décalées derrière la carte active. */
export function CardStack({ children, compact = false, style }: { children: ReactNode; compact?: boolean; style?: CSSProperties }) {
  const r = compact ? 22 : 24
  return (
    <div style={{ position: 'relative', paddingTop: compact ? 10 : 14, ...style }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: compact ? 16 : 22, right: compact ? 16 : 22, top: 0, height: compact ? 50 : 60, borderRadius: r, backgroundColor: '#f6dcc0', border: '1px solid #ebc8a6', transform: `rotate(${compact ? -1.5 : -1.2}deg)` }} />
      <div aria-hidden="true" style={{ position: 'absolute', left: compact ? 8 : 10, right: compact ? 8 : 10, top: compact ? 5 : 6, height: compact ? 50 : 60, borderRadius: r, backgroundColor: 'var(--chip)', border: '1px solid var(--border)', transform: `rotate(${compact ? 1 : 0.8}deg)` }} />
      {children}
    </div>
  )
}

export function CardTags({ card, compact = false }: { card: QueueCard; compact?: boolean }) {
  const fs = compact ? 12 : 13
  const pad = compact ? '3px 10px' : '4px 11px'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: compact ? 6 : 8 }}>
      <span style={{ padding: pad, borderRadius: 999, backgroundColor: 'var(--chip)', fontSize: fs, color: 'var(--text-2)' }}>
        {card.subjectNom}, {card.chapterNom}
      </span>
      <span style={{ padding: pad, borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontSize: fs }}>
        {card.palier == null ? 'Nouvelle carte' : `Palier : ${tierLabel(card.palier)}`}
      </span>
    </div>
  )
}

/** Trait pointillé entre recto et verso. */
export const Dashes = () => <div aria-hidden="true" style={{ height: 3, backgroundImage: 'repeating-linear-gradient(90deg, #e3c3a5 0 8px, transparent 8px 14px)' }} />

const RATE_STYLES: Record<Note, { label: string; style: CSSProperties; sub: string; cls: string }> = {
  a_revoir: { label: 'À revoir', style: { border: '1.5px solid var(--ko)', backgroundColor: 'var(--ko-bg)', color: 'var(--ko)' }, sub: 'var(--ko)', cls: 'btn' },
  bien: { label: 'Bien', style: { border: '1.5px solid var(--ink)', backgroundColor: 'var(--ink)', color: 'var(--chip)' }, sub: 'var(--ink-muted)', cls: 'btn' },
  facile: { label: 'Facile', style: { border: '1.5px solid var(--accent)', backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }, sub: 'var(--accent-text)', cls: 'btn btn-primary' },
}

/** Les trois boutons de note, avec l'échéance que chacun donnerait. */
export function RateButtons({ card, onRate, disabled, compact = false, shortcuts = false }: { card: QueueCard; onRate: (n: Note) => void; disabled?: boolean; compact?: boolean; shortcuts?: boolean }) {
  return (
    <div role="group" aria-label="Tu la connaissais ?" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: compact ? 8 : 10 }}>
      {(Object.keys(RATE_STYLES) as Note[]).map((note, i) => {
        const s = RATE_STYLES[note]
        const when = compact ? whenShort(card.next[note]) : whenLong(card.next[note])
        return (
          <button
            key={note}
            type="button"
            className={s.cls}
            disabled={disabled}
            onClick={() => onRate(note)}
            aria-label={`${s.label}, ${when}`}
            aria-keyshortcuts={shortcuts ? String(i + 1) : undefined}
            style={{
              minHeight: compact ? 64 : undefined,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              padding: compact ? 8 : '12px 10px', borderRadius: 16, cursor: 'pointer', ...s.style,
            }}
          >
            <span style={{ fontSize: compact ? 15 : 16, fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: compact ? 12 : 13, color: s.sub }}>{when}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Pastille verte "+3 pts" qui s'envole après une note (rien si la carte ne rapportait plus rien aujourd'hui). */
export function GainBubble({ gain, compact = false }: { gain: { n: number; key: number } | null; compact?: boolean }) {
  if (!gain) return null
  return (
    <span
      key={gain.key}
      className="floatup"
      aria-live="polite"
      style={{
        position: 'absolute', right: compact ? 16 : 24, top: compact ? -4 : -6, zIndex: 2,
        padding: compact ? '3px 10px' : '4px 12px', borderRadius: 999,
        backgroundColor: gain.n > 0 ? 'var(--ok)' : 'var(--ink)', color: gain.n > 0 ? 'var(--accent-text)' : 'var(--caramel)',
        fontFamily: 'var(--mono)', fontSize: compact ? 13 : 14, fontWeight: 500,
      }}
    >
      {gain.n > 0 ? `+${gain.n} pts` : 'Déjà comptée aujourd’hui'}
    </span>
  )
}

/** Écran LCD "CARTES 37/37" de fin de file. */
export function DoneLcd({ value, compact = false }: { value: string; compact?: boolean }) {
  return (
    <div style={{ padding: compact ? 8 : 10, borderRadius: compact ? 14 : 16, backgroundColor: 'var(--ink)' }}>
      <div style={{ padding: compact ? '6px 14px 4px' : '8px 18px 6px', borderRadius: compact ? 9 : 10, backgroundColor: 'var(--caramel)', color: 'var(--lava)', boxShadow: 'inset 0 0 0 1px rgba(105,30,6,0.18), inset 0 3px 0 rgba(105,30,6,0.1)' }}>
        {!compact && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>CARTES</div>}
        <div className="lcd" style={{ fontSize: compact ? 48 : 60, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}
