// Cours d'un chapitre (fiche au format du Labo).
import { useParams } from 'react-router'
import { CoursPage } from '../features/cours/CoursPage'

export default function Cours() {
  const { chapterId = '' } = useParams()
  return <CoursPage key={chapterId} chapterId={chapterId} />
}
