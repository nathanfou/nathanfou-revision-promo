// Barres de progression pixel de la maquette.
import { PlayIcon } from './Icons'

const segs = (value: number, n: number) => {
  const on = Math.round(Math.max(0, Math.min(1, value)) * n)
  return Array.from({ length: n }, (_, i) => i < on)
}

/**
 * Grande barre encadrée (Reprendre, défi, XP) : cadre accent, flèche pixel, `segments` cases.
 * `value` entre 0 et 1.
 */
export function PixelMeter({ value, segments = 20, height = 16, maxWidth, label }: { value: number; segments?: number; height?: number; maxWidth?: number; label?: string }) {
  return (
    <div
      role={label ? 'meter' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(value * 100) : undefined}
      aria-hidden={label ? undefined : true}
      className="px"
      style={{ flex: '1 1 auto', maxWidth, padding: 3, backgroundColor: 'var(--frame-on)' }}
    >
      <div className="px" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px 5px 6px', backgroundColor: 'var(--card)' }}>
        <svg width="8" height="14" viewBox="0 0 4 7" shapeRendering="crispEdges" style={{ flex: '0 0 auto', display: 'block', marginRight: 2 }} aria-hidden="true">
          <path fill="#bb4d00" d="M3 0h1v7h-1zM2 1h1v5h-1zM1 2h1v3h-1zM0 3h1v1h-1z" />
        </svg>
        {segs(value, segments).map((on, i) => (
          <span key={i} style={{ flex: 1, minWidth: 4, height, transition: 'background-color .3s', backgroundColor: on ? 'var(--seg-on)' : 'var(--seg-off)' }} />
        ))}
      </div>
    </div>
  )
}

/** Petite barre (listes de matières / chapitres) : 10 cases, cadre accent si `active`. */
export function MiniMeter({ value, active = false, segments = 10, height = 6 }: { value: number; active?: boolean; segments?: number; height?: number }) {
  return (
    <span aria-hidden="true" className="pxs" style={{ display: 'block', padding: 2, backgroundColor: active ? 'var(--frame-on)' : 'var(--frame-off)' }}>
      <span className="pxs" style={{ display: 'flex', gap: 2, padding: '2px 3px', backgroundColor: 'var(--card)' }}>
        {segs(value, segments).map((on, i) => (
          <span key={i} style={{ flex: 1, height, backgroundColor: on ? 'var(--seg-on)' : 'var(--seg-off)' }} />
        ))}
      </span>
    </span>
  )
}

/** Marqueur de sélection des listes (triangle accent, sinon numéro "01"). */
export function RowMarker({ selected, index }: { selected: boolean; index: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--faint)' }}>
      {selected ? <PlayIcon size={13} color="#bb4d00" /> : String(index + 1).padStart(2, '0')}
    </span>
  )
}
