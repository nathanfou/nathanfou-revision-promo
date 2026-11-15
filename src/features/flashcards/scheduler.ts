// Ordre des cartes dans une série, façon Anki (fonctions pures, état sérialisable).
//
// 1. Découverte : les cartes passent dans l'ordre du programme. Une carte ratée revient
//    de plus en plus tôt (5, puis 3, puis 2 cartes plus loin). Une carte réussie part en
//    file rouge, sauf si elle doit encore être réussie une fois dans la découverte : elle
//    revient alors 8 cartes plus loin.
// 2. File rouge : quand toutes les cartes ont été réussies, elles repassent dans un ordre
//    mélangé. Une erreur la fait revenir selon la même règle que plus haut.
//
// Réussites demandées selon le nombre d'erreurs dans la série :
//   0 ou 1 erreur : 1 en découverte + 1 en rouge
//   2 erreurs     : 2 en découverte + 1 en rouge
//   3 erreurs et plus : 2 en découverte + 2 en rouge
// Le score de maîtrise et le retour les jours suivants sont calculés par le serveur.

export type Phase = 'decouverte' | 'rouge'

export type Track = { errors: number; disc: number; red: number }

export type Sched = {
  phase: Phase
  /** Cartes à venir ; la première est la carte affichée. */
  queue: string[]
  /** Cartes réussies en découverte, en attente de la file rouge. */
  redPool: string[]
  tracks: Record<string, Track>
  /** Cartes validées (sorties de la série). */
  done: string[]
  answers: number
}

/** Distance de retour après une erreur, selon le nombre d'erreurs de la carte. */
export const errorGap = (errors: number) => (errors <= 1 ? 5 : errors === 2 ? 3 : 2)
/** Distance de retour après une réussite qui ne suffit pas encore. */
export const SUCCESS_GAP = 8

export const discNeeded = (errors: number) => (errors >= 2 ? 2 : 1)
export const redNeeded = (errors: number) => (errors >= 3 ? 2 : 1)

export function newSched(ids: string[]): Sched {
  const tracks: Record<string, Track> = {}
  for (const id of ids) tracks[id] = { errors: 0, disc: 0, red: 0 }
  return { phase: 'decouverte', queue: [...ids], redPool: [], tracks, done: [], answers: 0 }
}

/** Place la carte `gap` cartes plus loin (1 = tout de suite), ou en fin de file. */
function insertAt(queue: string[], id: string, gap: number) {
  const pos = Math.min(Math.max(gap - 1, 0), queue.length)
  queue.splice(pos, 0, id)
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Applique la réponse à la carte affichée (queue[0]) et renvoie le nouvel état. */
export function answer(s: Sched, ok: boolean, rand: () => number = Math.random): Sched {
  const id = s.queue[0]
  if (id === undefined) return s
  const queue = s.queue.slice(1)
  const redPool = [...s.redPool]
  const done = [...s.done]
  const t = { ...s.tracks[id] }
  let phase = s.phase

  if (!ok) {
    t.errors += 1
    insertAt(queue, id, errorGap(t.errors))
  } else if (phase === 'decouverte') {
    t.disc += 1
    if (t.disc >= discNeeded(t.errors)) redPool.push(id)
    else insertAt(queue, id, SUCCESS_GAP)
  } else {
    t.red += 1
    if (t.red >= redNeeded(t.errors)) done.push(id)
    else insertAt(queue, id, SUCCESS_GAP)
  }

  let next = queue
  let pool = redPool
  if (phase === 'decouverte' && next.length === 0) {
    phase = 'rouge'
    next = shuffle(pool, rand)
    pool = []
  }
  return { phase, queue: next, redPool: pool, tracks: { ...s.tracks, [id]: t }, done, answers: s.answers + 1 }
}

export const current = (s: Sched): string | null => s.queue[0] ?? null
export const isFinished = (s: Sched) => s.phase === 'rouge' && s.queue.length === 0

/** Avancement de 0 à 1 : réussites obtenues sur réussites demandées (toutes cartes). */
export function progress(s: Sched): number {
  let got = 0
  let need = 0
  for (const t of Object.values(s.tracks)) {
    const d = discNeeded(t.errors)
    const r = redNeeded(t.errors)
    need += d + r
    got += Math.min(t.disc, d) + Math.min(t.red, r)
  }
  return need === 0 ? 0 : got / need
}

/** Cartes réussies au moins une fois en découverte (en rouge ou validées). */
export const discovered = (s: Sched) => Object.values(s.tracks).filter((t) => t.disc >= discNeeded(t.errors)).length

/** Vérifie une copie reprise du sessionStorage. */
export function isSched(x: unknown): x is Sched {
  const s = x as Sched
  return !!s && (s.phase === 'decouverte' || s.phase === 'rouge') && Array.isArray(s.queue) && Array.isArray(s.redPool)
    && Array.isArray(s.done) && typeof s.tracks === 'object' && s.tracks !== null && typeof s.answers === 'number'
}
