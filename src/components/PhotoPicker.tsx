// Grille des 50 photos de profil (maquette Photo.dc.html). Réutilisable depuis le Profil.
import { AVATAR_IDS, avatarUrl } from './Avatar'
import { Icon } from './Icons'

export function PhotoPicker({ value, onChange, labelledBy }: { value: string; onChange: (ppId: string) => void; labelledBy?: string }) {
  const move = (delta: number) => {
    const i = AVATAR_IDS.indexOf(value)
    const next = AVATAR_IDS[(i + delta + AVATAR_IDS.length) % AVATAR_IDS.length]
    onChange(next)
    requestAnimationFrame(() => document.getElementById(`pp-${next}`)?.focus())
  }
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 12 }}
    >
      {AVATAR_IDS.map((id, i) => {
        const sel = id === value
        return (
          <button
            key={id}
            id={`pp-${id}`}
            type="button"
            className="tile"
            role="radio"
            aria-checked={sel}
            aria-label={`Image ${String(i + 1).padStart(2, '0')}`}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(id)}
            style={{ position: 'relative', aspectRatio: '1', padding: 0, border: 0, borderRadius: 18, overflow: 'visible', backgroundColor: 'var(--caramel)', boxShadow: sel ? '0 0 0 3px var(--card), 0 0 0 5px var(--ink)' : undefined }}
          >
            <img src={avatarUrl(id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', borderRadius: 18 }} />
            {sel && (
              <span aria-hidden="true" style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)', border: '2px solid var(--card)' }}>
                <Icon name="check" size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
