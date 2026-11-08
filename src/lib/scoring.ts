// Barème (spec, section "Points et classement") : 10 points par minute estimée.
// Affichage seulement : les points réels sont calculés par le serveur.
export const POINTS = {
  qcmCorrect: 10,
  flashcard: 3,
  exercise: (dureeMin: number) => dureeMin * 10,
  exercisePartial: (dureeMin: number) => Math.round(dureeMin * 10 * 0.5),
  exerciseRedo: (dureeMin: number) => Math.round(dureeMin * 10 * 0.25),
} as const

/** Durées fixes (minutes) pour estimer le temps de révision. */
export const DURATION_MIN = { qcm: 1, flashcard: 1 / 3 } as const
