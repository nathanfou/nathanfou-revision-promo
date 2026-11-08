// Formats d'affichage partagés (français, heure de Paris).

const TZ = 'Europe/Paris'

/** 1240 -> "1 240" (espace fine insécable). */
export const fmtInt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/** 7 -> "07" */
export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Date du jour à Paris, "YYYY-MM-DD" (même convention que activity_log.jour et card_states.due_date). */
export const parisToday = (at: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)

/** Nombre de jours calendaires (Paris) entre aujourd'hui et la date. */
export const daysUntil = (date: string | Date, now: Date = new Date()) => {
  const a = Date.parse(parisToday(now))
  const b = Date.parse(parisToday(new Date(date)))
  return Math.round((b - a) / 86_400_000)
}

/** "J-06" ; "J-0" le jour même. */
export const jMinus = (days: number) => (days <= 0 ? 'J-0' : `J-${pad2(days)}`)

/** "mar. 10 nov." */
export const fmtShortDate = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d))

/** "Mardi 10 novembre" */
export const fmtLongDate = (d: string | Date = new Date()) => {
  const s = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "21:05" */
export const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(d))

/** "il y a 5 min", "hier", "il y a 3 j" */
export const fmtAgo = (d: string | Date, now: Date = new Date()) => {
  const s = Math.max(0, (now.getTime() - new Date(d).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  const days = -daysUntil(d, now)
  if (days <= 1) return 'hier'
  return `il y a ${days} j`
}

/** Salutation selon l'heure de Paris. */
export const greeting = (now: Date = new Date()) => {
  const h = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: 'numeric', hour12: false }).format(now))
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'
}

/** Numéro de semaine ISO, "S46". */
export const isoWeekLabel = (d: Date = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `S${Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)}`
}

/** Pluriel simple : plural(3, 'carte') -> "3 cartes". */
export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${fmtInt(n)} ${n > 1 ? pluralWord : word}`

/** Jours avant lundi prochain (remise à zéro du classement de la semaine, heure de Paris). */
export const daysUntilMonday = (now: Date = new Date()) => {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(now)
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd)
  return 7 - idx
}
