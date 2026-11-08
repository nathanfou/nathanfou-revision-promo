// Cartes du haut de la page Révision (maquette Main.dc.html) : Reprendre, Prochain contrôle,
// Flashcards du jour, Exercices à refaire.
import type { CSSProperties } from 'react'
import { Icon, PlayIcon } from '../../components/Icons'
import { Kata, LcdDigits, lcdScreenStyle } from '../../components/Lcd'
import { PixelMeter } from '../../components/Meter'
import { ButtonLink, Card, CardIcon, Chip } from '../../components/ui'
import { daysUntil, fmtInt, fmtShortDate, jMinus, plural } from '../../lib/format'
import { routes } from '../../lib/routes'
import { DURATION_MIN, POINTS } from '../../lib/scoring'
import { useCountUp } from '../../lib/useCountUp'
import { examLabel, type ExamInfo, type LastSession, type RedoItem, type SubjectInfo } from './useRevisionData'

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })
const cardHead: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 }
const h2Small: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600 }

// ------------------------------------------------------------------ Reprendre
const MODE_LABEL = { qcm: 'QCM', flashcard: 'Flashcards', exo: 'Exercices' } as const

function sessionLink(s: LastSession) {
  if (s.mode === 'qcm' && s.chapterId) return routes.qcm(s.chapterId, s.variante ?? 'entrainement')
  if (s.mode === 'exo' && s.chapterId) return routes.exercises(s.chapterId)
  return routes.flashcards(s.chapterId ?? undefined)
}

export function ResumeCard({ session }: { session: LastSession | null }) {
  const pts = useCountUp(session?.points ?? 0)
  const style: CSSProperties = { flex: '7 1 540px', padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }

  if (!session) {
    return (
      <Card className="rise" style={{ ...style, ...delay(80) }} aria-labelledby="t-resume">
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Reprendre où tu en étais</p>
        <div>
          <h2 id="t-resume" style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.02em' }}>Pas encore de série</h2>
          <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--muted)', maxWidth: 460 }}>
            Choisis une matière, un chapitre et un mode plus bas pour lancer ta première série. Tu la retrouveras ici.
          </p>
        </div>
      </Card>
    )
  }

  const modeLabel = session.mode === 'qcm' ? `QCM, ${session.variante === 'examen' ? 'examen' : 'entraînement'}` : MODE_LABEL[session.mode]
  const title = session.chapterNom ?? (session.mode === 'flashcard' ? 'File du jour' : 'Chapitre supprimé')
  const subtitle = session.subjectNom ?? (session.mode === 'flashcard' ? 'Toutes matières' : '')
  const recap =
    session.mode === 'qcm'
      ? session.repondues
        ? `${plural(session.score, 'bonne réponse', 'bonnes réponses')} sur ${fmtInt(session.repondues)}.`
        : 'Aucune réponse pour l’instant.'
      : session.mode === 'flashcard'
        ? `${plural(session.repondues, 'carte revue', 'cartes revues')}.`
        : `${plural(session.repondues, 'exercice fait', 'exercices faits')}.`

  return (
    <Card className="rise" style={{ ...style, ...delay(80) }} aria-labelledby="t-resume">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Reprendre où tu en étais</p>
        <Chip>{session.terminee ? `${modeLabel}, terminée` : modeLabel}</Chip>
      </div>
      <div>
        {subtitle && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>{subtitle}</p>}
        <h2 id="t-resume" style={{ margin: '4px 0 0', fontSize: 36, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
      </div>
      {session.total ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <PixelMeter value={Math.min(1, session.repondues / session.total)} maxWidth={420} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500 }}>
            {Math.min(session.repondues, session.total)}/{session.total}
          </span>
        </div>
      ) : null}
      <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>
          {recap} <span style={{ fontWeight: 600, color: 'var(--link)' }}>{fmtInt(pts)} pts</span> gagnés dans cette série.
        </p>
        <ButtonLink to={sessionLink(session)} size="lg">
          <PlayIcon />
          {session.terminee ? 'Continuer' : 'Reprendre'}
        </ButtonLink>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------ Prochain contrôle
export function ExamCard({ exams }: { exams: ExamInfo[] }) {
  const [next, ...others] = exams
  return (
    <Card tone="ink" padding={22} className="rise" style={{ ...delay(160), flex: '5 1 380px', display: 'flex', flexDirection: 'column', gap: 16 }} aria-labelledby="t-exam">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="t-exam" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ink-muted)' }}>Prochain contrôle</h2>
        <Kata>カウントダウン</Kata>
      </div>
      <div style={{ ...lcdScreenStyle, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: '14px 18px 12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <span className="blink"><PlayIcon size={9} /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next ? examLabel(next) : 'Aucun contrôle prévu'}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <LcdDigits value={next ? jMinus(daysUntil(next.date)) : 'J---'} ghost="J-88" size={96} />
          </div>
        </div>
        {next && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtShortDate(next.date)}</div>}
      </div>
      {others.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {others.slice(0, 3).map((x) => (
            <li key={x.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: 15, color: 'var(--ink-text)' }}>
              <span>
                {x.subjectNom} <span style={{ color: 'var(--ink-faint)' }}>{fmtShortDate(x.date)}</span>
              </span>
              <span className="lcd" style={{ fontSize: 18, color: 'var(--caramel)' }}>{jMinus(daysUntil(x.date))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-faint)' }}>
          {next ? 'Pas d’autre contrôle à l’horizon.' : 'Les dates des contrôles apparaîtront ici dès qu’elles seront saisies.'}
        </p>
      )}
    </Card>
  )
}

// ------------------------------------------------------------------ Flashcards du jour
export function DueCardsCard({ subjects, dueTotal }: { subjects: SubjectInfo[]; dueTotal: number }) {
  const shown = useCountUp(dueTotal)
  const bySubject = subjects.filter((s) => s.cartesDues > 0).sort((a, b) => b.cartesDues - a.cartesDues)
  const top = bySubject.slice(0, 2)
  const rest = bySubject.slice(2).reduce((n, s) => n + s.cartesDues, 0)
  const nouvelles = subjects.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.cartesNouvelles, 0), 0)
  const minutes = Math.max(1, Math.ceil(dueTotal * DURATION_MIN.flashcard))

  return (
    <Card className="rise lift" style={{ ...delay(240), flex: '4 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="t-cards">
      <div style={cardHead}>
        <CardIcon><Icon name="cards" /></CardIcon>
        <h2 id="t-cards" style={h2Small}>Flashcards du jour</h2>
      </div>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 52, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{fmtInt(shown)}</span>
        <span style={{ fontSize: 15, color: 'var(--muted)' }}>{dueTotal > 1 ? 'cartes à revoir' : 'carte à revoir'}</span>
      </p>
      {dueTotal > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {top.map((s) => (
            <Chip key={s.id} style={{ padding: '4px 10px' }}>{s.nom} {s.cartesDues}</Chip>
          ))}
          {rest > 0 && <Chip>Autres {rest}</Chip>}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
          {nouvelles > 0 ? `Rien à revoir aujourd’hui. ${plural(nouvelles, 'nouvelle carte', 'nouvelles cartes')} t’attendent.` : 'Rien à revoir aujourd’hui.'}
        </p>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>{dueTotal > 0 ? `Environ ${minutes} min, ${fmtInt(dueTotal * POINTS.flashcard)} pts` : '3 pts par carte'}</span>
        <ButtonLink to={routes.flashcards()} variant="ghost">Lancer la file</ButtonLink>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------------ Exercices à refaire
export function RedoCard({ items }: { items: RedoItem[] }) {
  return (
    <Card className="rise lift" style={{ ...delay(360), flex: '5 1 360px', padding: '24px 24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }} aria-labelledby="t-redo">
      <div style={{ ...cardHead, marginBottom: 6 }}>
        <CardIcon><Icon name="pencil" /></CardIcon>
        <h2 id="t-redo" style={h2Small}>Exercices à refaire</h2>
        {items.length > 0 && <Chip style={{ padding: '2px 9px' }}>{items.length}</Chip>}
      </div>
      {items.length === 0 ? (
        <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
          Aucun exercice à refaire. Ceux que tu marques « À refaire » après la correction apparaîtront ici.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 320, overflowY: 'auto' }}>
          {items.map((e, i) => (
            <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: i ? '1px solid var(--border-soft)' : undefined }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{e.titre}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  {[e.subjectNom, e.chapterNom, `${fmtInt(POINTS.exercise(e.dureeMin))} pts`].filter(Boolean).join(', ')}
                </p>
              </div>
              <Chip mono style={{ padding: '3px 9px', fontSize: 12 }}>{e.dureeMin} min</Chip>
              <ButtonLink to={routes.exercise(e.id)} variant="ghost" size="sm" aria-label={`Refaire : ${e.titre}`} style={{ padding: '8px 14px', fontSize: 14 }}>
                Refaire
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
