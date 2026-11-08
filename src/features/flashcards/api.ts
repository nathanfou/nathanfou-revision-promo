// Accès base des flashcards (migration 20261108221135_flashcards).
// Le calendrier (paliers 1/3/7/14 j) et les points sont calculés côté serveur.
import { supabase } from '../../lib/supabase'

export type Note = 'a_revoir' | 'bien' | 'facile'

export type QueueCard = {
  id: string
  chapterId: string
  chapterNom: string
  subjectNom: string
  recto: string
  verso: string
  isNew: boolean
  /** palier actuel (null pour une carte jamais vue) */
  palier: number | null
  /** prochain intervalle (jours) selon la note choisie */
  next: Record<Note, number>
}

export type ReviewResult = { palier: number; due_date: string; points: number; nouvelle: boolean }

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
    next: { a_revoir: r.next_a_revoir, bien: r.next_bien, facile: r.next_facile },
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
