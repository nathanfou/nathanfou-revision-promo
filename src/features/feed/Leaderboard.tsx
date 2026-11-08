// Classement (top 5) et encart "Ta position" (maquette Feed.dc.html, haut de page).
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Card, EmptyState, Segmented } from '../../components/ui'
import { LcdLabel, lcdScreenStyle } from '../../components/Lcd'
import { fmtInt, pad2 } from '../../lib/format'
import { levelInfo } from '../../lib/levels'
import { routes } from '../../lib/routes'
import { useCountUp } from '../../lib/useCountUp'
import type { RankRow } from './api'
import { ordinal, untilNextWeek } from './weeks'

export type BoardView = { kind: 'week' } | { kind: 'total' } | { kind: 'past'; monday: string; label: string }

const nameStyle: CSSProperties = { fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }

function Move({ delta }: { delta: number | undefined }) {
  if (delta === undefined) return <span />
  const up = delta > 0
  const down = delta < 0
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 13, fontWeight: 500, ...(up ? { backgroundColor: 'var(--chip-strong)', color: 'var(--link)' } : { backgroundColor: 'var(--chip)', color: 'var(--muted)' }) }}>
      {up && <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2l4.5 7.5h-9z" fill="currentColor" /></svg>}
      {down && <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10L1.5 2.5h9z" fill="currentColor" /></svg>}
      <span aria-label={delta === 0 ? 'stable depuis hier' : `${up ? 'monte' : 'descend'} de ${Math.abs(delta)} depuis hier`}>{delta === 0 ? '=' : Math.abs(delta)}</span>
    </span>
  )
}

export function RankingCard({
  view,
  onView,
  rows,
  totals,
  moves,
  loading,
  error,
}: {
  view: BoardView
  onView: (v: BoardView) => void
  rows: RankRow[]
  /** points cumulés par user_id, pour le niveau */
  totals: Map<string, number>
  /** rang il y a 24 h par user_id (semaine en cours et cumulé) */
  moves: Map<string, number>
  loading: boolean
  error: string | null
}) {
  const top = rows.slice(0, 5)
  const scoring = rows.some((r) => r.points > 0)
  return (
    <Card className="rise" aria-labelledby="t-rank" padding="24px 16px 16px" style={{ animationDelay: '80ms', flex: '7 1 560px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 id="t-rank" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>Classement</h2>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {view.kind === 'past' ? `${view.label}, top 5 sur ${rows.length}` : `Top 5 sur ${rows.length}`}
          </span>
          {view.kind === 'past' && (
            <button type="button" onClick={() => onView({ kind: 'week' })} style={{ border: 0, padding: 0, background: 'none', color: 'var(--link)', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Revenir à cette semaine
            </button>
          )}
        </div>
        <Segmented
          label="Période du classement"
          value={view.kind === 'total' ? 'total' : 'week'}
          options={[{ value: 'week', label: 'Semaine' }, { value: 'total', label: 'Cumulé' }]}
          onChange={(v) => onView(v === 'total' ? { kind: 'total' } : { kind: 'week' })}
        />
      </div>
      {error ? (
        <EmptyState title="Classement indisponible">{error}</EmptyState>
      ) : loading && rows.length === 0 ? (
        <p style={{ margin: 0, padding: '28px 8px', textAlign: 'center', color: 'var(--muted)' }}>Chargement…</p>
      ) : !scoring ? (
        <EmptyState title={view.kind === 'total' ? 'Personne n’a encore de points' : 'Personne n’a encore de points cette semaine'}>
          Le premier QCM, la première carte ou le premier exercice suffit pour prendre la tête.
        </EmptyState>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {top.map((r) => {
            const prev = moves.get(r.user_id)
            const first = r.rang === 1
            return (
              <li key={r.user_id} className="row" style={{ display: 'grid', gridTemplateColumns: '40px 44px minmax(0, 1fr) auto 110px', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, backgroundColor: first ? 'var(--chip-strong)' : undefined }}>
                <span className="tabnum" style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', color: first ? 'var(--link)' : 'var(--text-2)' }}>{r.rang}</span>
                <Avatar ppId={r.pp_id} size={44} />
                <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', minWidth: 0 }}>
                  <Link className="name" to={routes.publicProfile(r.pseudo)} style={{ ...nameStyle, fontSize: 17 }}>{r.pseudo}</Link>
                  <span style={{ padding: '2px 8px', borderRadius: 999, backgroundColor: 'var(--chip)', fontSize: 12, color: 'var(--text-2)' }}>Niv. {levelInfo(totals.get(r.user_id) ?? 0).level}</span>
                </span>
                {view.kind === 'past' ? <span /> : <Move delta={prev === undefined ? undefined : prev - r.rang} />}
                <span style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 17, fontWeight: 500 }}>{fmtInt(r.points)}</span> <span style={{ fontSize: 13, color: 'var(--muted)' }}>pts</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

export function MyPositionCard({ view, rows, meId }: { view: BoardView; rows: RankRow[]; meId: string }) {
  const idx = rows.findIndex((r) => r.user_id === meId)
  const me = idx >= 0 ? rows[idx] : null
  const pts = useCountUp(me?.points ?? 0)
  const ranked = !!me && me.points > 0
  const near = ranked ? rows.slice(Math.max(0, idx - 1), idx + 2) : []
  const above = me ? [...rows.slice(0, idx)].reverse().find((r) => r.points > me.points) : undefined
  const left = untilNextWeek()
  const label = view.kind === 'total' ? 'au cumulé' : view.kind === 'past' ? view.label.toLowerCase() : 'cette semaine'

  let nudge: string
  if (!me) nudge = 'Ton classement apparaîtra ici.'
  else if (me.points === 0) nudge = view.kind === 'past' ? 'Pas de points cette semaine-là.' : 'Une première série et tu entres au classement.'
  else if (!above) nudge = view.kind === 'past' ? 'Tu as fini en tête. Bien joué.' : 'Tu es en tête. Garde le rythme.'
  else nudge = `Encore ${fmtInt(above.points - me.points + 1)} pts pour passer devant ${above.pseudo}.`

  return (
    <Card tone="ink" className="rise" aria-labelledby="t-me" padding={22} style={{ animationDelay: '160ms', flex: '4 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="t-me" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--ink-muted)' }}>Ta position, {label}</h2>
        <span lang="ja" style={{ fontFamily: 'var(--kata)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-faint)' }}>ランキング</span>
      </div>
      <div style={{ ...lcdScreenStyle, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: '12px 18px' }}>
        <div>
          <LcdLabel>RANG</LcdLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div className="lcd" style={{ position: 'relative', fontSize: 84, lineHeight: 0.9 }}>
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, opacity: 0.12 }}>88</span>
              <span style={{ position: 'relative' }}>{ranked ? pad2(me.rang) : '--'}</span>
            </div>
            <span className="lcd" style={{ fontSize: 24 }}>/{rows.length}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <LcdLabel>PTS</LcdLabel>
          <div className="lcd" style={{ fontSize: 32, lineHeight: 1.1 }}>{fmtInt(pts)}</div>
        </div>
      </div>
      {near.length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {near.map((n) => {
            const isMe = n.user_id === meId
            return (
              <li key={n.user_id} style={{ display: 'grid', gridTemplateColumns: '30px 32px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, backgroundColor: isMe ? 'var(--ink-2)' : undefined }}>
                <span className="mono" style={{ fontSize: 14, color: 'var(--ink-muted)' }}>{n.rang}</span>
                <Avatar ppId={n.pp_id} size={32} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {isMe ? (
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{n.pseudo}</span>
                  ) : (
                    <Link className="name" to={routes.publicProfile(n.pseudo)} style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-text)', textDecoration: 'none' }}>{n.pseudo}</Link>
                  )}
                  {isMe && <span style={{ padding: '1px 7px', borderRadius: 999, backgroundColor: 'var(--caramel)', color: 'var(--lava)', fontSize: 11, fontWeight: 600 }}>toi</span>}
                </span>
                <span className="mono" style={{ fontSize: 14, color: 'var(--ink-text)' }}>{fmtInt(n.points)}</span>
              </li>
            )
          })}
        </ol>
      )}
      <p style={{ margin: 'auto 0 0', paddingTop: 12, borderTop: '1px solid var(--text-2)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
        {nudge}
        {view.kind === 'week' && (
          <>
            <br />
            Nouveau classement dans{' '}
            <span className="lcd" style={{ color: 'var(--caramel)' }}>
              {left.days}J<span className="blink">:</span>{left.hours}H
            </span>
          </>
        )}
        {view.kind === 'past' && me && me.points > 0 && (
          <>
            <br />
            Classement final : {ordinal(me.rang)} sur {rows.length}.
          </>
        )}
      </p>
    </Card>
  )
}
