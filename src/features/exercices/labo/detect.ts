// Détection du format du Labo Graphes (séparée du moteur pour ne pas le charger inutilement).

/** Le texte utilise-t-il la syntaxe du Labo (formules, gras, encadrés, figures, pseudo-code) ? */
export function estTexteLabo(text: string): boolean {
  return /\[\[widget:|\$[^$\n]+\$|:::|\*\*[^*\n]+\*\*|```/.test(text)
}
