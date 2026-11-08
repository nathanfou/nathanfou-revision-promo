// Flashcards (ordinateur). Maquette : docs/maquettes/Flashcards.dc.html. Chantier "Flashcards".
// Sans ?chapitre= : file du jour (cartes dues, toutes matières). Avec : cartes dues du chapitre
// puis nouvelles cartes.
import { useSearchParams } from 'react-router'
import { ErrorBanner } from '../components/Form'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { Button, ButtonLink, Card, EmptyState } from '../components/ui'
import { fmtInt, plural } from '../lib/format'
import { routes } from '../lib/routes'
import { POINTS } from '../lib/scoring'
import { nextReturn } from '../features/flashcards/labels'
import { CardStack, CardTags, Dashes, DoneLcd, GainBubble, QueueMeter, RateButtons } from '../features/flashcards/parts'
import { useFlashcardRun, useRunKeys } from '../features/flashcards/useFlashcardRun'
import { SessionLayout } from '../layouts/SessionLayout'

export default function Flashcards() {
  const [params] = useSearchParams()
  const chapterId = params.get('chapitre')
  const run = useFlashcardRun(chapterId)
  useRunKeys(run)

  const title = chapterId ? (run.label?.chapter ?? 'Flashcards') : 'File du jour'
  const subtitle = chapterId ? (run.label ? `Flashcards, ${run.label.subject}` : 'Flashcards') : 'Flashcards, toutes matières'
  const { card, total, idx } = run

  return (
    <SessionLayout title={title} subtitle={subtitle} pillLabel="File" points={run.points} onQuit={run.quit} maxWidth={780}>
      {run.cards === null ? (
        <InlineLoader label="Chargement des cartes…" />
      ) : total === 0 ? (
        <Card className="rise">
          {run.error ? (
            <EmptyState title="Oups" action={<Button variant="ghost" onClick={run.restart}>Réessayer</Button>}>{run.error}</EmptyState>
          ) : (
            <EmptyState title={chapterId ? 'Aucune carte à travailler ici' : 'Rien à revoir aujourd’hui'} action={<ButtonLink to={routes.home}>Retour à Révision</ButtonLink>}>
              {chapterId
                ? 'Toutes les cartes de ce chapitre sont programmées pour plus tard, ou il n’y en a pas encore.'
                : 'Aucune carte n’arrive à échéance aujourd’hui. Lance de nouvelles cartes depuis un chapitre de la page Révision.'}
            </EmptyState>
          )}
        </Card>
      ) : (
        <>
          <div className="rise" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 18px' }}>
            <QueueMeter value={Math.min(idx, total) / total} />
            <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>
              {run.done ? `${plural(total, 'carte')} sur ${fmtInt(total)}` : `Carte ${idx + 1} sur ${total}`}
            </span>
          </div>

          {run.error && <ErrorBanner>{run.error}</ErrorBanner>}

          {card && (
            <>
              <CardStack style={{ animationDelay: '80ms' }}>
                <section
                  key={card.id}
                  aria-labelledby="t-card"
                  className="popin"
                  style={{ position: 'relative', padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 22, minHeight: 380, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: '0 1px 2px rgba(120,60,20,0.06), 0 26px 50px -30px rgba(120,60,20,0.45)' }}
                >
                  <CardTags card={card} />
                  <h1 id="t-card" style={{ margin: 0, fontSize: 30, lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'pre-line' }}>{card.recto}</h1>
                  {!run.revealed ? (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Button size="lg" onClick={run.reveal} aria-keyshortcuts="Space" style={{ fontSize: 17, padding: '15px 30px' }}>
                        <Icon name="flip" size={18} strokeWidth={2} />
                        Retourner la carte
                      </Button>
                      <span style={{ fontSize: 13, color: 'var(--faint)' }}>Espace pour retourner, puis 1, 2 ou 3 pour noter</span>
                    </div>
                  ) : (
                    <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                      <Dashes />
                      <p style={{ margin: 0, fontSize: 19, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{card.verso}</p>
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Tu la connaissais ?</p>
                        <RateButtons card={card} onRate={(n) => void run.rate(n)} disabled={run.busy} shortcuts />
                      </div>
                    </div>
                  )}
                </section>
                <GainBubble gain={run.revealed ? null : run.lastGain} />
              </CardStack>
              <p className="rise" style={{ animationDelay: '160ms', margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
                {POINTS.flashcard} pts par carte, quelle que soit ta réponse. Révision espacée : paliers de 1, 3, 7 et 14 jours.
              </p>
            </>
          )}

          {run.done && (
            <Card as="section" className="popin" aria-labelledby="t-done" padding={36} radius={24} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <DoneLcd value={`${run.rated}/${total}`} />
              <h1 id="t-done" style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {chapterId ? 'Série terminée' : 'File du jour terminée'}
              </h1>
              <p style={{ margin: 0, fontSize: 16, color: 'var(--muted)' }}>
                +{fmtInt(run.points)} pts. {nextReturn(run.nextDays)}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 6 }}>
                <ButtonLink to={routes.home} size="lg">Retour à Révision</ButtonLink>
                {chapterId && (
                  <Button variant="ghost" size="lg" onClick={run.restart}>D’autres cartes du chapitre</Button>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </SessionLayout>
  )
}
