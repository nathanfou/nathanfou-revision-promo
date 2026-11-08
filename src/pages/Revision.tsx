// Page Révision (accueil). Maquette : docs/maquettes/Main.dc.html. Chantier A.
// Le "Défi de la semaine" (v2) reste masqué tant que la gamification n'existe pas.
import { useMe } from '../auth/AuthProvider'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { Button, Card, EmptyState, PageTitle } from '../components/ui'
import { DueCardsCard, ExamCard, RedoCard, ResumeCard } from '../features/revision/Cards'
import { Navigator } from '../features/revision/Navigator'
import { examLabel, useRevisionData, type ExamInfo } from '../features/revision/useRevisionData'
import { daysUntil, fmtLongDate, greeting } from '../lib/format'

const row = { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' } as const

function examSentence(exam: ExamInfo | undefined) {
  if (!exam) return ''
  const d = daysUntil(exam.date)
  const when = d <= 0 ? 'aujourd’hui' : d === 1 ? 'demain' : `dans ${d} jours`
  return ` Prochain contrôle ${when} : ${examLabel(exam)}.`
}

export default function Revision() {
  const me = useMe()
  const { state, reload } = useRevisionData()

  if (state.status === 'loading') {
    return (
      <>
        <PageTitle title={`${greeting()}, ${me.pseudo}`} subtitle={`${fmtLongDate()}.`} />
        <InlineLoader />
      </>
    )
  }
  if (state.status === 'error') {
    return (
      <>
        <PageTitle title={`${greeting()}, ${me.pseudo}`} subtitle={`${fmtLongDate()}.`} />
        <Card>
          <EmptyState title="Impossible de charger la page" action={<Button variant="ghost" onClick={reload}>Réessayer</Button>}>
            {state.message}
          </EmptyState>
        </Card>
      </>
    )
  }

  const { subjects, exams, lastSession, redo, dueTotal } = state.data
  const resumeChapter = lastSession?.chapterId ? subjects.flatMap((s) => s.chapters).find((c) => c.id === lastSession.chapterId) : undefined

  return (
    <>
      <PageTitle title={`${greeting()}, ${me.pseudo}`} subtitle={`${fmtLongDate()}.${examSentence(exams[0])}`} />

      <div style={row}>
        <ResumeCard session={lastSession} />
        <ExamCard exams={exams} />
      </div>

      <div style={row}>
        <DueCardsCard subjects={subjects} dueTotal={dueTotal} />
        <RedoCard items={redo} />
      </div>

      <Navigator subjects={subjects} initialSubjectId={resumeChapter?.subjectId} initialChapterId={resumeChapter?.id} />

      <footer style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4, fontSize: 14, color: 'var(--muted)' }}>
        <Icon name="phone" size={18} />
        <p style={{ margin: 0 }}>Sur téléphone, seules les flashcards sont accessibles. Les points sont calculés par le serveur.</p>
      </footer>
    </>
  )
}
