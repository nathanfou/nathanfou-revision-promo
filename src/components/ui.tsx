// Briques d'interface partagées (styles de la maquette).
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

// ---------------------------------------------------------------- Boutons
type Variant = 'primary' | 'ghost' | 'dark'
type Size = 'lg' | 'md' | 'sm'

const SIZES: Record<Size, CSSProperties> = {
  lg: { padding: '14px 26px', fontSize: 16 },
  md: { padding: '10px 18px', fontSize: 15 },
  sm: { padding: '7px 14px', fontSize: 13 },
}
const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { border: 0, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontWeight: 600, boxShadow: 'var(--shadow-cta)' },
  ghost: { border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)', color: 'var(--text)', fontWeight: 500 },
  dark: { border: 0, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontWeight: 600 },
}
export function buttonStyle(variant: Variant = 'primary', size: Size = 'md', block = false): CSSProperties {
  return {
    display: block ? 'flex' : 'inline-flex',
    width: block ? '100%' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ...SIZES[size],
    ...VARIANTS[variant],
  }
}
const cls = (variant: Variant) => `btn ${variant === 'ghost' ? 'btn-ghost' : 'btn-primary'}`

type BtnProps = { variant?: Variant; size?: Size; block?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
export function Button({ variant = 'primary', size = 'md', block, style, className, type = 'button', ...rest }: BtnProps) {
  return <button type={type} className={`${cls(variant)} ${className ?? ''}`} style={{ ...buttonStyle(variant, size, block), ...style }} {...rest} />
}

type LinkBtnProps = { variant?: Variant; size?: Size; block?: boolean } & LinkProps
export function ButtonLink({ variant = 'primary', size = 'md', block, style, className, ...rest }: LinkBtnProps) {
  return <Link className={`${cls(variant)} ${className ?? ''}`} style={{ ...buttonStyle(variant, size, block), ...(style as CSSProperties) }} {...rest} />
}

/** Bouton rond 44 px (cloche, feuilles...). */
export const roundButtonStyle: CSSProperties = {
  position: 'relative', width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 999,
  border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text)', flex: '0 0 auto',
}

// ---------------------------------------------------------------- Cartes
type CardProps = {
  children: ReactNode
  /** "light" (défaut) : carte crème ; "ink" : carte sombre (compte à rebours, encarts) ; "tint" : crème teinté */
  tone?: 'light' | 'ink' | 'tint'
  padding?: number | string
  radius?: number
  className?: string
  style?: CSSProperties
  as?: 'section' | 'div' | 'article' | 'aside'
} & Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'className' | 'children'>

export function Card({ children, tone = 'light', padding = 24, radius = 20, className, style, as: As = 'section', ...rest }: CardProps) {
  const toneStyle: CSSProperties =
    tone === 'ink'
      ? { backgroundColor: 'var(--ink)', color: 'var(--ink-text)', boxShadow: 'var(--shadow-ink)' }
      : tone === 'tint'
        ? { backgroundColor: 'var(--card-tint)', border: '1px solid var(--border)' }
        : { backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }
  return (
    <As className={className} style={{ minWidth: 0, padding, borderRadius: radius, ...toneStyle, ...style }} {...rest}>
      {children}
    </As>
  )
}

/** Pastille ronde 40 px avec icône, en tête de carte. */
export function CardIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" style={{ width: 40, height: 40, flex: '0 0 40px', display: 'grid', placeItems: 'center', borderRadius: 12, backgroundColor: 'var(--chip-strong)', color: 'var(--link)' }}>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- Pastilles
export function Chip({ children, tone = 'neutral', mono, style }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'ink' | 'outline' | 'ok' | 'ko'; mono?: boolean; style?: CSSProperties }) {
  const tones: Record<string, CSSProperties> = {
    neutral: { backgroundColor: 'var(--chip)', color: 'var(--text-2)' },
    accent: { backgroundColor: 'var(--chip-strong)', color: 'var(--link)', fontWeight: 600 },
    ink: { backgroundColor: 'var(--ink)', color: 'var(--caramel)' },
    outline: { border: '1px solid var(--border-strong)', color: 'var(--muted)' },
    ok: { backgroundColor: 'var(--ok-bg)', color: 'var(--ok)', fontWeight: 600 },
    ko: { backgroundColor: 'var(--ko-bg)', color: 'var(--ko)', fontWeight: 600 },
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 13, whiteSpace: 'nowrap', fontFamily: mono ? 'var(--mono)' : undefined, ...tones[tone], ...style }}>
      {children}
    </span>
  )
}

/** Pastille sombre de points : "1 240 pts" en chiffres LCD. */
export function PointsPill({ value, prefix, label = 'pts', size = 15 }: { value: ReactNode; prefix?: string; label?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)' }}>
      {prefix && <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{prefix}</span>}
      <span className="lcd" style={{ fontSize: size }}>{value}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------- Onglets segmentés
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, backgroundColor: 'var(--track)' }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={on ? undefined : 'tab'}
            style={{ padding: '7px 14px', border: 0, borderRadius: 999, fontSize: 14, fontWeight: 500, transition: 'background-color .2s', ...(on ? { backgroundColor: 'var(--card)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(120,60,20,0.18)' } : { backgroundColor: 'transparent', color: 'var(--muted)' }) }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- Titres de page
export function PageTitle({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rise" style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.025em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '10px 0 0', fontSize: 17, color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/** État vide ou d'erreur dans une carte. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: '28px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{title}</p>
      {children && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', maxWidth: 420, lineHeight: 1.5 }}>{children}</p>}
      {action}
    </div>
  )
}
