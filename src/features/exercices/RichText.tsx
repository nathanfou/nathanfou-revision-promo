// Mise en forme légère des énoncés et corrections (texte brut importé du CSV).
// Blocs séparés par une ligne vide :
//   * lignes "| a | b |"      -> tableau (la première colonne sert d'en-tête de ligne)
//   * lignes "1. ..." / "1) ..." -> liste numérotée
//   * lignes "- ..." / "• ..."  -> liste à puces
//   * sinon                     -> paragraphe (retours à la ligne conservés)
import type { CSSProperties, ReactNode } from 'react'
import { parseBlocks } from './text'

const cell: CSSProperties = { padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--mono)' }

export function RichText({ text, size = 16 }: { text: string; size?: number }) {
  const blocks = parseBlocks(text)
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'table') {
          return (
            <div key={i} style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: size - 1 }}>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j} style={j % 2 === 0 ? { backgroundColor: 'var(--chip)' } : undefined}>
                      <th scope="row" style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{r[0]}</th>
                      {r.slice(1).map((c, k) => (
                        <td key={k} style={cell}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.kind === 'ol' || b.kind === 'ul') {
          const List = b.kind
          return (
            <List key={i} style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 10, fontSize: size, lineHeight: 1.55 }}>
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </List>
          )
        }
        return (
          <p key={i} style={{ margin: 0, fontSize: size, lineHeight: 1.6, color: 'var(--text-2)' }}>
            {joinLines(b.lines)}
          </p>
        )
      })}
    </>
  )
}

function joinLines(lines: string[]): ReactNode {
  return lines.map((l, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {l}
    </span>
  ))
}
