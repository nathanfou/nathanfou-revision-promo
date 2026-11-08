// Liste des exercices d'un chapitre : durée, points, statut (à refaire, réussi…).
// La correction n'est pas chargée ici.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ButtonLink, Card, Chip, EmptyState } from '../../components/ui'
import { ErrorBanner } from '../../components/Form'
import { Icon } from '../../components/Icons'
import { InlineLoader } from '../../components/Loader'
import { LcdStrip } from '../../components/Lcd'
import { SessionLayout } from '../../layouts/SessionLayout'
import { fmtInt, fmtShortDate, plural } from '../../lib/format'
import { routes } from '../../lib/routes'
import { POINTS } from '../../lib/scoring'
import { loadChapter, loadChapterExercises, loadLastResults, loadTodo, type ChapterInfo, type ExerciseLite, type LastResult } from './api'

type Loaded = { chapter: ChapterInfo | null; exercises: ExerciseLite[]; todo: Set<string>; last: Map<string, LastResult> }

const LAST_LABEL: Record<LastResult['resultat'], string> = { reussi: 'Réussi', partiel: 'Partiel', a_refaire: 'À refaire' }

export function ExercicesList({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [chapter, exercises] = await Promise.all([loadChapter(chapterId), loadChapterExercises(chapterId)])
        const ids = exercises.map((e) => e.id)
        const [todo, last] = await Promise.all([loadTodo(ids), loadLastResults(ids)])
        if (alive) setData({ chapter, exercises, todo, last })
      } catch {
        if (alive) setError('Impossible de charger les exercices. Vérifie ta connexion et réessaie.')
      }
    })()
    return () => {
      alive = false
    }
  }, [chapterId])

  const title = data?.chapter?.nom ?? 'Exercices'
  const subtitle = data?.chapter?.subjectNom ? `${data.chapter.subjectNom}, exercices` : 'Exercices'

  if (error) {
    return (
      <SessionLayout title={title} subtitle={subtitle}>
        <ErrorBanner>{error}</ErrorBanner>
      </SessionLayout>
    )
  }
  if (!data) {
    return (
      <SessionLayout title={title} subtitle={subtitle}>
        <InlineLoader />
      </SessionLayout>
    )
  }
  if (!data.chapter) {
    return (
      <SessionLayout title="Exercices">
        <Card className="rise">
          <EmptyState title="Chapitre introuvable" action={<ButtonLink to={routes.home} variant="ghost">Retour à Révision</ButtonLink>} />
        </Card>
      </SessionLayout>
    )
  }

  const { exercises, todo, last } = data
  const done = exercises.filter((e) => last.get(e.id)?.resultat === 'reussi' && !todo.has(e.id)).length
  const toRedo = exercises.filter((e) => todo.has(e.id)).length
  const totalMin = exercises.reduce((s, e) => s + e.duree_min, 0)
  // Premier exercice conseillé : un exercice à refaire, sinon le premier jamais fait.
  const suggested = exercises.find((e) => todo.has(e.id)) ?? exercises.find((e) => !last.has(e.id)) ?? exercises[0]

  return (
    <SessionLayout title={title} subtitle={subtitle} maxWidth={960}>
      <div className="rise" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.025em' }}>Exercices</h1>
          <p style={{ margin: '10px 0 0', fontSize: 16, color: 'var(--muted)' }}>
            Fais-les sur papier, affiche la correction, puis dis comment ça s’est passé.
          </p>
        </div>
        {exercises.length > 0 && (
          <Card tone="ink" padding={8} radius={14}>
            <LcdStrip
              size={30}
              items={[
                { label: 'RÉUSSIS', value: `${done}/${exercises.length}` },
                { label: 'À REFAIRE', value: toRedo },
                { label: 'MINUTES', value: totalMin },
              ]}
            />
          </Card>
        )}
      </div>

      {exercises.length === 0 ? (
        <Card className="rise">
          <EmptyState title="Pas encore d’exercice" action={<ButtonLink to={routes.home} variant="ghost">Retour à Révision</ButtonLink>}>
            Aucun exercice n’est publié pour ce chapitre pour l’instant.
          </EmptyState>
        </Card>
      ) : (
        <Card className="rise" padding={8} radius={22} style={{ animationDelay: '60ms' }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {exercises.map((e, i) => {
              const l = last.get(e.id)
              const isTodo = todo.has(e.id)
              return (
                <li key={e.id} style={{ borderTop: i ? '1px solid var(--border-soft)' : undefined }}>
                  <Link
                    to={routes.exercise(e.id)}
                    className="row"
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 16, color: 'inherit', textDecoration: 'none' }}
                  >
                    <span aria-hidden="true" className="lcd" style={{ flex: '0 0 34px', width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontSize: 16 }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{e.titre}</span>
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <Chip>{e.duree_min} min</Chip>
                        <Chip tone="accent">{fmtInt(POINTS.exercise(e.duree_min))} pts si réussi</Chip>
                        {isTodo && <Chip tone="ko">À refaire</Chip>}
                        {l && <Chip tone={l.resultat === 'reussi' && !isTodo ? 'ok' : 'outline'}>{LAST_LABEL[l.resultat]} le {fmtShortDate(l.created_at)}</Chip>}
                        {!l && <Chip tone="outline">Jamais fait</Chip>}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--link)', whiteSpace: 'nowrap' }}>
                      {suggested?.id === e.id ? 'Commencer' : l ? 'Refaire' : 'Ouvrir'}
                      <Icon name="chevronRight" size={18} strokeWidth={2} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      {exercises.length > 0 && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          {plural(exercises.length, 'exercice')} · Réussi = 100 % des points, Partiel = 50 %, À refaire = 25 %. Un exercice ne rapporte qu’une fois par jour.
        </p>
      )}
    </SessionLayout>
  )
}
