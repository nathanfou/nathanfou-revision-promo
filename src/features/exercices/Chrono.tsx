// Minuteur indicatif : temps écoulé depuis l'ouverture de l'exercice, avec pause.
// Rien n'est envoyé au serveur : c'est un repère pour l'étudiant.
// `initial` : valeurs reprises après un rechargement de la page.
import { useEffect, useState } from 'react'
import { pad2 } from '../../lib/format'

export function useChrono(initial?: { elapsed: number; running: boolean }) {
  const [elapsed, setElapsed] = useState(initial?.elapsed ?? 0)
  const [running, setRunning] = useState(initial?.running ?? true)
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [running])
  return { elapsed, running, toggle: () => setRunning((r) => !r), stop: () => setRunning(false) }
}

export const fmtChrono = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`
}
