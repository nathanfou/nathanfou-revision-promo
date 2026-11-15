// Libellés d'échéance et d'intervalle (maquettes Flashcards / MobileCarte).
import { plural } from '../../lib/format'

/** Bouton ordinateur : "revient demain", "revient dans 3 jours". */
export const whenLong = (days: number) => (days <= 1 ? 'revient demain' : `revient dans ${days} jours`)
/** Bouton téléphone : "demain", "dans 3 j". */
export const whenShort = (days: number) => (days <= 1 ? 'demain' : `dans ${days} j`)
/** Pastille "Retour : 3 jours" (intervalle actuel) ; "Nouvelle" pour une carte jamais vue. */
export const tierLabel = (palier: number | null) => (palier == null ? 'Nouvelle' : plural(palier, 'jour'))
/** Fin de file : quand revient la prochaine carte. */
export const nextReturn = (days: number | null) =>
  days == null ? '' : days <= 1 ? 'Tes prochaines cartes reviendront demain.' : `Ta prochaine carte reviendra dans ${days} jours.`
/** Temps estimé : 20 s par carte (barème). */
export const estMinutes = (cards: number) => Math.max(1, Math.ceil((cards * 20) / 60))
/** Où en est la série : "Découverte : 3 cartes réussies sur 20", "File rouge : 5 cartes validées sur 20". */
export function runCounter(r: { done: boolean; phase: 'decouverte' | 'rouge'; learned: number; validated: number; total: number }, compact = false) {
  if (r.total === 0) return ''
  if (r.done) return compact ? `${r.total} sur ${r.total}` : `Série validée : ${plural(r.total, 'carte')}`
  if (r.phase === 'decouverte') return compact ? `Découverte, ${r.learned}/${r.total}` : `Découverte : ${r.learned} réussie${r.learned > 1 ? 's' : ''} sur ${r.total}`
  return compact ? `File rouge, ${r.validated}/${r.total}` : `File rouge : ${r.validated} validée${r.validated > 1 ? 's' : ''} sur ${r.total}`
}
