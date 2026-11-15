// Déroulé d'une file de cartes, commun à l'ordinateur et au téléphone.
// L'ordre des passages (découverte, retours après erreur, file rouge) vient de scheduler.ts.
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
import { endFlashcardSession, fetchChapterLabel, fetchQueue, NOTES, reviewFlashcard, startFlashcardSession, type Note, type QueueCard } from './api'
import { answer, current, discovered, isFinished, isSched, newSched, progress, type Phase, type Sched } from './scheduler'

/** Nouvelles cartes proposées dans une file de chapitre (la file du jour ne contient que les cartes dues). */
export const NEW_PER_CHAPTER = 20

export type Run = ReturnType<typeof useFlashcardRun>

/** Copie de la file gardée pour la reprise après rechargement. */
type Saved = {
  cards: QueueCard[]
  label: { chapter: string; subject: string } | null
  sched: Sched
  revealed: boolean
  points: number
  /** jours avant le retour de chaque carte notée */
  due: Record<string, number>
}

export function useFlashcardRun(chapterId: string | null) {
  const { session: auth } = useAuth()
  const location = useLocation()
  const scope = resumeScope(auth?.user.id, location.pathname, chapterId, location.key)

  const [cards, setCards] = useState<QueueCard[] | null>(null)
  const [label, setLabel] = useState<{ chapter: string; subject: string } | null>(null)
  const [sched, setSched] = useState<Sched | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [points, setPoints] = useState(0)
  const [due, setDue] = useState<Record<string, number>>({})
  const [lastGain, setLastGain] = useState<{ n: number; key: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const session = useRef<{ id: string | null; pending: Promise<string> | null }>({ id: null, pending: null })

  const load = useCallback(async () => {
    setError(null)
    const saved = loadResume<Saved>('flashcards', scope)
    if (saved && Array.isArray(saved.cards) && isSched(saved.sched) && !isFinished(saved.sched)) {
      setCards(saved.cards)
      setLabel(saved.label)
      setSched(saved.sched)
      setRevealed(saved.revealed)
      setPoints(saved.points)
      setDue(saved.due ?? {})
      return
    }
    setCards(null)
    setSched(null)
    setRevealed(false)
    try {
      const [q, l] = await Promise.all([
        fetchQueue(chapterId, chapterId ? NEW_PER_CHAPTER : 0),
        chapterId ? fetchChapterLabel(chapterId) : Promise.resolve(null),
      ])
      setCards(q)
      setSched(newSched(q.map((c) => c.id)))
      setLabel(l)
    } catch {
      setError('Impossible de charger les cartes. Vérifie ta connexion et réessaie.')
      setCards([])
      setSched(newSched([]))
    }
  }, [chapterId, scope])

  useEffect(() => {
    void load()
  }, [load])

  // Copie de la file à chaque changement, effacée quand la file est finie.
  useEffect(() => {
    if (!cards || cards.length === 0 || !sched) return
    if (isFinished(sched)) clearResume('flashcards')
    else saveResume<Saved>('flashcards', scope, { cards, label, sched, revealed, points, due })
  }, [scope, cards, label, sched, revealed, points, due])

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
  const done = cards !== null && total > 0 && !!sched && isFinished(sched)
  const currentId = sched ? current(sched) : null
  const card = (cards && currentId && cards.find((c) => c.id === currentId)) || null
  const phase: Phase = sched?.phase ?? 'decouverte'
  const track = currentId && sched ? sched.tracks[currentId] : null
  /** Nombre de passages déjà faits dans la série. */
  const answers = sched?.answers ?? 0
  /** Cartes validées (sorties de la série) et cartes déjà réussies en découverte. */
  const validated = sched?.done.length ?? 0
  const learned = sched ? discovered(sched) : 0
  const progressValue = sched ? (done ? 1 : progress(sched)) : 0
  const dueValues = Object.values(due)
  const nextDays = dueValues.length ? Math.min(...dueValues) : null

  const reveal = useCallback(() => setRevealed(true), [])

  const rate = async (note: Note) => {
      if (!card || !sched || busy) return
      setBusy(true)
      setError(null)
      try {
        const sid = await ensureSession()
        const res = await reviewFlashcard(sid, card.id, note)
        setPoints((p) => p + res.points)
        setLastGain({ n: res.points, key: Date.now() })
        setDue((d) => ({ ...d, [card.id]: daysUntil(res.due_date) }))
        // La carte peut revenir dans la série : ses échéances suivent le nouvel état.
        setCards((cs) => cs && cs.map((c) => (c.id === card.id ? { ...c, isNew: false, palier: res.palier, score: res.score, next: res.next } : c)))
        setRevealed(false)
        const next = answer(sched, note !== 'a_revoir')
        setSched(next)
        if (isFinished(next)) closeSession()
        else if (res.points > 0) void refreshMyPoints()
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
    setDue({})
    setLastGain(null)
    void load()
  }, [closeSession, load])

  /** Quitter volontairement : la file ne sera pas reprise. */
  const quit = useCallback(() => {
    clearResume('flashcards')
    closeSession()
  }, [closeSession])

  return {
    cards, label, card, total, done, phase, track, answers, validated, learned, progress: progressValue,
    revealed, points, lastGain, nextDays, busy, error, reveal, rate, restart, quit,
  }
}

/** Raccourcis clavier (ordinateur) : Espace / Entrée pour retourner, 1-2-3 (À revoir, Difficile, Bien) pour noter. */
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
        void run.rate(NOTES[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, enabled])
}
