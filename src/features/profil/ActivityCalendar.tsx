// Calendrier d'activité : 16 semaines (11 passées, la semaine en cours, 4 à venir avec les contrôles).
import { useMemo } from 'react'
import { parisToday, plural } from '../../lib/format'
import { addDays, dayLabel, dayOfMonth, diffDays, mondayOf, monthShort, parisDay } from './dates'
import { fmtMinutes } from './time'

const PAST_WEEKS = 11
const FUTURE_WEEKS = 4
const COLS = PAST_WEEKS + 1 + FUTURE_WEEKS
const CELL = 26
const GAP = 5

const LEVELS = ['#f3e3d3', '#fcd5ab', '#f29a4a', 'var(--accent)']
const TODAY_RING = '0 0 0 2px var(--card), 0 0 0 3.5px var(--ink)'

const levelOf = (m: number) => (m <= 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : 3)

type Props = {
  /** minutes estimées par jour "YYYY-MM-DD" */
  minutesByDay: Map<string, number>
  exams: { date: string; nom: string; subject: string | null }[]
  /** date d'inscription (timestamptz) */
  createdAt: string
}

export function ActivityCalendar({ minutesByDay, exams, createdAt }: Props) {
  const today = parisToday()
  const { days, months, activeDays, pastDays } = useMemo(() => {
    const start = addDays(mondayOf(today), -7 * PAST_WEEKS)
    const joined = parisDay(createdAt)
    const examByDay = new Map<string, string>()
    for (const e of exams) {
      const d = parisDay(e.date)
      examByDay.set(d, [examByDay.get(d), e.nom].filter(Boolean).join(', '))
    }
    const days: { key: string; title: string; style: React.CSSProperties }[] = []
    const months: { name: string; col: number }[] = []
    let active = 0
    let past = 0
    for (let i = 0; i < COLS * 7; i++) {
      const d = addDays(start, i)
      // étiquette de mois sur la colonne qui contient le 1er (et sur la première colonne)
      if (i === 0 || dayOfMonth(d) === 1) months.push({ name: monthShort(d), col: Math.floor(i / 7) + 1 })
      const label = dayLabel(d)
      const exam = examByDay.get(d)
      if (diffDays(today, d) > 0) {
        days.push({
          key: d,
          title: exam ? `${label} : ${exam}` : label,
          style: exam ? { border: '2px solid var(--accent)' } : { border: '1px solid var(--border)' },
        })
        continue
      }
      const m = minutesByDay.get(d) ?? 0
      const lvl = levelOf(m)
      if (diffDays(joined, d) >= 0) past++
      if (lvl) active++
      days.push({
        key: d,
        title: `${label} : ${m > 0 ? fmtMinutes(m) : 'rien'}${exam ? `, ${exam}` : ''}`,
        style: {
          backgroundColor: LEVELS[lvl],
          boxShadow: d === today ? TODAY_RING : undefined,
          outline: exam ? '2px solid var(--accent)' : undefined,
          outlineOffset: exam ? -2 : undefined,
        },
      })
    }
    // une seule étiquette par mois, espacées d'au moins 3 colonnes
    const dedup: typeof months = []
    for (const m of months) {
      const prev = dedup[dedup.length - 1]
      if (prev?.name === m.name) continue
      if (prev && m.col - prev.col < 3) dedup.pop()
      dedup.push(m)
    }
    return { days, months: dedup, activeDays: active, pastDays: Math.max(past, 1) }
  }, [today, minutesByDay, exams, createdAt])

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 16px' }}>
        <h2 id="t-cal" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Calendrier d’activité
        </h2>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{plural(activeDays, 'jour')}</span> révisé{activeDays > 1 ? 's' : ''} sur {pastDays}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-grid', gridTemplateColumns: '30px auto', gap: '6px 8px' }}>
          <span />
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: GAP, fontSize: 12, color: 'var(--muted)' }}>
            {months.map((m) => (
              <span key={`${m.name}-${m.col}`} style={{ gridColumn: `${m.col} / span 3`, gridRow: 1 }}>
                {m.name}
              </span>
            ))}
          </div>
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ alignSelf: 'center' }}>lun</span>
            <span />
            <span style={{ alignSelf: 'center' }}>mer</span>
            <span />
            <span style={{ alignSelf: 'center' }}>ven</span>
            <span />
            <span style={{ alignSelf: 'center' }}>dim</span>
          </div>
          <div role="img" aria-label={`Calendrier d’activité : ${activeDays} jours révisés sur les ${pastDays} derniers`} style={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL}px)`, gridAutoFlow: 'column', gridAutoColumns: CELL, gap: GAP }}>
            {days.map((d) => (
              <span key={d.key} title={d.title} style={{ width: CELL, height: CELL, borderRadius: 6, boxSizing: 'border-box', ...d.style }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 22px', fontSize: 13, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          moins
          {LEVELS.map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: 4, backgroundColor: c }} />
          ))}
          plus
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 13, height: 13, borderRadius: 4, backgroundColor: LEVELS[2], boxShadow: TODAY_RING }} />
          aujourd’hui
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 13, height: 13, borderRadius: 4, border: '2px solid var(--accent)', boxSizing: 'border-box' }} />
          contrôle
        </span>
      </div>
    </>
  )
}
