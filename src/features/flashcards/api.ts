// Accès base des flashcards (migration 20261108221135_flashcards).
// Le score de maîtrise, le retour les jours suivants et les points sont calculés côté serveur
// (migration 20261115220958_flashcards_score) ; l'ordre dans la série est géré par scheduler.ts.
import { supabase } from '../../lib/supabase'

export type Note = 'a_revoir' | 'difficile' | 'bien'

/** Ordre des boutons (touches 1, 2, 3) : À revoir à gauche, Bien au milieu (choix par défaut, Entrée), Difficile à droite. */
export const NOTES: Note[] = ['a_revoir', 'bien', 'difficile']

export type QueueCard = {
  id: string
  chapterId: string
  chapterNom: string
  subjectNom: string
  recto: string
  verso: string
  isNew: boolean
  /** intervalle actuel en jours (null pour une carte jamais vue) */
  palier: number | null
  /** score de maîtrise, 0 à 100 */
  score: number
  /** prochain intervalle (jours) selon la note choisie */
  next: Record<Note, number>
}

export type ReviewResult = { palier: number; due_date: string; points: number; nouvelle: boolean; score: number; next: Record<Note, number> }

export type ChapterOverview = {
  chapterId: string
  chapterNom: string
  subjectId: string
  subjectNom: string
  due: number
  fresh: number
  total: number
}

/** File : cartes dues aujourd'hui (Paris) puis jusqu'à `newLimit` nouvelles cartes. */
export async function fetchQueue(chapterId: string | null, newLimit: number): Promise<QueueCard[]> {
  const { data, error } = await supabase.rpc('flashcard_queue', {
    ...(chapterId ? { p_chapter_id: chapterId } : {}),
    p_new_limit: newLimit,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.flashcard_id,
    chapterId: r.chapter_id,
    chapterNom: r.chapter_nom,
    subjectNom: r.subject_nom,
    recto: r.recto,
    verso: r.verso,
    isNew: r.is_new,
    palier: (r.palier as number | null) ?? null,
    score: r.score,
    next: { a_revoir: r.next_a_revoir, difficile: r.next_difficile, bien: r.next_bien },
  }))
}

export async function fetchOverview(): Promise<ChapterOverview[]> {
  const { data, error } = await supabase.rpc('flashcard_overview')
  if (error) throw error
  return (data ?? []).map((r) => ({
    chapterId: r.chapter_id,
    chapterNom: r.chapter_nom,
    subjectId: r.subject_id,
    subjectNom: r.subject_nom,
    due: r.due_count,
    fresh: r.new_count,
    total: r.total_count,
  }))
}

export async function fetchChapterLabel(chapterId: string): Promise<{ chapter: string; subject: string } | null> {
  const { data } = await supabase.from('chapters').select('nom, subjects(nom)').eq('id', chapterId).maybeSingle()
  if (!data) return null
  const subj = data.subjects as { nom: string } | { nom: string }[] | null
  const subject = Array.isArray(subj) ? (subj[0]?.nom ?? '') : (subj?.nom ?? '')
  return { chapter: data.nom, subject }
}

export async function startFlashcardSession(chapterId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('start_session', { p_chapter_id: chapterId as string, p_mode: 'flashcard' })
  if (error || !data) throw error ?? new Error('Session non créée')
  return data
}

export async function reviewFlashcard(sessionId: string, cardId: string, note: Note): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc('review_flashcard', { p_session_id: sessionId, p_flashcard_id: cardId, p_note: note })
  if (error) throw error
  return data as unknown as ReviewResult
}

export async function endFlashcardSession(sessionId: string) {
  await supabase.rpc('end_session', { p_session_id: sessionId })
}
