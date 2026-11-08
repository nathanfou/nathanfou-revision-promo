// Carte en révision (téléphone). Maquette : docs/maquettes/MobileCarte.dc.html. Chantier "Flashcards".
// Même déroulé que l'écran ordinateur (useFlashcardRun), en plein écran tactile.
import { Link, useSearchParams } from 'react-router'
import { ErrorBanner } from '../components/Form'
import { Icon } from '../components/Icons'
import { LeafToggle } from '../components/Leaves'
import { InlineLoader } from '../components/Loader'
import { Button, ButtonLink, Card, EmptyState, roundButtonStyle } from '../components/ui'
import { nextReturn } from '../features/flashcards/labels'
import { CardStack, CardTags, Dashes, DoneLcd, GainBubble, QueueMeter, RateButtons } from '../features/flashcards/parts'
import { useFlashcardRun } from '../features/flashcards/useFlashcardRun'
import { fmtInt } from '../lib/format'
import { routes } from '../lib/routes'
import { MobileLayout } from '../layouts/MobileLayout'

export default function MobileCarte() {
  const [params] = useSearchParams()
  const chapterId = params.get('chapitre')
  const run = useFlashcardRun(chapterId)
  const { card, total, idx } = run
  const title = chapterId ? (run.label?.chapter ?? 'Flashcards') : 'File du jour'
  const counter = total === 0 ? '' : run.done ? `${total} sur ${total}` : `Carte ${idx + 1} sur ${total}`

  const header = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Link to={routes.home} onClick={run.quit} className="btn btn-ghost" aria-label="Quitter la file" style={roundButtonStyle}>
        <Icon name="close" size={18} strokeWidth={2} />
      </Link>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: 'var(--muted)', minHeight: 16 }}>{counter}</p>
      </div>
      <LeafToggle />
    </header>
  )

  return (
    <MobileLayout header={header}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {run.cards === null ? (
          <InlineLoader label="Chargement des cartes…" />
        ) : total === 0 ? (
          <Card className="rise">
            {run.error ? (
              <EmptyState title="Oups" action={<Button variant="ghost" onClick={run.restart}>Réessayer</Button>}>{run.error}</EmptyState>
            ) : (
              <EmptyState title={chapterId ? 'Aucune carte ici' : 'Rien à revoir aujourd’hui'} action={<ButtonLink to={routes.home} block>Retour à l’accueil</ButtonLink>}>
                {chapterId ? 'Toutes les cartes de ce chapitre sont programmées pour plus tard.' : 'Choisis de nouvelles cartes depuis l’accueil.'}
              </EmptyState>
            )}
          </Card>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <QueueMeter value={Math.min(idx, total) / total} compact />
              <span className="lcd" aria-live="polite" style={{ padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontSize: 14, whiteSpace: 'nowrap' }}>
                +{fmtInt(run.points)} pts
              </span>
            </div>

            {run.error && <ErrorBanner>{run.error}</ErrorBanner>}

            {card && (
              <>
                <CardStack compact style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <section
                    key={card.id}
                    aria-labelledby="t-front"
                    className="popin"
                    onClick={run.revealed ? undefined : run.reveal}
                    style={{ position: 'relative', flex: 1, minHeight: 300, overflowY: 'auto', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, boxShadow: '0 22px 40px -28px rgba(120,60,20,0.5)', cursor: run.revealed ? undefined : 'pointer' }}
                  >
                    <CardTags card={card} compact />
                    <h1 id="t-front" style={{ margin: 0, fontSize: 24, lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'pre-line' }}>{card.recto}</h1>
                    {run.revealed ? (
                      <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Dashes />
                        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{card.verso}</p>
                      </div>
                    ) : (
                      <p style={{ margin: 'auto 0 0', fontSize: 13, color: 'var(--faint)', textAlign: 'center' }}>Touche la carte pour la retourner</p>
                    )}
                  </section>
                  <GainBubble gain={run.revealed ? null : run.lastGain} compact />
                </CardStack>

                {!run.revealed ? (
                  <Button block size="lg" onClick={run.reveal} style={{ fontSize: 17, padding: '16px 20px' }}>
                    <Icon name="flip" size={18} strokeWidth={2} />
                    Retourner la carte
                  </Button>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: 'var(--muted)', textAlign: 'center' }}>Tu la connaissais ?</p>
                    <RateButtons card={card} onRate={(n) => void run.rate(n)} disabled={run.busy} compact />
                  </div>
                )}
              </>
            )}

            {run.done && (
              <Card as="section" className="popin" aria-labelledby="t-done" padding="28px 22px" radius={22} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
                <DoneLcd value={`${run.rated}/${total}`} compact />
                <h1 id="t-done" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{chapterId ? 'Série terminée' : 'File du jour terminée'}</h1>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>+{fmtInt(run.points)} pts. {nextReturn(run.nextDays)}</p>
                <ButtonLink to={routes.home} size="lg" style={{ marginTop: 6 }}>Retour à l’accueil</ButtonLink>
                {chapterId && <Button variant="ghost" onClick={run.restart}>D’autres cartes du chapitre</Button>}
              </Card>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  )
}
