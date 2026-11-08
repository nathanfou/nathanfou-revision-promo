// QCM. Maquette : docs/maquettes/Qcm.dc.html. Chantier "QCM".
// Entraînement : correction et explication après chaque question.
// Examen : réponses enregistrées sans correction, tout est révélé au bilan.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorBanner } from '../components/Form'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { PixelMeter } from '../components/Meter'
import { Button, ButtonLink, Card, EmptyState } from '../components/ui'
import {
  describeChoices,
  endSession,
  errorMessage,
  fetchChapter,
  fetchQuestions,
  fetchReview,
  letter,
  startQcmSession,
  submitAnswer,
  type QcmCorrection,
  type QcmQuestion,
  type Variante,
} from '../features/qcm/api'
import { ChoiceButton, type ChoiceState } from '../features/qcm/ChoiceButton'
import { SessionLayout } from '../layouts/SessionLayout'
import { refreshMyPoints } from '../lib/points'
import { routes } from '../lib/routes'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty'; reprise: boolean }
  | { status: 'ready'; sessionId: string; questions: QcmQuestion[] }

export default function Qcm() {
  const { chapterId = '' } = useParams()
  const [params] = useSearchParams()
  const variante: Variante = params.get('variante') === 'examen' ? 'examen' : 'entrainement'
  const reprise = params.get('reprise')
  const location = useLocation()
  const navigate = useNavigate()

  const [chapter, setChapter] = useState<{ nom: string; matiere: string } | null>(null)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [correction, setCorrection] = useState<QcmCorrection | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [answered, setAnswered] = useState(0)
  const sessionRef = useRef<string | null>(null)
  const finishedRef = useRef(false)
  // Une seule session par visite (StrictMode rejoue les effets en développement).
  const startedFor = useRef<string | null>(null)

  useEffect(() => {
    const key = `${location.key}|${chapterId}|${variante}|${reprise ?? ''}`
    if (startedFor.current === key) return
    startedFor.current = key
    sessionRef.current = null
    finishedRef.current = false
    setLoad({ status: 'loading' })
    setIndex(0)
    setSelected([])
    setCorrection(null)
    setPoints(0)
    setAnswered(0)
    setError(null)
    ;(async () => {
      try {
        const ch = await fetchChapter(chapterId)
        if (!ch) {
          setLoad({ status: 'error', message: 'Ce chapitre n’existe pas.' })
          return
        }
        setChapter(ch)
        let ids: string[] | undefined
        if (reprise) {
          const review = await fetchReview(reprise)
          ids = review.reponses.filter((r) => !r.correct).map((r) => r.question_id)
          if (ids.length === 0) {
            setLoad({ status: 'empty', reprise: true })
            return
          }
        }
        const questions = await fetchQuestions(chapterId, ids)
        if (questions.length === 0) {
          setLoad({ status: 'empty', reprise: false })
          return
        }
        const sessionId = await startQcmSession(chapterId, variante)
        sessionRef.current = sessionId
        setLoad({ status: 'ready', sessionId, questions })
      } catch (e) {
        setLoad({ status: 'error', message: errorMessage(e, 'Impossible de charger les questions.') })
      }
    })()
  }, [chapterId, variante, reprise, location.key])

  const quit = useCallback(() => {
    const id = sessionRef.current
    if (id && !finishedRef.current) {
      finishedRef.current = true
      void endSession(id).catch(() => {})
    }
  }, [])

  const questions = load.status === 'ready' ? load.questions : []
  const q = questions[index] as QcmQuestion | undefined
  const isLast = index === questions.length - 1
  const isExam = variante === 'examen'
  const revealed = correction !== null

  const finish = useCallback(async () => {
    const id = sessionRef.current
    if (!id) return
    setBusy(true)
    try {
      if (!finishedRef.current) {
        await endSession(id)
        finishedRef.current = true
      }
      void refreshMyPoints()
      navigate(routes.qcmResult(id), { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Impossible de terminer la série.'))
      setBusy(false)
    }
  }, [navigate])

  const next = useCallback(() => {
    if (isLast) {
      void finish()
      return
    }
    setIndex((i) => i + 1)
    setSelected([])
    setCorrection(null)
    setError(null)
  }, [isLast, finish])

  const submit = useCallback(
    async (choix: string[]) => {
      const id = sessionRef.current
      if (!id || !q || busy || choix.length === 0) return
      setBusy(true)
      setError(null)
      try {
        const res = await submitAnswer(id, q.id, choix)
        setAnswered((n) => n + 1)
        if ('correct' in res) {
          setCorrection(res)
          if (res.points > 0) {
            setPoints((p) => p + res.points)
            void refreshMyPoints()
          }
          setBusy(false)
        } else if (isLast) {
          await finish()
        } else {
          setBusy(false)
          next()
        }
      } catch (e) {
        setError(errorMessage(e, 'Ta réponse n’a pas pu être envoyée. Réessaie.'))
        setBusy(false)
      }
    },
    [q, busy, isLast, finish, next],
  )

  const pick = useCallback(
    (l: string) => {
      if (!q || revealed || busy) return
      if (q.multiple) {
        setSelected((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l].sort()))
      } else if (isExam) {
        setSelected([l])
      } else {
        setSelected([l])
        void submit([l])
      }
    },
    [q, revealed, busy, isExam, submit],
  )

  // Clavier : A-D ou 1-4 pour choisir, Entrée pour valider / passer à la suite.
  useEffect(() => {
    if (!q) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const k = e.key.toUpperCase()
      let i = -1
      if (/^[A-H]$/.test(k)) i = k.charCodeAt(0) - 65
      else if (/^[1-8]$/.test(k)) i = Number(k) - 1
      if (i >= 0 && i < q.choix.length) {
        e.preventDefault()
        pick(letter(i))
      } else if (e.key === 'Enter' && target?.tagName !== 'BUTTON' && target?.tagName !== 'A') {
        if (revealed) next()
        else if (selected.length && (q.multiple || isExam)) void submit(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, pick, revealed, next, selected, isExam, submit])

  const title = chapter?.nom ?? 'QCM'
  const subtitle = chapter ? `${chapter.matiere}, QCM ${isExam ? 'examen' : 'entraînement'}${reprise ? ' (tes erreurs)' : ''}` : undefined

  return (
    <SessionLayout title={title} subtitle={subtitle} points={isExam ? undefined : points} onQuit={quit} maxWidth={860}>
      {load.status === 'loading' && <InlineLoader label="Préparation de la série…" />}

      {load.status === 'error' && (
        <Card>
          <EmptyState title="Impossible de lancer la série" action={<ButtonLink to={routes.home} variant="ghost">Retour aux matières</ButtonLink>}>
            {load.message}
          </EmptyState>
        </Card>
      )}

      {load.status === 'empty' && (
        <Card className="rise">
          {load.reprise ? (
            <EmptyState title="Aucune erreur à refaire" action={<ButtonLink to={routes.qcm(chapterId, 'entrainement')}>Lancer une nouvelle série</ButtonLink>}>
              Tu as tout juste sur cette série. Bravo !
            </EmptyState>
          ) : (
            <EmptyState title="Pas encore de QCM dans ce chapitre" action={<ButtonLink to={routes.home} variant="ghost">Retour aux matières</ButtonLink>}>
              Les questions arrivent bientôt. En attendant, essaie les flashcards ou les exercices.
            </EmptyState>
          )}
        </Card>
      )}

      {load.status === 'ready' && q && (
        <>
          <div className="rise" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 18px' }}>
            <div style={{ flex: '1 1 360px', display: 'flex' }}>
              <PixelMeter value={(index + (revealed ? 1 : 0)) / questions.length} segments={Math.max(questions.length, 5)} />
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500 }}>
              Question {index + 1} sur {questions.length}
            </span>
          </div>

          <Card key={q.id} className="rise" aria-labelledby="t-q" padding={32} radius={22} style={{ animationDelay: '80ms', display: 'flex', flexDirection: 'column', gap: 22, boxShadow: 'var(--shadow-pop)' }}>
            <h1 id="t-q" style={{ margin: 0, fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'pre-line' }}>
              {q.enonce}
            </h1>
            <div role="group" aria-labelledby="t-q" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.choix.map((text, i) => {
                const l = letter(i)
                const isSel = selected.includes(l)
                let state: ChoiceState = isSel ? 'selected' : 'idle'
                if (correction) {
                  const good = correction.bonnes_reponses.includes(l)
                  state = good ? 'ok' : isSel ? 'ko' : 'done'
                }
                return <ChoiceButton key={l} letter={l} text={text} state={state} checkbox={q.multiple} disabled={revealed || busy} onClick={() => pick(l)} />
              })}
            </div>

            {!revealed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                  {q.multiple ? 'Plusieurs réponses possibles : coche-les toutes, puis valide.' : isExam ? 'Choisis une réponse, puis valide. Les corrections arrivent au bilan.' : 'Choisis une réponse : la correction s’affiche juste après.'}
                </p>
                {(q.multiple || isExam) && (
                  <Button onClick={() => void submit(selected)} disabled={busy || selected.length === 0}>
                    {busy ? 'Envoi…' : isExam ? (isLast ? 'Valider et voir le bilan' : 'Valider') : 'Valider'}
                    {!busy && <Icon name="arrowRight" size={16} strokeWidth={2} />}
                  </Button>
                )}
              </div>
            )}
            {isExam && answered > 0 && !revealed && (
              <p aria-live="polite" style={{ margin: 0, fontSize: 13, color: 'var(--faint)' }}>
                {answered} réponse{answered > 1 ? 's' : ''} enregistrée{answered > 1 ? 's' : ''}.
              </p>
            )}
          </Card>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          {correction && <Feedback correction={correction} question={q} isLast={isLast} busy={busy} onNext={next} />}
        </>
      )}
    </SessionLayout>
  )
}

function Feedback({ correction, question, isLast, busy, onNext }: { correction: QcmCorrection; question: QcmQuestion; isLast: boolean; busy: boolean; onNext: () => void }) {
  const ok = correction.correct
  const plural = correction.bonnes_reponses.length > 1
  const ptsLabel = correction.points > 0 ? `+${correction.points} pts` : ok ? '0 pt, déjà compté aujourd’hui' : '0 pt'
  return (
    <section
      className="reveal"
      aria-live="polite"
      style={{
        position: 'relative',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRadius: 20,
        ...(ok ? { backgroundColor: 'var(--ok-bg)', border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)' } : { backgroundColor: 'var(--ko-bg)', border: '1px solid var(--ko-border)' }),
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: ok ? 'var(--ok)' : 'var(--ko)' }}>{ok ? 'Bonne réponse' : 'Pas tout à fait'}</h2>
        <span
          className="floatup"
          style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, ...(correction.points > 0 ? { backgroundColor: 'var(--ok)', color: 'var(--accent-text)' } : { backgroundColor: 'var(--card)', color: ok ? 'var(--ok)' : 'var(--ko)' }) }}
        >
          {ptsLabel}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
        {plural ? 'Bonnes réponses' : 'Bonne réponse'} : {describeChoices(correction.bonnes_reponses, question.choix)}
      </p>
      {correction.explication && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{correction.explication}</p>}
      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Une même question rapporte des points une fois par jour.</span>
        <Button autoFocus size="lg" onClick={onNext} disabled={busy} style={{ padding: '13px 24px' }}>
          {isLast ? (busy ? 'Bilan…' : 'Voir le bilan') : 'Question suivante'}
          {!isLast && <Icon name="arrowRight" size={16} strokeWidth={2} />}
        </Button>
      </div>
    </section>
  )
}
