// Texte au format du Labo Graphes : Markdown, formules KaTeX et figures interactives
// ([[widget:graphe|...]], [[widget:algo|...]], [[widget:table|...]]).
// Le contenu vient de la base (écrit par l'import, clé secrète) : on fait confiance au HTML
// produit par le moteur, qui échappe lui-même le texte.
import { useEffect, useRef, useState } from 'react'
import { chargerLabo } from './charger'

export function LaboText({ text, size = 16 }: { text: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    chargerLabo()
      .then(({ Rendu, Widgets }) => {
        const el = ref.current
        if (!el || ctrl.signal.aborted) return
        el.innerHTML = Rendu.md(text)
        Widgets.monter(el, ctrl.signal)
      })
      .catch(() => setErreur(true))
    return () => ctrl.abort()
  }, [text])

  if (erreur) {
    return <p style={{ margin: 0, fontSize: size, lineHeight: 1.6, whiteSpace: 'pre-line', color: 'var(--text-2)' }}>{text}</p>
  }
  return <div ref={ref} className="labo prose" style={{ fontSize: size }} />
}
