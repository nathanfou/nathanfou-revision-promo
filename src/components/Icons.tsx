// Icônes de la maquette (trait 24×24, currentColor). Usage : <Icon name="bell" size={20} />
import type { CSSProperties } from 'react'

const PATHS = {
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></>,
  qcm: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 12l3 3 5-6" /></>,
  cards: <><rect x="7" y="3" width="13" height="15" rx="2" /><path d="M4 7v12a2 2 0 0 0 2 2h10" /></>,
  pencil: <><path d="M15 4l5 5L9 20H4v-5z" /><path d="M13 6l5 5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h12l-2.5 4.5L17 13H5" /></>,
  duel: <><path d="M4 4l11 11" /><path d="M20 4L9 15" /><path d="M6 16l2 2" /><path d="M18 16l-2 2" /><path d="M4 20l3-3" /><path d="M20 20l-3-3" /></>,
  comment: <path d="M4 5h16v11H10l-5 4v-4H4z" />,
  chart: <><path d="M3 20h18" /><path d="M5 20v-7h4v7" /><path d="M10 20V6h4v14" /><path d="M15 20v-10h4v10" /></>,
  medal: <><circle cx="12" cy="14" r="6" /><path d="M8 3l4 5 4-5" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  laptop: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M1 20h22" /></>,
  phone: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrowRight: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  flip: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></>,
  undo: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5v.01" /></>,
} as const

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  color = 'currentColor',
  style,
  label,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  color?: string
  style?: CSSProperties
  /** Texte accessible ; sans label, l'icône est décorative. */
  label?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{ display: 'block', flex: '0 0 auto', ...style }}
    >
      {PATHS[name]}
    </svg>
  )
}

/** Triangle "lecture" plein (boutons Reprendre, Lancer, sélection de ligne). */
export function PlayIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ display: 'block', flex: '0 0 auto' }}>
      <path d="M4 2.5v11l9-5.5z" fill={color} />
    </svg>
  )
}
