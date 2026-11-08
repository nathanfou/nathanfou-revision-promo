// Valeurs des écrans LCD du profil.

/** "1 240" -> fantôme "8 888" de même longueur. */
export const ghostOf = (value: string) => value.replace(/\d/g, '8')

/** Rang "03" (ou "--" s'il n'est pas encore connu). */
export const rankValue = (rank: number | null) => (rank ? String(rank).padStart(2, '0') : '--')
