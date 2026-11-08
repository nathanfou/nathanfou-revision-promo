// Écran d'un exercice : énoncé, minuteur indicatif, correction révélée à la demande,
// auto-évaluation (Réussi / Partiel / À refaire), points gagnés, exercice suivant.
// Maquette : docs/maquettes/Exercice.dc.html.
//
// Une session "exo" est ouverte au premier "Valider" (pas de session vide si on ne fait
// que regarder l'énoncé) et close en quittant l'écran.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { Button, ButtonLink, Card, Chip, EmptyState } from '../../components/ui'
import { ErrorBanner } from '../../components/Form'
import { Icon } from '../../components/Icons'
import { InlineLoader } from '../../components/Loader'
import { lcdScreenStyle, LcdLabel } from '../../components/Lcd'
import { SessionLayout } from '../../layouts/SessionLayout'
import { fmtInt } from '../../lib/format'
import { refreshMyPoints } from '../../lib/points'
import { routes } from '../../lib/routes'
import { POINTS } from '../../lib/scoring'
import {
  endExoSession,
  loadChapter,
  loadChapterExercises,
  loadCorrection,
  loadExercise,
  loadLastResults,
  loadTodo,
  startExoSession,
  submitExercise,
  type ChapterInfo,
  type ExerciseLite,
  type ExoResult,
  type LastResult,
  type SubmitResult,
} from './api'
import { fmtChrono, useChrono } from './Chrono'
import { RichText } from './RichText'
import { correctionSteps } from './text'

type Loaded = {
  exercise: ExerciseLite
  chapter: ChapterInfo | null
  nextId: string | null
  todo: boolean
  last: LastResult | null
}

const OPTIONS: { id: ExoResult; label: string; hint: string; pts: (d: number) => number }[] = [
  { id: 'reussi', label: 'Réussi', hint: 'Tout est juste, ou presque.', pts: POINTS.exercise },
  { id: 'partiel', label: 'Partiel', hint: 'Une partie juste, des oublis.', pts: POINTS.exercisePartial },
  { id: 'a_refaire', label: 'À refaire', hint: 'Il faut le retravailler.', pts: POINTS.exerciseRedo },
]

const sectionStyle: CSSProperties = { padding: 28, display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 22 }

function resultText(r: SubmitResult): string {
  if (r.points === 0) {
    const tail = r.resultat === 'reussi' ? 'Il sort de ta liste à refaire.' : 'Il reste dans ta liste à refaire.'
    return `Tu as déjà gagné des points sur cet exercice aujourd’hui, celui-ci n’en rapporte pas de plus. ${tail}`
  }
  if (r.resultat === 'reussi') return `Bravo, ${fmtInt(r.points)} pts ajoutés. L’exercice sort de ta liste à refaire.`
  if (r.resultat === 'partiel') return `${fmtInt(r.points)} pts ajoutés, la moitié des points de l’exercice. Il passe dans ta liste à refaire.`
  return `${fmtInt(r.points)} pts ajoutés. L’exercice reste dans ta liste à refaire.`
}

export function ExerciceScreen({ exerciseId }: { exerciseId: string }) {
  const navigate = useNavigate()
  const [data, setData] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [revealed, setRevealed] = useState(false)
  const [correction, setCorrection] = useState<string | null>(null)
  const [corrLoading, setCorrLoading] = useState(false)
  const [choice, setChoice] = useState<ExoResult | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [validated, setValidated] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chrono = useChrono()

  const sessionRef = useRef<string | null>(null)
  const sessionStart = useRef<Promise<string> | null>(null)

  // Chargement de l'exercice (sans la correction).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const exercise = await loadExercise(exerciseId)
        if (!alive) return
        if (!exercise) {
          setNotFound(true)
          return
        }
        const [chapter, list, todo, last] = await Promise.all([
          loadChapter(exercise.chapter_id),
          loadChapterExercises(exercise.chapter_id),
          loadTodo([exercise.id]),
          loadLastResults([exercise.id]),
        ])
        if (!alive) return
        const idx = list.findIndex((e) => e.id === exercise.id)
        const nextId = idx >= 0 ? (list[idx + 1]?.id ?? null) : null
        setData({ exercise, chapter, nextId, todo: todo.has(exercise.id), last: last.get(exercise.id) ?? null })
      } catch {
        if (alive) setLoadError('Impossible de charger l’exercice. Vérifie ta connexion et réessaie.')
      }
    })()
    return () => {
      alive = false
    }
  }, [exerciseId])

  // Clôture de la session en quittant l'écran (Quitter, exercice suivant, navigation).
  useEffect(
    () => () => {
      const id = sessionRef.current
      if (id) void endExoSession(id)
    },
    [],
  )

  if (notFound) {
    return (
      <SessionLayout title="Exercice">
        <Card className="rise">
          <EmptyState title="Exercice introuvable" action={<ButtonLink to={routes.home} variant="ghost">Retour à Révision</ButtonLink>}>
            Il a peut-être été retiré ou n’est pas encore publié.
          </EmptyState>
        </Card>
      </SessionLayout>
    )
  }
  if (loadError) {
    return (
      <SessionLayout title="Exercice">
        <ErrorBanner>{loadError}</ErrorBanner>
      </SessionLayout>
    )
  }
  if (!data) {
    return (
      <SessionLayout title="Exercice">
        <InlineLoader />
      </SessionLayout>
    )
  }

  const { exercise, chapter, nextId, last } = data
  const duree = exercise.duree_min
  const todo = result ? result.a_refaire : data.todo
  const alreadyPaid = last?.pointsToday ?? false

  async function reveal() {
    setRevealed(true)
    chrono.stop()
    if (correction !== null) return
    setCorrLoading(true)
    setError(null)
    try {
      setCorrection(await loadCorrection(exercise.id))
    } catch {
      setError('Impossible de charger la correction. Réessaie dans un instant.')
      setRevealed(false)
    } finally {
      setCorrLoading(false)
    }
  }

  async function ensureSession(): Promise<string> {
    if (sessionRef.current) return sessionRef.current
    if (!sessionStart.current) {
      sessionStart.current = startExoSession(exercise.chapter_id).then((id) => {
        sessionRef.current = id
        return id
      })
      sessionStart.current.catch(() => {
        sessionStart.current = null
      })
    }
    return sessionStart.current
  }

  async function validate() {
    if (!choice || sending) return
    setSending(true)
    setError(null)
    try {
      const sid = await ensureSession()
      const r = await submitExercise(sid, exercise.id, choice)
      setResult(r)
      setValidated(true)
      void refreshMyPoints()
    } catch {
      setError('Ta déclaration n’a pas pu être enregistrée. Réessaie.')
    } finally {
      setSending(false)
    }
  }

  const chapterTitle = chapter?.nom ?? 'Exercice'
  const quitTo = routes.exercises(exercise.chapter_id)
  const steps = correction ? correctionSteps(correction) : null

  return (
    <SessionLayout
      title={chapterTitle}
      subtitle={chapter?.subjectNom ? `${chapter.subjectNom}, exercice` : 'Exercice'}
      pillLabel="Exercice"
      points={result?.session_points ?? 0}
      quitTo={quitTo}
      maxWidth={1200}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        {/* ------------------------------------------------ Énoncé */}
        <Card as="section" className="rise" aria-labelledby="t-ex" radius={22} padding={30} style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Chip>{duree} min</Chip>
            <Chip tone="accent">{fmtInt(POINTS.exercise(duree))} pts si réussi</Chip>
            {todo && <Chip>À refaire</Chip>}
            {!todo && last?.resultat === 'reussi' && !result && <Chip tone="ok">Déjà réussi</Chip>}
          </div>
          <h1 id="t-ex" style={{ margin: 0, fontSize: 30, lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.02em' }}>
            {exercise.titre}
          </h1>
          <RichText text={exercise.enonce} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14, backgroundColor: 'var(--card-tint)', border: '1px dashed var(--border-strong)' }}>
            <Icon name="pencil" size={20} strokeWidth={1.75} style={{ flex: '0 0 auto', marginTop: 1, color: 'var(--link)' }} />
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-2)' }}>
              Fais l’exercice sur papier, puis affiche la correction et compare avec tes réponses.
            </p>
          </div>
        </Card>

        <div style={{ flex: '1 1 500px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {error && <ErrorBanner>{error}</ErrorBanner>}

          {/* ------------------------------------------------ Correction masquée + minuteur */}
          {!revealed && (
            <Card as="section" tone="ink" className="rise" aria-label="Correction masquée" radius={22} padding={28} style={{ animationDelay: '80ms', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
              <div style={{ ...lcdScreenStyle, padding: '10px 18px 8px' }}>
                <LcdLabel>DURÉE ESTIMÉE</LcdLabel>
                <div className="lcd" style={{ fontSize: 56, lineHeight: 1 }}>{duree} MIN</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Temps écoulé</span>
                <span className="lcd tabnum" role="timer" aria-live="off" style={{ fontSize: 22, color: 'var(--caramel)' }}>
                  {fmtChrono(chrono.elapsed)}
                </span>
                <button
                  type="button"
                  onClick={chrono.toggle}
                  className="btn"
                  style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(251,233,215,0.25)', backgroundColor: 'transparent', color: 'var(--ink-text)', fontSize: 13 }}
                >
                  {chrono.running ? 'Pause' : 'Reprendre'}
                </button>
              </div>
              {chrono.elapsed > duree * 60 && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--caramel)' }}>Durée estimée dépassée, ce n’est qu’un repère.</p>
              )}
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)' }}>
                Prends ton temps. La correction reste masquée tant que tu ne la demandes pas.
              </p>
              <Button size="lg" onClick={reveal}>Afficher la correction</Button>
            </Card>
          )}

          {revealed && (
            <>
              {/* ------------------------------------------------ Correction */}
              <Card as="section" className="reveal" aria-labelledby="t-cor" radius={22} padding={28} style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h2 id="t-cor" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Correction</h2>
                  <Button variant="ghost" size="sm" onClick={() => setRevealed(false)}>Masquer</Button>
                </div>
                {corrLoading && <InlineLoader label="Chargement de la correction…" />}
                {correction !== null && steps && (
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {steps.map((s, i) => (
                      <li key={i} style={{ display: 'flex', gap: 12 }}>
                        <span aria-hidden="true" className="lcd" style={{ flex: '0 0 26px', width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 8, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontSize: 14 }}>
                          {i + 1}
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: 15, lineHeight: 1.55 }}>{s}</p>
                      </li>
                    ))}
                  </ol>
                )}
                {correction !== null && !steps && <RichText text={correction} size={15} />}
              </Card>

              {/* ------------------------------------------------ Auto-évaluation */}
              {correction !== null && (
                <Card as="section" className="reveal" aria-labelledby="t-eval" radius={22} padding={28} style={{ ...sectionStyle, gap: 14, animationDelay: '120ms' }}>
                  <h2 id="t-eval" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Comment ça s’est passé ?</h2>
                  {!validated && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {alreadyPaid && (
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                          Tu as déjà gagné des points sur cet exercice aujourd’hui : une nouvelle déclaration met à jour ta liste à refaire, sans points en plus.
                        </p>
                      )}
                      <div role="radiogroup" aria-labelledby="t-eval" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                        {OPTIONS.map((o) => {
                          const sel = o.id === choice
                          return (
                            <button
                              key={o.id}
                              type="button"
                              className="opt"
                              role="radio"
                              aria-checked={sel}
                              onClick={() => setChoice(o.id)}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 14, borderRadius: 16, textAlign: 'left', color: 'var(--text)', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: sel ? 'var(--chip-strong)' : 'var(--card)' }}
                            >
                              <span style={{ fontSize: 16, fontWeight: 600 }}>{o.label}</span>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, color: 'var(--link)' }}>+{fmtInt(o.pts(duree))} pts</span>
                              <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--muted)' }}>{o.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                      <Button size="lg" onClick={validate} disabled={!choice || sending} style={{ alignSelf: 'flex-start' }}>
                        {sending ? 'Enregistrement…' : 'Valider'}
                      </Button>
                    </div>
                  )}
                  {validated && result && (
                    <div className="popin" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, backgroundColor: 'var(--chip-strong)' }}>
                        <span style={{ flex: '0 0 auto', padding: '4px 12px', borderRadius: 999, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500 }}>
                          +{fmtInt(result.points)} pts
                        </span>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{resultText(result)}</p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        {nextId ? (
                          <Button size="lg" onClick={() => navigate(routes.exercise(nextId))}>
                            Exercice suivant
                            <Icon name="arrowRight" size={18} strokeWidth={2} />
                          </Button>
                        ) : (
                          <ButtonLink size="lg" to={routes.home}>Retour à Révision</ButtonLink>
                        )}
                        <ButtonLink size="md" variant="ghost" to={quitTo}>Tous les exercices</ButtonLink>
                        <Button size="md" variant="ghost" onClick={() => setValidated(false)}>Changer d’avis</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </SessionLayout>
  )
}
