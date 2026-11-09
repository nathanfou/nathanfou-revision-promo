// Moteur du Labo Graphes (rendu Markdown + KaTeX, figures de graphes, tableaux calculés,
// corrigés animés pas à pas). Fichiers repris tels quels du Labo dans ./moteur, qui
// s'enregistrent sur window ; chargé à la demande (import dynamique) pour ne pas alourdir
// les autres pages.
import katex from 'katex'
import 'katex/dist/katex.min.css'
import './labo.css'

type Labo = {
  Rendu: { md: (text: string) => string }
  Widgets: { monter: (racine: Element, signal?: AbortSignal) => void }
}

declare global {
  interface Window {
    LABO?: { slug: string }
    Rendu?: Labo['Rendu']
    Widgets?: Labo['Widgets']
  }
}

let chargement: Promise<Labo> | null = null

export function chargerLabo(): Promise<Labo> {
  if (!chargement) {
    ;(window as unknown as { katex: typeof katex }).katex = katex
    window.LABO = { slug: 'revision-promo' }
    chargement = (async () => {
      // Ordre imposé : chaque fichier lit ce que les précédents ont posé sur window.
      await import('./moteur/icons.js')
      await import('./moteur/rendu.js')
      await import('./moteur/algos.js')
      await import('./moteur/graphe-geo.js')
      await import('./moteur/catalogue.js')
      await import('./moteur/widgets.js')
      await import('./moteur/graphe.js')
      await import('./moteur/widgets-graphes.js')
      return { Rendu: window.Rendu!, Widgets: window.Widgets! }
    })()
  }
  return chargement
}
