// Semaines de classement (lundi 00h00 → dimanche 23h59, heure de Paris), même règle
// que public.paris_week_start côté base.
import { parisToday, pad2 } from '../../lib/format'

const TZ = 'Europe/Paris'
const DAY = 86_400_000

/** "2026-11-09" + n jours (dates calendaires, sans fuseau). */
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

/** Lundi (date de Paris, "YYYY-MM-DD") de la semaine contenant l'instant donné. */
export function parisMonday(at: Date = new Date()): string {
  const today = parisToday(at)
  const wd = new Date(`${today}T12:00:00Z`).getUTCDay() || 7 // 1 = lundi … 7 = dimanche
  return addDays(today, 1 - wd)
}

/** Instant à passer en p_week_of pour viser la semaine de ce lundi (midi UTC le lundi, sans ambiguïté). */
export const weekOfParam = (monday: string) => `${monday}T12:00:00Z`

/** Numéro de semaine ISO d'un lundi : "S46". */
export function weekNo(monday: string): string {
  const t = new Date(`${monday}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 3) // jeudi de la même semaine
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1)
  return `S${Math.ceil(((t.getTime() - yearStart) / DAY + 1) / 7)}`
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts }).format(new Date(`${date}T12:00:00Z`))

const dayNum = (date: string) => {
  const d = Number(date.slice(8, 10))
  return d === 1 ? '1er' : String(d)
}

/** "du lundi 9 au dimanche 15 novembre" (ou "… 2 novembre" si les mois diffèrent : "du lundi 26 octobre au dimanche 1er novembre"). */
export function weekLongRange(monday: string): string {
  const sunday = addDays(monday, 6)
  const m1 = fmt(monday, { month: 'long' })
  const m2 = fmt(sunday, { month: 'long' })
  return m1 === m2
    ? `du lundi ${dayNum(monday)} au dimanche ${dayNum(sunday)} ${m2}`
    : `du lundi ${dayNum(monday)} ${m1} au dimanche ${dayNum(sunday)} ${m2}`
}

/** "2 au 8 nov." ou "26 oct. au 1er nov." */
export function weekShortRange(monday: string): string {
  const sunday = addDays(monday, 6)
  const m1 = fmt(monday, { month: 'short' })
  const m2 = fmt(sunday, { month: 'short' })
  return m1 === m2 ? `${dayNum(monday)} au ${dayNum(sunday)} ${m2}` : `${dayNum(monday)} ${m1} au ${dayNum(sunday)} ${m2}`
}

/** Décalage de Paris par rapport à UTC à un instant donné, en minutes. */
function parisOffsetMin(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  )
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Temps restant avant lundi prochain 00h00 (Paris) : "5J:05H" découpé pour l'affichage LCD. */
export function untilNextWeek(now: Date = new Date()): { days: string; hours: string } {
  const next = addDays(parisMonday(now), 7)
  const guess = new Date(`${next}T00:00:00Z`)
  const start = guess.getTime() - parisOffsetMin(guess) * 60_000
  const ms = Math.max(0, start - now.getTime())
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / 3_600_000)
  return { days: String(days), hours: pad2(hours) }
}

/** "1er", "2e", "13e" */
export const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`)
