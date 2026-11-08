// Accès aux RPC du QCM (migration qcm_core). La correction ne vient que du serveur.
import { supabase } from '../../lib/supabase'

export type Variante = 'entrainement' | 'examen'

export type QcmQuestion = { id: string; enonce: string; choix: string[]; multiple: boolean }

/** Correction renvoyée en entraînement ; en examen, seulement { enregistre: true }. */
export type QcmCorrection = { correct: boolean; bonnes_reponses: string[]; explication: string | null; points: number }

export type QcmReviewAnswer = {
  no: number
  question_id: string
  enonce: string
  choix: string[]
  choix_eleve: string[]
  bonnes_reponses: string[]
  explication: string | null
  correct: boolean
  points: number
}

export type QcmReview = {
  session: {
    id: string
    chapter_id: string
    chapitre: string
    matiere: string
    variante: Variante
    started_at: string
    ended_at: string
    score: number
    points: number
    semaine_courante: boolean
  }
  progression: { total: number; avant: number; apres: number }
  reponses: QcmReviewAnswer[]
}

export const SERIES_LENGTH = 20

/** Lettre d'un choix : 0 -> "A". */
export const letter = (i: number) => String.fromCharCode(65 + i)
export const letterIndex = (l: string) => l.toUpperCase().charCodeAt(0) - 65

/** "B, texte du choix" (ou plusieurs, séparés par " ; "). */
export function describeChoices(letters: string[], choix: string[]) {
  return letters
    .map((l) => {
      const t = choix[letterIndex(l)]
      return t ? `${l}, ${t}` : l
    })
    .join(' ; ')
}

/** Message lisible pour une erreur Supabase ou réseau. */
export function errorMessage(e: unknown, fallback = 'Une erreur est survenue. Réessaie dans un instant.') {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    const m = (e as { message: string }).message
    if (m && !/fetch|network/i.test(m)) return m
  }
  return fallback
}

export async function fetchChapter(chapterId: string) {
  const { data, error } = await supabase.from('chapters').select('id, nom, subjects(nom)').eq('id', chapterId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const subj = data.subjects as { nom: string } | { nom: string }[] | null
  const matiere = Array.isArray(subj) ? subj[0]?.nom : subj?.nom
  return { id: data.id, nom: data.nom, matiere: matiere ?? '' }
}

export async function fetchQuestions(chapterId: string, ids?: string[]): Promise<QcmQuestion[]> {
  const { data, error } = await supabase.rpc('qcm_questions', {
    p_chapter_id: chapterId,
    p_limit: SERIES_LENGTH,
    ...(ids ? { p_question_ids: ids } : {}),
  })
  if (error) throw error
  return (data ?? []).map((q) => ({
    id: q.id,
    enonce: q.enonce,
    choix: Array.isArray(q.choix) ? q.choix.map((c) => String(c)) : [],
    multiple: q.multiple,
  }))
}

export async function startQcmSession(chapterId: string, variante: Variante) {
  const { data, error } = await supabase.rpc('start_session', { p_chapter_id: chapterId, p_mode: 'qcm', p_variante: variante })
  if (error) throw error
  return data
}

export async function submitAnswer(sessionId: string, questionId: string, choix: string[]) {
  const { data, error } = await supabase.rpc('submit_qcm_answer', { p_session_id: sessionId, p_question_id: questionId, p_choix: choix })
  if (error) throw error
  return data as unknown as QcmCorrection | { enregistre: true }
}

export async function endSession(sessionId: string) {
  const { error } = await supabase.rpc('end_session', { p_session_id: sessionId })
  if (error) throw error
}

export async function fetchReview(sessionId: string): Promise<QcmReview> {
  const { data, error } = await supabase.rpc('qcm_session_review', { p_session_id: sessionId })
  if (error) throw error
  return data as unknown as QcmReview
}
