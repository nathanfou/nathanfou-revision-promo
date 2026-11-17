// Accès aux données du cours d'un chapitre (table courses, lecture seule).
import { supabase } from '../../lib/supabase'

export type Course = { chapterId: string; chapterNom: string; subjectNom: string; contenu: string; source: string | null } | null

/** Cours publié du chapitre, avec le nom du chapitre et de la matière ; null si le chapitre n'existe pas. */
export async function loadCourse(chapterId: string): Promise<{ chapterNom: string; subjectNom: string; course: Course }> {
  const [chapRes, courseRes] = await Promise.all([
    supabase.from('chapters').select('id, nom, subjects(nom)').eq('id', chapterId).maybeSingle(),
    supabase.from('courses').select('chapter_id, contenu, source').eq('chapter_id', chapterId).eq('statut', 'publie').maybeSingle(),
  ])
  if (chapRes.error) throw chapRes.error
  if (courseRes.error) throw courseRes.error
  const chap = chapRes.data
  if (!chap) return { chapterNom: '', subjectNom: '', course: null }
  const subj = chap.subjects as { nom: string } | { nom: string }[] | null
  const subjectNom = Array.isArray(subj) ? (subj[0]?.nom ?? '') : (subj?.nom ?? '')
  const c = courseRes.data
  return {
    chapterNom: chap.nom,
    subjectNom,
    course: c ? { chapterId: c.chapter_id, chapterNom: chap.nom, subjectNom, contenu: c.contenu, source: c.source } : null,
  }
}
