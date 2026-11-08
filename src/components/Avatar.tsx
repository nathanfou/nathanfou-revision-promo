// Photo de profil : fichier statique public/avatars/<pp_id>.webp (pp_01 à pp_50).
// Les images provisoires seront remplacées par les finales en gardant les mêmes noms.
import type { CSSProperties } from 'react'

export const AVATAR_IDS = Array.from({ length: 50 }, (_, i) => `pp_${String(i + 1).padStart(2, '0')}`)

export const avatarUrl = (ppId: string) => `/avatars/${ppId}.webp`

export function Avatar({ ppId, size = 34, alt = '', ring, style }: { ppId: string; size?: number; alt?: string; ring?: boolean; style?: CSSProperties }) {
  return (
    <img
      src={avatarUrl(ppId)}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: 999,
        objectFit: 'cover',
        backgroundColor: 'var(--caramel)',
        display: 'block',
        boxShadow: ring ? '0 0 0 5px var(--card), 0 0 0 6px var(--border)' : undefined,
        ...style,
      }}
    />
  )
}
