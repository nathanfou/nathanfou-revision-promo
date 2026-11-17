// Encart rétro "Merci" : crédite l'auteur du contenu d'origine d'un cours (colonne courses.source).
import { Kata, LcdLabel, lcdScreenStyle } from '../../components/Lcd'
import { PixelLeaf } from '../../components/Leaves'
import { Card } from '../../components/ui'

export function Remerciement({ source }: { source: string }) {
  return (
    <Card
      tone="ink"
      padding="18px 20px"
      radius={18}
      className="rise"
      aria-label={`Remerciements : ce cours reprend le résumé de ${source}`}
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 22px', animationDelay: '80ms' }}
    >
      <div style={{ ...lcdScreenStyle, padding: '10px 16px', minWidth: 0 }}>
        <LcdLabel>MERCI À</LcdLabel>
        <div className="lcd" style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 34, lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {source}
          <span aria-hidden="true" className="blink" style={{ fontSize: 26 }}>_</span>
        </div>
      </div>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--caramel)' }}>&gt; CRÉDITS</span>
          <Kata>アリガトウ</Kata>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-text)' }}>
          Ce cours reprend le résumé PDF de <strong style={{ color: 'var(--caramel)' }}>{source}</strong>, relu et adapté pour la plateforme. Merci pour le partage !
        </p>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <PixelLeaf shape="A" size={22} color="orange" rotate={-12} />
        <PixelLeaf shape="B" size={28} color="bronze" rotate={8} />
        <PixelLeaf shape="A" size={18} color="gold" rotate={20} />
      </div>
    </Card>
  )
}
