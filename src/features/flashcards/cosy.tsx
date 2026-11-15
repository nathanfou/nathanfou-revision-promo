// Fond "pièce cosy" (pixel art : pluie, chats, feuilles) derrière les flashcards, ordinateur et téléphone.
// Habillage seulement : rien ici ne touche à la série. Le bouton CosyToggle, posé en haut à gauche
// de la carte, rebascule sur le fond pêche ; le choix est mémorisé (localStorage
// "leafnotes.fond-flashcards" = "on" | "off", activé par défaut). Fondu doux, instantané si
// prefers-reduced-motion (classe .cosy-fade de index.css).
import { useCallback, useState, useSyncExternalStore, type CSSProperties } from 'react'

const KEY = 'leafnotes.fond-flashcards'
const subs = new Set<() => void>()
const readOn = () => {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
let cosyOn = typeof window !== 'undefined' ? readOn() : true

export function setCosyBackground(on: boolean) {
  cosyOn = on
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* stockage indisponible */
  }
  subs.forEach((s) => s())
}

export const useCosyBackground = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => cosyOn,
    () => true,
  )

const SRC = '/fonds/cosy-1600.webp'
const SRCSET = '/fonds/cosy-960.webp 960w, /fonds/cosy-1600.webp 1600w, /fonds/cosy-2400.webp 2400w'

/**
 * Calque fixe plein écran : l'image et un voile sombre léger. À placer au-dessus du décor de
 * feuilles et sous le contenu (z-index 0, avant l'en-tête). L'image n'est téléchargée qu'une fois
 * le fond activé, puis reste montée pour pouvoir s'effacer en fondu.
 */
export function CosyBackdrop() {
  const on = useCosyBackground()
  const [wanted, setWanted] = useState(on)
  const [loaded, setLoaded] = useState(false)
  if (on && !wanted) setWanted(true)
  // Image déjà en cache : "load" peut partir avant que React n'écoute.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])
  if (!wanted) return null
  const visible = on && loaded
  return (
    <div aria-hidden="true" className="cosy-fade" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', backgroundColor: '#2b2238', opacity: visible ? 1 : 0 }}>
      <img
        ref={imgRef}
        src={SRC}
        srcSet={SRCSET}
        sizes="100vw"
        alt=""
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="cosy-img"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Voile : assombrit un peu le haut (en-tête, compteur) et le bas, garde la scène lisible. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(34,22,40,0.38) 0%, rgba(34,22,40,0.14) 32%, rgba(34,22,40,0.18) 68%, rgba(34,22,40,0.46) 100%)' }} />
    </div>
  )
}

/**
 * Pastille translucide pour le texte posé directement sur le fond (compteur, note de bas de page).
 * Marge négative = padding : la mise en page reste identique fond activé ou non.
 */
export function cosyGlass(on: boolean, pad: [number, number] = [10, 14], radius = 18): CSSProperties {
  return {
    padding: `${pad[0]}px ${pad[1]}px`,
    margin: `-${pad[0]}px -${pad[1]}px`,
    borderRadius: radius,
    backgroundColor: on ? 'rgba(255,250,243,0.86)' : 'rgba(255,250,243,0)',
    boxShadow: on ? '0 12px 30px -18px rgba(20,10,30,0.7)' : '0 12px 30px -18px rgba(20,10,30,0)',
    WebkitBackdropFilter: on ? 'blur(8px)' : undefined,
    backdropFilter: on ? 'blur(8px)' : undefined,
  }
}

/** Petite fenêtre pixel (nuit, lune, collines), barrée quand le fond est coupé. */
function WindowIcon({ on, size }: { on: boolean; size: number }) {
  const frame = on ? '#7a3d14' : '#b39580'
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block' }}>
      <path fill={on ? '#3b3f73' : '#eadccd'} d="M1 2h8v6h-8z" />
      <path fill={on ? '#f2a541' : '#d9bfa6'} d="M6 3h2v2h-2z" />
      <path fill={on ? '#e8742a' : '#d9bfa6'} d="M2 5h1v1h-1zM1 6h3v2h-3zM4 7h5v1h-5z" />
      <path fill={frame} d="M0 1h10v1h-10zM0 8h10v1h-10zM0 2h1v6h-1zM9 2h1v6h-1z" />
    </svg>
  )
}

/** Bouton rond posé à cheval sur le coin haut gauche de la carte (enfant direct de CardStack). */
export function CosyToggle({ compact = false }: { compact?: boolean }) {
  const on = useCosyBackground()
  const size = compact ? 34 : 36
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => setCosyBackground(!on)}
      aria-pressed={on}
      aria-label="Fond pièce cosy"
      title={on ? 'Revenir au fond orangé' : 'Mettre le fond pièce cosy'}
      style={{
        position: 'absolute',
        zIndex: 2,
        top: compact ? -6 : -4,
        left: compact ? -10 : -16,
        width: size,
        height: size,
        padding: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 999,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        boxShadow: '0 6px 16px -8px rgba(60,30,20,0.55)',
      }}
    >
      <WindowIcon on={on} size={compact ? 18 : 20} />
      {!on && (
        <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', width: size * 0.62, height: 2, marginLeft: -(size * 0.31), marginTop: -1, borderRadius: 2, backgroundColor: 'var(--muted)', transform: 'rotate(-45deg)' }} />
      )}
    </button>
  )
}
