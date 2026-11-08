import { LogoMark } from './Logo'

export function FullPageLoader() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--muted)' }}>
        <span className="blink"><LogoMark size={36} /></span>
        <span style={{ fontSize: 14 }}>Chargement…</span>
      </div>
    </div>
  )
}

export function InlineLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <p role="status" style={{ margin: 0, padding: 16, fontSize: 14, color: 'var(--muted)' }}>
      {label}
    </p>
  )
}
