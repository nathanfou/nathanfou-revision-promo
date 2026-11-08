// Écran LCD caramel sur fond sombre (compte à rebours, stats).
import type { CSSProperties, ReactNode } from 'react'

export const lcdScreenStyle: CSSProperties = {
  borderRadius: 12,
  backgroundColor: 'var(--caramel)',
  color: 'var(--lava)',
  boxShadow: 'inset 0 0 0 1px rgba(105,30,6,0.18), inset 0 3px 0 rgba(105,30,6,0.1)',
}

/** Chiffres LCD avec "fantôme" (segments éteints) derrière, ex. <LcdDigits value="J-06" ghost="J-88" size={96} />. */
export function LcdDigits({ value, ghost, size = 40 }: { value: ReactNode; ghost?: string; size?: number }) {
  return (
    <div className="lcd" style={{ position: 'relative', fontSize: size, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
      {ghost && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, opacity: 0.12 }}>
          {ghost}
        </span>
      )}
      <span style={{ position: 'relative' }}>{value}</span>
    </div>
  )
}

/** Petite étiquette mono majuscule au-dessus d'un chiffre LCD. */
export function LcdLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>{children}</div>
}

/** Tuiles LCD côte à côte (ex. PROMO 47 | SEMAINE S46). */
export function LcdStrip({ items, size = 40 }: { items: { label: string; value: ReactNode }[]; size?: number }) {
  return (
    <div style={{ display: 'flex', ...lcdScreenStyle, borderRadius: 10 }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: '10px 16px', borderLeft: i ? '1px solid rgba(105,30,6,0.2)' : undefined }}>
          <LcdLabel>{it.label}</LcdLabel>
          <div className="lcd" style={{ fontSize: size, lineHeight: 1 }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Katakana décoratif (DotGothic16). */
export function Kata({ children, color = 'var(--ink-faint)' }: { children: ReactNode; color?: string }) {
  return (
    <span lang="ja" aria-hidden="true" style={{ fontFamily: 'var(--kata)', fontSize: 11, letterSpacing: '0.18em', color }}>
      {children}
    </span>
  )
}
