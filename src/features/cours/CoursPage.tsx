// Page Cours d'un chapitre : la fiche (Markdown du Labo, KaTeX, figures interactives) et,
// si le contenu vient d'un document partagé, un encart de remerciement.
import { useEffect, useState } from 'react'
import { ErrorBanner } from '../../components/Form'
import { InlineLoader } from '../../components/Loader'
import { ButtonLink, Card, EmptyState } from '../../components/ui'
import { SessionLayout } from '../../layouts/SessionLayout'
import { routes } from '../../lib/routes'
import { LaboText } from '../exercices/labo/LaboText'
import { loadCourse, type Course } from './api'
import { Remerciement } from './Remerciement'

type Loaded = { chapterNom: string; subjectNom: string; course: Course }

export function CoursPage({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadCourse(chapterId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError('Impossible de charger le cours. Vérifie ta connexion et réessaie.'))
    return () => {
      alive = false
    }
  }, [chapterId])

  const title = data?.chapterNom || 'Cours'
  const subtitle = data?.subjectNom ? `${data.subjectNom}, cours` : 'Cours'
  const back = <ButtonLink to={routes.home} variant="ghost">Retour à Révision</ButtonLink>

  return (
    <SessionLayout title={title} subtitle={subtitle} maxWidth={900}>
      {error ? (
        <ErrorBanner>{error}</ErrorBanner>
      ) : !data ? (
        <InlineLoader />
      ) : !data.course ? (
        <Card className="rise">
          <EmptyState title={data.chapterNom ? 'Pas encore de cours pour ce chapitre' : 'Chapitre introuvable'} action={back} />
        </Card>
      ) : (
        <>
          <div className="rise">
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.025em' }}>Cours</h1>
            <p style={{ margin: '10px 0 0', fontSize: 16, color: 'var(--muted)' }}>
              L’essentiel du chapitre, à relire avant les QCM et les exercices. Les figures sont interactives.
            </p>
          </div>
          {data.course.source && <Remerciement source={data.course.source} />}
          <Card className="rise" padding="28px 32px" style={{ animationDelay: '160ms' }}>
            <LaboText text={data.course.contenu} size={17} />
          </Card>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <ButtonLink to={routes.qcm(chapterId)}>S’entraîner en QCM</ButtonLink>
            <ButtonLink to={routes.flashcards(chapterId)} variant="ghost">Flashcards du chapitre</ButtonLink>
            <ButtonLink to={routes.exercises(chapterId)} variant="ghost">Exercices</ButtonLink>
          </div>
        </>
      )}
    </SessionLayout>
  )
}
