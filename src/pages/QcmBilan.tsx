// Bilan de série. Maquette : docs/maquettes/QcmResultat.dc.html. Chantier "QCM".
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMe } from '../auth/AuthProvider'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { LcdDigits, LcdLabel, lcdScreenStyle } from '../components/Lcd'
import { ButtonLink, Card, EmptyState } from '../components/ui'
import { describeChoices, errorMessage, fetchReview, type QcmReview, type QcmReviewAnswer } from '../features/qcm/api'
import { SessionLayout } from '../layouts/SessionLayout'
import { fmtInt, plural } from '../lib/format'
import { supabase } from '../lib/supabase'
import { routes } from '../lib/routes'
import { useCountUp } from '../lib/useCountUp'

type Rank = { now: number | null; before: number | null; weekPoints: number; passed: string | null; promoSize: number }

export default function QcmBilan() {
  const { sessionId = '' } = useParams()
  const me = useMe()
  const [review, setReview] = useState<QcmReview | null>(null)
  const [rank, setRank] = useState<Rank | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetchReview(sessionId)
        if (!alive) return
        setReview(r)
        const { data } = await supabase.rpc('leaderboard', { p_scope: 'week' })
        if (!alive || !data) return
        const mine = data.find((row) => row.user_id === me.id)
        if (!mine) return
        let before: number | null = null
        let passed: string | null = null
        if (r.session.semaine_courante && r.session.points > 0) {
          const prev = mine.points - r.session.points
          before = 1 + data.filter((row) => row.user_id !== me.id && row.points > prev).length
          const overtaken = data
            .filter((row) => row.user_id !== me.id && row.points > prev && row.points < mine.points)
            .sort((a, b) => b.points - a.points)
          passed = overtaken[0]?.pseudo ?? null
        }
        setRank({ now: mine.rang, before, weekPoints: mine.points, passed, promoSize: data.length })
      } catch (e) {
        if (alive) setError(errorMessage(e, 'Impossible de charger le bilan.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [sessionId, me.id])

  if (error) {
    return (
      <SessionLayout title="Bilan de série">
        <Card>
          <EmptyState title="Bilan indisponible" action={<ButtonLink to={routes.home} variant="ghost">Retour aux matières</ButtonLink>}>
            {error}
          </EmptyState>
        </Card>
      </SessionLayout>
    )
  }
  if (!review) {
    return (
      <SessionLayout title="Bilan de série">
        <InlineLoader label="Calcul du bilan…" />
      </SessionLayout>
    )
  }
  return <Bilan review={review} rank={rank} />
}

function Bilan({ review, rank }: { review: QcmReview; rank: Rank | null }) {
  const { session, progression, reponses } = review
  const isExam = session.variante === 'examen'
  const total = reponses.length
  const justes = reponses.filter((r) => r.correct).length
  const erreurs = reponses.filter((r) => !r.correct)
  const score = useCountUp(justes)
  const pts = useCountUp(session.points)
  const minutes = Math.max(1, Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000))
  const pct = (n: number) => (progression.total ? Math.round((n / progression.total) * 100) : 0)
  const segs = Math.max(total, 5)
  const lit = total ? Math.round((score / total) * segs) : 0

  return (
    <SessionLayout title={session.chapitre} subtitle={`${session.matiere}, bilan ${isExam ? 'examen' : 'entraînement'}`} points={session.points} maxWidth={1080}>
      <div className="rise">
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.025em' }}>Série terminée</h1>
        <p style={{ margin: '10px 0 0', fontSize: 17, color: 'var(--muted)' }}>
          {total === 0
            ? 'Tu as quitté la série avant de répondre.'
            : isExam
              ? 'Mode examen : toutes les corrections sont ci-dessous.'
              : erreurs.length
                ? 'Mode entraînement : revois les corrections de tes erreurs.'
                : 'Mode entraînement : un sans-faute, rien à corriger.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
        <Card tone="ink" aria-label="Score" className="rise" radius={22} style={{ animationDelay: '80ms', flex: '6 1 460px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 220px', padding: '14px 18px 12px', ...lcdScreenStyle }}>
              <LcdLabel>SCORE</LcdLabel>
              <div style={{ marginTop: 4 }}>
                <LcdDigits value={`${score}/${total}`} ghost={`${'8'.repeat(String(total).length)}/${'8'.repeat(String(total).length)}`} size={92} />
              </div>
            </div>
            <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Points gagnés</span>
              <span className="lcd" style={{ fontSize: 48, lineHeight: 1, color: 'var(--caramel)' }}>+{fmtInt(pts)}</span>
              <span className="floatup" style={{ alignSelf: 'flex-start', marginTop: 6, padding: '3px 10px', borderRadius: 999, backgroundColor: 'var(--ink-2)', fontSize: 13, color: 'var(--ink-text)' }}>
                10 pts par bonne réponse
              </span>
            </div>
          </div>
          <div aria-hidden="true" className="px" style={{ padding: 3, backgroundColor: 'var(--caramel)' }}>
            <div className="px" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px 5px 6px', backgroundColor: 'var(--ink)' }}>
              <svg width="8" height="14" viewBox="0 0 4 7" shapeRendering="crispEdges" style={{ flex: '0 0 auto', display: 'block', marginRight: 2 }}>
                <path fill="currentColor" style={{ color: 'var(--caramel)' }} d="M3 0h1v7h-1zM2 1h1v5h-1zM1 2h1v3h-1zM0 3h1v1h-1z" />
              </svg>
              {Array.from({ length: segs }, (_, i) => (
                <span key={i} style={{ flex: 1, minWidth: 4, height: 16, transition: 'background-color .3s', backgroundColor: i < lit ? 'var(--caramel)' : 'rgba(251,186,114,0.1)' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <InkChip>{minutes} min</InkChip>
            <InkChip>{erreurs.length === 0 ? 'Aucune erreur' : plural(erreurs.length, 'erreur')}</InkChip>
            {progression.total > 0 && (
              <InkChip>
                {session.chapitre} : {pct(progression.avant)} %{progression.apres !== progression.avant ? ` → ${pct(progression.apres)} %` : ''}
              </InkChip>
            )}
          </div>
        </Card>

        <Card className="rise" aria-labelledby="t-rank" radius={22} style={{ animationDelay: '160ms', flex: '4 1 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 id="t-rank" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Classement de la semaine</h2>
          {rank?.now ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {rank.before && rank.before !== rank.now && (
                  <>
                    <span style={{ fontSize: 32, fontWeight: 600, color: 'var(--faint)', textDecoration: 'line-through', textDecorationThickness: 2 }}>{rank.before}e</span>
                    <Icon name="arrowRight" size={22} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                  </>
                )}
                <span style={{ fontSize: 44, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--link)' }}>{rank.now === 1 ? '1er' : `${rank.now}e`}</span>
                {rank.before && rank.before > rank.now && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, backgroundColor: 'var(--chip-strong)', color: 'var(--link)', fontSize: 13, fontWeight: 500 }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M6 2l4.5 7.5h-9z" fill="currentColor" />
                    </svg>
                    {rank.before - rank.now}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-2)' }}>
                {rank.passed
                  ? `Tu passes devant ${rank.passed} avec ${fmtInt(rank.weekPoints)} pts cette semaine.`
                  : `${fmtInt(rank.weekPoints)} pts cette semaine, sur ${plural(rank.promoSize, 'étudiant')} de la promo.`}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>{rank ? 'Classement indisponible.' : 'Chargement du classement…'}</p>
          )}
          <Link to={routes.feed} style={{ marginTop: 'auto', fontSize: 14, fontWeight: 500 }}>
            Voir le classement
          </Link>
        </Card>
      </div>

      {total > 0 && (
        <Card className="rise" aria-labelledby="t-grid" padding="22px 24px" radius={22} style={{ animationDelay: '220ms', boxShadow: 'none' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 16px', marginBottom: 14 }}>
            <h2 id="t-grid" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {total > 1 ? `Tes ${total} réponses` : 'Ta réponse'}
            </h2>
            <span style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)' }}>
              <Legend color="var(--ok)">juste</Legend>
              <Legend color="var(--ko)">fausse</Legend>
            </span>
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6 }}>
            {reponses.map((r) => (
              <li key={r.question_id}>
                <a
                  href={`#q-${r.no}`}
                  aria-label={`Question ${r.no}, ${r.correct ? 'juste' : 'fausse'}`}
                  style={{
                    height: 44,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 10,
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    ...(r.correct
                      ? { backgroundColor: 'var(--ok-bg)', color: 'var(--ok)', boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--ok) 30%, transparent)' }
                      : { backgroundColor: 'var(--ko)', color: 'var(--accent-text)' }),
                  }}
                >
                  {r.no}
                </a>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {erreurs.length > 0 && (
        <section className="rise" aria-labelledby="t-err" style={{ animationDelay: '280ms', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="t-err" style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Corrections de tes erreurs
          </h2>
          {erreurs.map((r) => (
            <Correction key={r.question_id} r={r} />
          ))}
        </section>
      )}

      {isExam && justes > 0 && (
        <details className="rise" style={{ animationDelay: '320ms' }}>
          <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 600, padding: '6px 0' }}>Revoir aussi {justes > 1 ? `tes ${justes} bonnes réponses` : 'ta bonne réponse'}</summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reponses
              .filter((r) => r.correct)
              .map((r) => (
                <Correction key={r.question_id} r={r} />
              ))}
          </div>
        </details>
      )}

      <div className="rise" style={{ animationDelay: '340ms', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {erreurs.length > 0 ? (
          <ButtonLink to={`${routes.qcm(session.chapter_id, 'entrainement')}&reprise=${session.id}`} size="lg">
            <Icon name="undo" size={16} strokeWidth={2} />
            {erreurs.length > 1 ? `Refaire les ${erreurs.length} erreurs` : 'Refaire l’erreur'}
          </ButtonLink>
        ) : (
          <ButtonLink to={routes.qcm(session.chapter_id, session.variante)} size="lg">
            <Icon name="undo" size={16} strokeWidth={2} />
            Nouvelle série
          </ButtonLink>
        )}
        <ButtonLink to={routes.home} variant="ghost" size="lg" style={{ padding: '14px 22px' }}>
          Retour aux matières
        </ButtonLink>
      </div>
    </SessionLayout>
  )
}

function InkChip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '5px 12px', borderRadius: 999, backgroundColor: 'var(--ink-2)', fontSize: 13, color: 'var(--ink-text)' }}>{children}</span>
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      {children}
    </span>
  )
}

function Correction({ r }: { r: QcmReviewAnswer }) {
  return (
    <article id={`q-${r.no}`} className="lift" style={{ scrollMarginTop: 90, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ flex: '0 0 auto', padding: '2px 8px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, ...(r.correct ? { backgroundColor: 'var(--ok-bg)', color: 'var(--ok)' } : { backgroundColor: 'var(--ko-bg)', color: 'var(--ko)' }) }}>Q{r.no}</span>
        <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.4, fontWeight: 600, whiteSpace: 'pre-line' }}>{r.enonce}</h3>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 15 }}>
        {!r.correct && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ko)' }}>
            <Icon name="close" size={16} strokeWidth={2.25} />
            Ta réponse : {describeChoices(r.choix_eleve, r.choix)}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ok)' }}>
          <Icon name="check" size={16} strokeWidth={2.25} />
          {r.bonnes_reponses.length > 1 ? 'Bonnes réponses' : 'Bonne réponse'} : {describeChoices(r.bonnes_reponses, r.choix)}
        </span>
      </div>
      {r.explication && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{r.explication}</p>}
    </article>
  )
}
