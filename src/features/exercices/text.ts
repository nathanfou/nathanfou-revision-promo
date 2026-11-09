// Découpage du texte brut des énoncés et corrections (voir RichText.tsx).

import { estTexteLabo } from './labo/detect'

export type Block =
  | { kind: 'table'; rows: string[][] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'p'; lines: string[] }

const OL_RE = /^\d+[.)]\s+/
const UL_RE = /^[-•*]\s+/

export function parseBlocks(text: string): Block[] {
  const chunks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)
  const blocks: Block[] = []
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    if (lines.every((l) => l.startsWith('|'))) {
      const rows = lines
        .filter((l) => !/^\|[\s|:-]+\|?$/.test(l))
        .map((l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
      blocks.push({ kind: 'table', rows })
    } else if (lines.every((l) => OL_RE.test(l))) {
      blocks.push({ kind: 'ol', items: lines.map((l) => l.replace(OL_RE, '')) })
    } else if (lines.every((l) => UL_RE.test(l))) {
      blocks.push({ kind: 'ul', items: lines.map((l) => l.replace(UL_RE, '')) })
    } else {
      blocks.push({ kind: 'p', lines })
    }
  }
  return blocks
}

/**
 * Étapes numérotées de la correction (maquette : pastilles 1, 2, 3…).
 * Renvoie null si la correction contient autre chose que des lignes de texte
 * (tableau…), auquel cas on l'affiche avec RichText.
 */
export function correctionSteps(text: string): string[] | null {
  if (estTexteLabo(text)) return null
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2 || lines.some((l) => l.startsWith('|'))) return null
  return lines.map((l) => l.replace(OL_RE, '').replace(UL_RE, ''))
}
