// Feuilles pixel de la maquette : décor fixe (qui se balance) et feuilles qui tombent.
// Le bouton LeafToggle coupe les chutes ; le choix est mémorisé (localStorage "bachotage-feuilles").
import { useSyncExternalStore, type CSSProperties } from 'react'

const COLORS = {
  orange: ['#e8742a', '#bb4d00'],
  caramel: ['#fbba72', '#e08a3c'],
  gold: ['#f2a541', '#c46f12'],
  bronze: ['#ca5310', '#8f250c'],
} as const
export type LeafColor = keyof typeof COLORS
export type LeafShape = 'A' | 'B'

export function PixelLeaf({
  shape,
  size,
  color = 'orange',
  rotate = 0,
  body,
  vein,
}: {
  shape: LeafShape
  size: number
  color?: LeafColor
  rotate?: number
  body?: string
  vein?: string
}) {
  const [b, v] = COLORS[color]
  const style: CSSProperties = { display: 'block', transform: rotate ? `rotate(${rotate}deg)` : undefined }
  if (shape === 'A') {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true" style={style}>
        <path fill={body ?? b} d="M7 0h2v1h-2zM5 1h4v1h-4zM4 2h5v1h-5zM3 3h6v1h-6zM2 4h6v1h-6zM2 5h5v1h-5zM1 6h5v1h-5zM1 7h3v1h-3z" />
        <path fill={vein ?? v} d="M2 6h1v1h-1zM3 5h1v1h-1zM4 4h1v1h-1zM5 3h1v1h-1zM6 2h1v1h-1zM7 1h1v1h-1z" />
        <path fill="#7a3d14" d="M1 8h1v1h-1zM0 9h1v1h-1z" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true" style={style}>
      <path fill={body ?? b} d="M5 0h1v1h-1zM4 1h3v1h-3zM1 2h1v1h-1zM4 2h3v1h-3zM9 2h1v1h-1zM1 3h2v1h-2zM4 3h3v1h-3zM8 3h2v1h-2zM1 4h9v1h-9zM0 5h11v1h-11zM1 6h9v1h-9zM2 7h7v1h-7zM3 8h5v1h-5z" />
      <path fill={vein ?? v} d="M5 1h1v8h-1zM3 5h2v1h-2zM6 5h2v1h-2z" />
      <path fill="#7a3d14" d="M5 9h1v2h-1z" />
    </svg>
  )
}

/** [forme, taille px, couleur, rotation, position CSS, balance] */
export type DecorLeaf = [LeafShape, number, LeafColor, number, CSSProperties, boolean]

/** Décor par défaut des pages avec barre de navigation (Main.dc.html). */
export const DEFAULT_DECOR: DecorLeaf[] = [
  ['B', 92, 'orange', 18, { top: 92, right: '5%' }, true],
  ['A', 54, 'caramel', -28, { top: 168, right: '13%' }, true],
  ['A', 40, 'gold', 64, { top: 74, right: '21%' }, false],
  ['A', 44, 'bronze', 112, { top: 236, right: '2.5%' }, true],
  ['B', 58, 'gold', -14, { top: 560, left: '1%' }, true],
  ['A', 46, 'orange', 150, { top: 760, left: '2.5%' }, false],
  ['A', 60, 'caramel', 140, { top: 980, right: '1%' }, true],
  ['B', 50, 'orange', 30, { top: 1320, left: '1.5%' }, true],
  ['B', 76, 'orange', -24, { bottom: 18, right: '7%' }, true],
  ['A', 44, 'gold', 80, { bottom: 36, right: '16%' }, false],
]

/** Décor léger (pages de session : QCM, flashcards, exercice). */
export const LIGHT_DECOR: DecorLeaf[] = [
  ['B', 80, 'orange', 16, { top: 110, right: '3%' }, true],
  ['A', 46, 'gold', -40, { top: 260, right: '1.5%' }, true],
  ['A', 44, 'caramel', 60, { top: 520, left: '1.5%' }, false],
  ['B', 56, 'gold', -18, { bottom: 40, left: '2%' }, true],
  ['A', 50, 'orange', 130, { bottom: 30, right: '5%' }, true],
]

export function LeafDecor({ leaves = DEFAULT_DECOR, zIndex = 0 }: { leaves?: DecorLeaf[]; zIndex?: number }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden' }}>
      {leaves.map(([shape, size, color, rot, pos, sway], i) => (
        <span key={i} className={sway ? 'sway' : undefined} style={{ position: 'absolute', display: 'block', ...pos }}>
          <PixelLeaf shape={shape} size={size} color={color} rotate={rot} />
        </span>
      ))}
    </div>
  )
}

/** [forme, taille, couleur, gauche %, délai s, animation] */
type FallLeaf = [LeafShape, number, LeafColor, number, number, 'fallA' | 'fallB']
const FALLING: FallLeaf[] = [
  ['A', 26, 'orange', 9, 2, 'fallA'],
  ['B', 30, 'gold', 34, 11, 'fallB'],
  ['A', 22, 'caramel', 61, 6, 'fallA'],
  ['B', 28, 'orange', 82, 18, 'fallB'],
  ['A', 24, 'gold', 22, 23, 'fallA'],
  ['A', 20, 'bronze', 92, 14, 'fallB'],
]

// --- Préférence "feuilles qui tombent" partagée entre composants ---
const KEY = 'bachotage-feuilles'
const subs = new Set<() => void>()
const readOn = () => {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
let fallOn = typeof window !== 'undefined' ? readOn() : true
export function setFallingLeaves(on: boolean) {
  fallOn = on
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* stockage indisponible */
  }
  subs.forEach((s) => s())
}
export const useFallingLeaves = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => fallOn,
    () => true,
  )

export function FallingLeaves({ count = 6 }: { count?: number }) {
  const on = useFallingLeaves()
  if (!on) return null
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 3 }}>
      {FALLING.slice(0, count).map(([shape, size, color, left, delay, cls], i) => (
        <span key={i} className={cls} style={{ position: 'absolute', top: 0, display: 'block', opacity: 0, left: `${left}%`, animationDelay: `${delay}s` }}>
          <PixelLeaf shape={shape} size={size} color={color} />
        </span>
      ))}
    </div>
  )
}

/** Bouton rond 44 px qui coupe / relance les feuilles qui tombent. */
export function LeafToggle() {
  const on = useFallingLeaves()
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => setFallingLeaves(!on)}
      aria-pressed={on}
      aria-label="Feuilles qui tombent"
      title={on ? 'Couper les feuilles qui tombent' : 'Activer les feuilles qui tombent'}
      style={{ position: 'relative', width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 999, border: '1px solid var(--border)', backgroundColor: 'var(--card)', flex: '0 0 auto' }}
    >
      <PixelLeaf shape="A" size={20} body={on ? '#e8742a' : '#d9bfa6'} vein={on ? '#bb4d00' : '#b39580'} />
      {!on && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 9, top: 20, width: 24, height: 2, borderRadius: 2, backgroundColor: 'var(--muted)', transform: 'rotate(-45deg)' }} />
      )}
    </button>
  )
}
