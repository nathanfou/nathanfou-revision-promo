// Exercices du chapitre. Maquette : docs/maquettes/Exercice.dc.html. Chantier "Exercices".
import { useParams } from 'react-router'
import { ExercicesList } from '../features/exercices/ExercicesList'

export default function Exercices() {
  const { chapterId = '' } = useParams()
  return <ExercicesList key={chapterId} chapterId={chapterId} />
}
