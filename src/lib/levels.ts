// Niveaux déduits des points cumulés (spec : "les premiers niveaux tombent vite,
// les suivants demandent de plus en plus de points"). Seuils provisoires :
// niveau n atteint à 100 × (n − 1)² points (0, 100, 400, 900, 1 600, 2 500…).
// Ajuster ici uniquement : tout l'affichage passe par levelInfo().

export const levelThreshold = (level: number) => 100 * (level - 1) ** 2

export type LevelInfo = {
  level: number
  /** points cumulés */
  points: number
  /** seuil du niveau actuel */
  floor: number
  /** seuil du niveau suivant */
  next: number
  /** points restants avant le niveau suivant */
  remaining: number
  /** avancement dans le niveau, entre 0 et 1 */
  progress: number
}

export function levelInfo(points: number): LevelInfo {
  const p = Math.max(0, points)
  const level = Math.floor(Math.sqrt(p / 100)) + 1
  const floor = levelThreshold(level)
  const next = levelThreshold(level + 1)
  return { level, points: p, floor, next, remaining: next - p, progress: (p - floor) / (next - floor) }
}
