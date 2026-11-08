import { Link } from 'react-router'

export const APP_NAME = 'Bachotage'

export function LogoMark({ size = 28, center = 'var(--card)' }: { size?: number; center?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto' }}>
      <circle cx="14" cy="14" r="13" fill="#bb4d00" />
      <circle cx="14" cy="14" r="8" fill="none" stroke="#fbba72" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="3" fill={center} />
    </svg>
  )
}

/** Logo + nom. Avec `to`, c'est un lien. */
export function Logo({ to, size = 28, fontSize = 18 }: { to?: string; size?: number; fontSize?: number }) {
  const inner = (
    <>
      <LogoMark size={size} />
      <span style={{ fontSize, fontWeight: 600, letterSpacing: '-0.01em' }}>{APP_NAME}</span>
    </>
  )
  const style = { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' } as const
  return to ? (
    <Link to={to} style={style}>
      {inner}
    </Link>
  ) : (
    <span style={style}>{inner}</span>
  )
}
