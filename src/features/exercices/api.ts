// Accès aux données du chantier Exercices.
// La correction n'est jamais chargée avec l'énoncé : elle n'est lue qu'au clic
// "Afficher la correction" (loadCorrection).
import { supabase } from '../../lib/supabase'
import { parisToday } from '../../lib/format'
import type { Database } from '../../lib/database.types'

export type ExoResult = Extract<Database['public']['Enums']['activity_result'], 'reussi' | 'partiel' | 'a_refaire'>

/** Exercice sans sa correction. */
export type ExerciseLite = { id: string; titre: string; enonce: string; duree_min: number; ordre: number; chapter_id: string }

export type ChapterInfo = { id: string; nom: string; subjectNom: string }

/** Dernière déclaration de l'utilisateur sur un exercice. */
export type LastResult = { resultat: ExoResult; created_at: string; pointsToday: boolean }

const LITE = 'id, titre, enonce, duree_min, ordre, chapter_id'

export async function loadChapter(chapterId: string): Promise<ChapterInfo | null> {
  const { data, error } = await supabase.from('chapters').select('id, nom, subjects(nom)').eq('id', chapterId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const subj = data.subjects as { nom: string } | { nom: string }[] | null
  const subjectNom = Array.isArray(subj) ? (subj[0]?.nom ?? '') : (subj?.nom ?? '')
  return { id: data.id, nom: data.nom, subjectNom }
}

export async function loadChapterExercises(chapterId: string): Promise<ExerciseLite[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(LITE)
    .eq('chapter_id', chapterId)
    .eq('statut', 'publie')
    .order('ordre')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function loadExercise(exerciseId: string): Promise<ExerciseLite | null> {
  const { data, error } = await supabase.from('exercises').select(LITE).eq('id', exerciseId).maybeSingle()
  if (error) throw error
  return data
}

/** Lue seulement après le clic "Afficher la correction". */
export async function loadCorrection(exerciseId: string): Promise<string> {
  const { data, error } = await supabase.from('exercises').select('correction').eq('id', exerciseId).single()
  if (error) throw error
  return data.correction
}

/** Exercices de ma liste "à refaire" (parmi ceux donnés). */
export async function loadTodo(exerciseIds: string[]): Promise<Set<string>> {
  if (!exerciseIds.length) return new Set()
  const { data, error } = await supabase.from('exercise_todo').select('exercise_id').in('exercise_id', exerciseIds)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.exercise_id))
}

/** Dernière déclaration par exercice, et si des points ont déjà été gagnés aujourd'hui. */
export async function loadLastResults(exerciseIds: string[]): Promise<Map<string, LastResult>> {
  const out = new Map<string, LastResult>()
  if (!exerciseIds.length) return out
  const { data, error } = await supabase
    .from('activity_log')
    .select('item_id, resultat, points, jour, created_at')
    .eq('type', 'exo')
    .in('item_id', exerciseIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  const today = parisToday()
  const paidToday = new Set((data ?? []).filter((r) => r.jour === today && r.points > 0).map((r) => r.item_id))
  for (const r of data ?? []) {
    if (!out.has(r.item_id)) out.set(r.item_id, { resultat: r.resultat as ExoResult, created_at: r.created_at, pointsToday: paidToday.has(r.item_id) })
  }
  return out
}

export async function startExoSession(chapterId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_session', { p_chapter_id: chapterId, p_mode: 'exo' })
  if (error) throw error
  return data
}

export async function endExoSession(sessionId: string): Promise<void> {
  await supabase.rpc('end_session', { p_session_id: sessionId })
}

export type SubmitResult = { resultat: ExoResult; points: number; a_refaire: boolean; session_points: number }

export async function submitExercise(sessionId: string, exerciseId: string, resultat: ExoResult): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('submit_exercise', { p_session_id: sessionId, p_exercise_id: exerciseId, p_resultat: resultat })
  if (error) throw error
  return data as unknown as SubmitResult
}
