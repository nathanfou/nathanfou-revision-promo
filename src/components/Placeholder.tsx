// Écran provisoire du socle, remplacé par chaque chantier.
import { Card, EmptyState, ButtonLink } from './ui'

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <Card className="rise">
      <EmptyState title={title} action={<ButtonLink to="/" variant="ghost">Retour à la révision</ButtonLink>}>
        {note ?? 'Cet écran arrive très bientôt.'}
      </EmptyState>
    </Card>
  )
}
