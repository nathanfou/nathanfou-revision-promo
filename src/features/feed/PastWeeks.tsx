// Encart "Semaines précédentes" (maquette Feed.dc.html, colonne de droite).
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui'
import { fmtInt } from '../../lib/format'
import { fetchLeaderboard, type RankRow } from './api'
import { addDays, ordinal, weekNo, weekOfParam, weekShortRange } from './weeks'

export type PastWeek = { monday: string; rows: RankRow[] }

export function usePastWeeks(currentMonday: string, count = 4) {
  const [weeks, setWeeks] = useState<PastWeek[] | null>(null)
  useEffect(() => {
    let cancelled = false
    const mondays = Array.from({ length: count }, (_, i) => addDays(currentMonday, -7 * (i + 1)))
    Promise.all(mondays.map((m) => fetchLeaderboard('week', weekOfParam(m)).then((rows) => ({ monday: m, rows }))))
      .then((res) => !cancelled && setWeeks(res))
      .catch(() => !cancelled && setWeeks([]))
    return () => {
      cancelled = true
    }
  }, [currentMonday, count])
  return weeks
}

export function PastWeeksCard({ weeks, meId, selected, onSelect }: { weeks: PastWeek[] | null; meId: string; selected: string | null; onSelect: (w: PastWeek) => void }) {
  // une semaine sans aucun point (avant le lancement) n'a rien à montrer
  const played = (weeks ?? []).filter((w) => w.rows.some((r) => r.points > 0))
  return (
    <Card aria-labelledby="t-weeks" padding="20px 12px 12px">
      <h2 id="t-weeks" style={{ margin: '0 10px 8px', fontSize: 16, fontWeight: 600 }}>Semaines précédentes</h2>
      {weeks === null ? (
        <p style={{ margin: 0, padding: '8px 10px', fontSize: 14, color: 'var(--muted)' }}>Chargement…</p>
      ) : played.length === 0 ? (
        <p style={{ margin: 0, padding: '8px 10px 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
          Le classement final de chaque semaine restera consultable ici, dès lundi prochain.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {played.map((w) => {
            const first = w.rows[0]
            const me = w.rows.find((r) => r.user_id === meId)
            const on = selected === w.monday
            return (
              <button
                key={w.monday}
                type="button"
                className="row"
                aria-pressed={on}
                onClick={() => onSelect(w)}
                style={{ width: '100%', display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: 10, border: 0, borderRadius: 12, backgroundColor: on ? 'var(--chip-strong)' : 'transparent', textAlign: 'left', color: 'var(--text)' }}
              >
                <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{weekNo(w.monday)}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>{weekShortRange(w.monday)}</span>
                  <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--muted)' }}>1er : {first.pseudo}, {fmtInt(first.points)} pts</span>
                </span>
                <span style={{ padding: '3px 9px', borderRadius: 999, backgroundColor: 'var(--chip)', fontSize: 13, color: 'var(--text-2)' }}>
                  toi {me && me.points > 0 ? ordinal(me.rang) : '–'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
