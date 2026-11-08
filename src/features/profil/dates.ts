// Calculs de dates sur des jours "YYYY-MM-DD" (jour de Paris, comme activity_log.jour).
import { pad2, parisToday } from '../../lib/format'

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const toIso = (t: number) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export const addDays = (iso: string, n: number) => toIso(parse(iso) + n * 86_400_000)
/** 0 = lundi … 6 = dimanche */
export const dayOfWeek = (iso: string) => (new Date(parse(iso)).getUTCDay() + 6) % 7
export const mondayOf = (iso: string) => addDays(iso, -dayOfWeek(iso))
export const diffDays = (a: string, b: string) => Math.round((parse(b) - parse(a)) / 86_400_000)
/** Jour de Paris d'un instant (timestamptz). */
export const parisDay = (at: string | Date) => parisToday(new Date(at))

const DOW = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const MON = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MON_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const parts = (iso: string) => {
  const d = new Date(parse(iso))
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }
}
/** "mar. 10 nov." */
export const dayLabel = (iso: string) => {
  const p = parts(iso)
  return `${DOW[dayOfWeek(iso)]} ${p.day} ${MON[p.month]}`
}
export const monthShort = (iso: string) => MON[parts(iso).month]
export const dayOfMonth = (iso: string) => parts(iso).day
/** "2 septembre" (+ année si ce n'est pas l'année en cours) */
export const longDay = (iso: string) => {
  const p = parts(iso)
  const thisYear = parts(parisToday()).year
  return `${p.day === 1 ? '1er' : p.day} ${MON_LONG[p.month]}${p.year !== thisYear ? ` ${p.year}` : ''}`
}
/** "du 9 au 15 novembre" ou "du 30 novembre au 6 décembre" */
export const weekRangeLabel = (monday: string) => {
  const a = parts(monday)
  const b = parts(addDays(monday, 6))
  return a.month === b.month ? `du ${a.day} au ${b.day} ${MON_LONG[b.month]}` : `du ${a.day} ${MON_LONG[a.month]} au ${b.day} ${MON_LONG[b.month]}`
}
