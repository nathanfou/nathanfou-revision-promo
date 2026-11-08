// Libellés d'échéance et de palier (maquettes Flashcards / MobileCarte).
import { plural } from '../../lib/format'

/** Bouton ordinateur : "revient demain", "revient dans 3 jours". */
export const whenLong = (days: number) => (days <= 1 ? 'revient demain' : `revient dans ${days} jours`)
/** Bouton téléphone : "demain", "dans 3 j". */
export const whenShort = (days: number) => (days <= 1 ? 'demain' : `dans ${days} j`)
/** Pastille "Palier : 3 jours" ; "Nouvelle" pour une carte jamais vue. */
export const tierLabel = (palier: number | null) => (palier == null ? 'Nouvelle' : plural(palier, 'jour'))
/** Fin de file : quand revient la prochaine carte. */
export const nextReturn = (days: number | null) =>
  days == null ? '' : days <= 1 ? 'Tes prochaines cartes reviendront demain.' : `Ta prochaine carte reviendra dans ${days} jours.`
/** Temps estimé : 20 s par carte (barème). */
export const estMinutes = (cards: number) => Math.max(1, Math.ceil((cards * 20) / 60))
