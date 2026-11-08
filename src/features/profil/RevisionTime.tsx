// Temps de révision estimé : barres des 8 dernières semaines et répartition par matière.
import { isoWeekLabel, parisToday } from '../../lib/format'
import { addDays, mondayOf } from './dates'
import { fmtHm } from './time'

const WEEKS = 8
const BAR_MAX = 120

type Props = {
  minutesByDay: Map<string, number>
  bySubject: { name: string; minutes: number }[]
  total: number
}

export function RevisionTime({ minutesByDay, bySubject, total }: Props) {
  const thisMonday = mondayOf(parisToday())
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (WEEKS - 1 - i))
    let m = 0
    for (let d = 0; d < 7; d++) m += minutesByDay.get(addDays(monday, d)) ?? 0
    const [y, mo, da] = monday.split('-').map(Number)
    return { monday, minutes: m, no: isoWeekLabel(new Date(y, mo - 1, da)) }
  })
  const maxWeek = Math.max(...weeks.map((w) => w.minutes), 1)
  const maxSubject = Math.max(...bySubject.map((s) => s.minutes), 1)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 16px' }}>
        <h2 id="t-time" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Temps de révision
        </h2>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtHm(total)}</span> estimées au total
        </span>
      </div>
      <div>
        <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Par semaine</h3>
        <ul aria-label="Temps estimé par semaine" style={{ listStyle: 'none', margin: 0, padding: 0, height: 172, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          {weeks.map((w, i) => (
            <li key={w.monday} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                {fmtHm(w.minutes)}
              </span>
              <span
                aria-hidden="true"
                style={{
                  width: '100%', height: Math.max(4, Math.round((w.minutes / maxWeek) * BAR_MAX)), borderRadius: '6px 6px 3px 3px',
                  transition: 'height .3s', backgroundColor: i === WEEKS - 1 ? 'var(--accent)' : 'var(--caramel)',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{w.no}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Par matière</h3>
        {bySubject.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Rien pour l’instant : ta première session apparaîtra ici.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bySubject.map((b) => (
              <li key={b.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 140px) minmax(0, 1fr) 50px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.name}>
                  {b.name}
                </span>
                <span aria-hidden="true" style={{ display: 'block', height: 8, width: `${Math.max(2, Math.round((b.minutes / maxSubject) * 100))}%`, borderRadius: 999, transition: 'width .3s', backgroundColor: '#f29a4a' }} />
                <span className="mono" style={{ textAlign: 'right', fontSize: 13 }}>
                  {fmtHm(b.minutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
