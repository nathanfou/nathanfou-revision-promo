// Déroulé d'une file de cartes, commun à l'ordinateur et au téléphone.
// La session (start_session) n'est créée qu'à la première note, pour ne pas laisser
// de sessions vides quand on ouvre la page sans réviser ; end_session à la fin ou en quittant.
// Un rechargement de la page reprend la file là où elle en était (src/lib/resume.ts) : mêmes
// cartes, même position, points de la série. La session close au rechargement (pagehide),
// une nouvelle est ouverte à la note suivante.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../../auth/AuthProvider'
import { daysUntil } from '../../lib/format'
import { refreshMyPoints } from '../../lib/points'
import { clearResume, loadResume, resumeScope, saveResume } from '../../lib/resume'
import { endFlashcardSession, fetchChapterLabel, fetchQueue, reviewFlashcard, startFlashcardSession, type Note, type QueueCard } from './api'

/** Nouvelles cartes proposées dans une file de chapitre (la file du jour ne contient que les cartes dues). */
export const NEW_PER_CHAPTER = 20

export type Run = ReturnType<typeof useFlashcardRun>

/** Copie de la file gardée pour la reprise après rechargement. */
type Saved = {
  cards: QueueCard[]
  label: { chapter: string; subject: string } | null
  idx: number
  revealed: boolean
  points: number
  rated: number
  nextDays: number | null
}

export function useFlashcardRun(chapterId: string | null) {
  const { session: auth } = useAuth()
  const location = useLocation()
  const scope = resumeScope(auth?.user.id, location.pathname, chapterId, location.key)

  const [cards, setCards] = useState<QueueCard[] | null>(null)
  const [label, setLabel] = useState<{ chapter: string; subject: string } | null>(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [points, setPoints] = useState(0)
  const [rated, setRated] = useState(0)
  const [lastGain, setLastGain] = useState<{ n: number; key: number } | null>(null)
  const [nextDays, setNextDays] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const session = useRef<{ id: string | null; pending: Promise<string> | null }>({ id: null, pending: null })

  const load = useCallback(async () => {
    setError(null)
    const saved = loadResume<Saved>('flashcards', scope)
    if (saved && Array.isArray(saved.cards) && saved.idx >= 0 && saved.idx < saved.cards.length) {
      setCards(saved.cards)
      setLabel(saved.label)
      setIdx(saved.idx)
      setRevealed(saved.revealed)
      setPoints(saved.points)
      setRated(saved.rated)
      setNextDays(saved.nextDays)
      return
    }
    setCards(null)
    setIdx(0)
    setRevealed(false)
    try {
      const [q, l] = await Promise.all([
        fetchQueue(chapterId, chapterId ? NEW_PER_CHAPTER : 0),
        chapterId ? fetchChapterLabel(chapterId) : Promise.resolve(null),
      ])
      setCards(q)
      setLabel(l)
    } catch {
      setError('Impossible de charger les cartes. Vérifie ta connexion et réessaie.')
      setCards([])
    }
  }, [chapterId, scope])

  useEffect(() => {
    void load()
  }, [load])

  // Copie de la file à chaque changement, effacée quand la file est finie.
  useEffect(() => {
    if (!cards || cards.length === 0) return
    if (idx >= cards.length) clearResume('flashcards')
    else saveResume<Saved>('flashcards', scope, { cards, label, idx, revealed, points, rated, nextDays })
  }, [scope, cards, label, idx, revealed, points, rated, nextDays])

  const closeSession = useCallback(() => {
    const id = session.current.id
    session.current = { id: null, pending: null }
    if (id) void endFlashcardSession(id).then(() => refreshMyPoints())
  }, [])

  // Quitter la page (fermeture d'onglet comprise) : on clôt la session ouverte.
  useEffect(() => {
    const onHide = () => closeSession()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      closeSession()
    }
  }, [closeSession])

  const ensureSession = async () => {
    if (session.current.id) return session.current.id
    if (!session.current.pending) session.current.pending = startFlashcardSession(chapterId)
    const id = await session.current.pending
    session.current.id = id
    return id
  }

  const total = cards?.length ?? 0
  const done = cards !== null && total > 0 && idx >= total
  const card = cards && idx < total ? cards[idx] : null

  const reveal = useCallback(() => setRevealed(true), [])

  const rate = async (note: Note) => {
      if (!card || busy) return
      setBusy(true)
      setError(null)
      try {
        const sid = await ensureSession()
        const res = await reviewFlashcard(sid, card.id, note)
        setPoints((p) => p + res.points)
        setRated((r) => r + 1)
        setLastGain({ n: res.points, key: Date.now() })
        const d = daysUntil(res.due_date)
        setNextDays((prev) => (prev == null ? d : Math.min(prev, d)))
        setRevealed(false)
        const nextIdx = idx + 1
        setIdx(nextIdx)
        if (nextIdx >= total) closeSession()
        else void refreshMyPoints()
      } catch {
        setError('Ta réponse n’a pas été enregistrée. Réessaie.')
      } finally {
        setBusy(false)
      }
  }

  /** Recharge une file (ex. d'autres nouvelles cartes du chapitre) ; nouvelle session au prochain vote. */
  const restart = useCallback(() => {
    clearResume('flashcards')
    closeSession()
    setPoints(0)
    setRated(0)
    setLastGain(null)
    setNextDays(null)
    void load()
  }, [closeSession, load])

  /** Quitter volontairement : la file ne sera pas reprise. */
  const quit = useCallback(() => {
    clearResume('flashcards')
    closeSession()
  }, [closeSession])

  return { cards, label, card, idx, total, done, revealed, points, rated, lastGain, nextDays, busy, error, reveal, rate, restart, quit }
}

/** Raccourcis clavier (ordinateur) : Espace / Entrée pour retourner, 1-2-3 pour noter. */
export function useRunKeys(run: Run, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (!run.card) return
      if (!run.revealed && (e.key === ' ' || e.key === 'Enter')) {
        if (t?.tagName === 'BUTTON' || t?.tagName === 'A') return
        e.preventDefault()
        run.reveal()
      } else if (run.revealed && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        void run.rate((['a_revoir', 'bien', 'facile'] as const)[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, enabled])
}
