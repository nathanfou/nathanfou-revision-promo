// Accueil flashcards (téléphone). Maquette : docs/maquettes/MobileCartes.dc.html. Chantier "Flashcards".
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMe } from '../auth/AuthProvider'
import { Icon, PlayIcon } from '../components/Icons'
import { Kata, lcdScreenStyle } from '../components/Lcd'
import { InlineLoader } from '../components/Loader'
import { ButtonLink, Card, EmptyState, Button } from '../components/ui'
import { fetchOverview, type ChapterOverview } from '../features/flashcards/api'
import { estMinutes } from '../features/flashcards/labels'
import { NEW_PER_CHAPTER } from '../features/flashcards/useFlashcardRun'
import { fmtInt, fmtLongDate, pad2 } from '../lib/format'
import { routes } from '../lib/routes'
import { POINTS } from '../lib/scoring'
import { useCountUp } from '../lib/useCountUp'
import { MobileLayout } from '../layouts/MobileLayout'

export default function MobileCartes() {
  const me = useMe()
  const [rows, setRows] = useState<ChapterOverview[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    fetchOverview()
      .then((r) => live && (setRows(r), setFailed(false)))
      .catch(() => live && (setFailed(true), setRows([])))
    return () => {
      live = false
    }
  }, [attempt])

  const due = useMemo(() => (rows ?? []).reduce((s, r) => s + r.due, 0), [rows])
  const bySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) if (r.due) m.set(r.subjectNom, (m.get(r.subjectNom) ?? 0) + r.due)
    const list = [...m.entries()].sort((a, b) => b[1] - a[1])
    if (list.length <= 3) return list
    return [...list.slice(0, 2), ['Autres', list.slice(2).reduce((s, x) => s + x[1], 0)] as [string, number]]
  }, [rows])
  const fresh = (rows ?? []).filter((r) => r.fresh > 0)
  const shown = useCountUp(due, 1200)

  return (
    <MobileLayout>
      <div className="rise">
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.02em' }}>Salut {me.pseudo}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--muted)' }}>{fmtLongDate()}</p>
      </div>

      {rows === null ? (
        <InlineLoader label="Chargement des cartes…" />
      ) : failed ? (
        <Card className="rise">
          <EmptyState title="Oups" action={<Button variant="ghost" onClick={() => setAttempt((a) => a + 1)}>Réessayer</Button>}>
            Impossible de charger tes cartes. Vérifie ta connexion.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card as="section" tone="ink" padding={16} radius={22} className="rise" aria-labelledby="t-due" style={{ animationDelay: '80ms', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 id="t-due" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ink-muted)' }}>À revoir aujourd’hui</h2>
              <Kata>カード</Kata>
            </div>
            <div style={{ ...lcdScreenStyle, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '10px 16px' }}>
              <div className="lcd" style={{ position: 'relative', fontSize: 76, lineHeight: 0.9 }}>
                <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, opacity: 0.12 }}>{due > 99 ? '888' : '88'}</span>
                <span style={{ position: 'relative' }} aria-label={`${due} cartes`}>{pad2(shown)}</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, lineHeight: 1.6 }}>
                <div>CARTES</div>
                <div>{due ? estMinutes(due) : 0} MIN</div>
                <div>+{fmtInt(due * POINTS.flashcard)} PTS</div>
              </div>
            </div>
            {bySubject.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {bySubject.map(([name, n]) => (
                  <span key={name} style={{ padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--ink-2)', fontSize: 13, color: '#f1dcc6' }}>
                    {name} {n}
                  </span>
                ))}
              </div>
            )}
            {due > 0 ? (
              <ButtonLink to={routes.flashcards()} block size="lg" style={{ fontSize: 17, padding: '15px 20px' }}>
                <PlayIcon size={14} />
                Lancer la file
              </ButtonLink>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--ink-muted)' }}>
                Rien à revoir pour aujourd’hui. Choisis de nouvelles cartes ci-dessous.
              </p>
            )}
          </Card>

          <section className="rise" aria-labelledby="t-new" style={{ animationDelay: '160ms', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 id="t-new" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Nouvelles cartes</h2>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{POINTS.flashcard} pts par carte</span>
            </div>
            {fresh.length === 0 ? (
              <Card padding={16} radius={18}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
                  {rows.length === 0 ? 'Pas encore de cartes publiées. Elles arriveront ici dès qu’elles seront en ligne.' : 'Tu as déjà vu toutes les cartes publiées. Bravo !'}
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 18 }}>
                {fresh.map((c, i) => (
                  <Link
                    key={c.chapterId}
                    to={routes.flashcards(c.chapterId)}
                    className="row"
                    style={{ minHeight: 58, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', textDecoration: 'none', color: 'var(--text)', borderTop: i ? '1px solid #f3e0cc' : undefined }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{c.chapterNom}</span>
                      <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--muted)' }}>
                        {c.subjectNom}
                        {c.due > 0 ? `, ${c.due} à revoir` : ''}
                      </span>
                    </span>
                    <span className="mono" style={{ padding: '3px 9px', borderRadius: 999, backgroundColor: 'var(--chip)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {c.fresh > NEW_PER_CHAPTER ? `${NEW_PER_CHAPTER} sur ${c.fresh}` : c.fresh} {c.fresh > 1 ? 'nouvelles' : 'nouvelle'}
                    </span>
                    <Icon name="chevronRight" size={16} strokeWidth={2} style={{ color: 'var(--muted)' }} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <div className="rise" style={{ animationDelay: '220ms', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 16, backgroundColor: 'rgba(253,227,200,0.85)', border: '1px solid #f1cfa9' }}>
        <span style={{ color: '#9a3f00', marginTop: 1 }}><Icon name="laptop" size={20} strokeWidth={1.75} /></span>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-2)' }}>QCM, exercices, classement et profil sont sur ordinateur.</p>
      </div>
    </MobileLayout>
  )
}
