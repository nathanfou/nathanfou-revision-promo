// Exercice. Maquette : docs/maquettes/Exercice.dc.html. Chantier "Exercices".
import { useParams } from 'react-router'
import { ExerciceScreen } from '../features/exercices/ExerciceScreen'

export default function Exercice() {
  const { exerciseId = '' } = useParams()
  // key : état remis à zéro (et session close) en passant à l'exercice suivant
  return <ExerciceScreen key={exerciseId} exerciseId={exerciseId} />
}
