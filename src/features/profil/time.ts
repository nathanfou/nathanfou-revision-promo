// Temps de révision estimé (spec : durées fixes de scoring.ts, durée annoncée pour les exercices).
import { DURATION_MIN } from '../../lib/scoring'
import { pad2 } from '../../lib/format'

export type TimeRow = { jour: string; subject_id: string; nb_qcm: number; nb_cartes: number; minutes_exo: number }

export const rowMinutes = (r: TimeRow) => r.nb_qcm * DURATION_MIN.qcm + r.nb_cartes * DURATION_MIN.flashcard + r.minutes_exo

/** 1150 -> "19h10" ; 45 -> "0h45" */
export const fmtHm = (minutes: number) => {
  const m = Math.round(minutes)
  return `${Math.floor(m / 60)}h${pad2(m % 60)}`
}

/** Libellé court pour une case du calendrier. */
export const fmtMinutes = (minutes: number) => {
  const m = Math.round(minutes)
  if (m < 60) return `${Math.max(1, m)} min`
  return m % 60 ? `${Math.floor(m / 60)} h ${pad2(m % 60)}` : `${m / 60} h`
}
