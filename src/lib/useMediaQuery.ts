import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Vue téléphone (spec : "seules les flashcards sont accessibles", détection à la largeur).
 * Sous 768 px, l'appli n'affiche que les écrans flashcards mobiles.
 */
export const MOBILE_QUERY = '(max-width: 767px)'
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY)

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
