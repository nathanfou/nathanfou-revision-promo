// Historique des sessions (RPC my_session_history), avec "Voir plus".
import { Link } from 'react-router'
import { InlineLoader } from '../../components/Loader'
import { Button } from '../../components/ui'
import { fmtInt, pad2, plural } from '../../lib/format'
import { routes } from '../../lib/routes'
import { dayOfMonth, parisDay } from './dates'
import type { SessionRow } from './useProfileData'

const RESULT_EXO: Record<string, string> = { reussi: 'réussi', partiel: 'partiel', a_refaire: 'à refaire' }

const hour = (at: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(at)).replace(':', 'h')

function describe(s: SessionRow) {
  const d = parisDay(s.started_at)
  const day = `${pad2(dayOfMonth(d))}/${d.slice(5, 7)}`
  const mode =
    s.mode === 'qcm' ? `QCM ${s.variante === 'examen' ? 'examen' : 'entraînement'}` : s.mode === 'flashcard' ? 'flashcards' : s.nb_items > 1 ? 'exercices' : 'exercice'
  const minutes = s.ended_at ? Math.max(1, Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60_000)) : s.mode === 'exo' ? s.minutes_exo : null
  const meta = [s.subject_nom ?? 'Toutes matières', mode, minutes ? `${minutes} min` : null].filter(Boolean).join(', ')
  const result =
    s.mode === 'qcm'
      ? `${s.nb_reussis}/${s.nb_items}`
      : s.mode === 'flashcard'
        ? plural(s.nb_items, 'carte')
        : s.nb_items > 1
          ? `${s.nb_reussis}/${s.nb_items} réussis`
          : (RESULT_EXO[s.resultat_exo ?? ''] ?? '')
  return { day, hour: hour(s.started_at), title: s.chapter_nom ?? 'File du jour', meta, result }
}

export function SessionHistory({ rows, loading, error, hasMore, more }: { rows: SessionRow[]; loading: boolean; error: boolean; hasMore: boolean; more: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 16px', marginBottom: 4 }}>
        <h2 id="t-hist" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Historique des sessions
        </h2>
      </div>
      {rows.length === 0 && loading && <InlineLoader />}
      {rows.length === 0 && !loading && !error && (
        <p style={{ margin: '10px 0', fontSize: 14, color: 'var(--muted)' }}>
          Aucune session pour l’instant. <Link to={routes.home}>Lance ta première révision</Link>.
        </p>
      )}
      {error && <p style={{ margin: '10px 0', fontSize: 14, color: 'var(--ko)' }}>Impossible de charger l’historique. Recharge la page.</p>}
      {rows.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((s, i) => {
            const x = describe(s)
            const title =
              s.mode === 'qcm' && s.ended_at ? (
                <Link to={routes.qcmResult(s.id)} style={{ color: 'inherit' }}>
                  {x.title}
                </Link>
              ) : (
                x.title
              )
            return (
              <li key={s.id} style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr) auto', alignItems: 'center', gap: 16, padding: '14px 0', borderTop: i ? '1px solid var(--border-soft)' : undefined }}>
                <span className="mono" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{x.day}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{x.hour}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--muted)' }}>{x.meta}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {x.result && <span style={{ padding: '3px 9px', borderRadius: 999, backgroundColor: 'var(--chip)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{x.result}</span>}
                  <span className="mono" style={{ minWidth: 44, textAlign: 'right', fontSize: 14, fontWeight: 500, color: 'var(--link)' }}>
                    +{fmtInt(s.points)}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {hasMore && (
        <div style={{ paddingTop: 8 }}>
          <Button variant="ghost" size="sm" onClick={more} disabled={loading}>
            {loading ? 'Chargement…' : 'Voir plus'}
          </Button>
        </div>
      )}
    </>
  )
}
