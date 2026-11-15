import { Link } from 'react-router'

export const APP_NAME = 'Leafnotes'

/** Feuille d'automne : limbe ember, nervures caramel. `vein` change la couleur des nervures. */
export function LogoMark({ size = 28, vein = 'var(--caramel)' }: { size?: number; vein?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto' }}>
      <path d="M7 21C4.6 12.6 10.4 4.6 24.5 3.5C23.6 16.8 16.4 23.4 7 21Z" fill="var(--accent)" />
      <g fill="none" stroke={vein} strokeWidth="1.4" strokeLinecap="round">
        <path d="M7.6 20.4Q14.5 14 21.6 6.6" />
        <path d="M11.2 17.2L10.4 12.4M11.2 17.2L15.8 17.8M15 13.4L15.2 8.6M15 13.4L19.8 13.6" />
      </g>
      <path d="M7.6 20.4L3.5 24.5" stroke="var(--bronze)" strokeWidth="1.8" strokeLinecap="round" />
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
