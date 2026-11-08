// Données de la page Révision : contenu, progression, contrôles, dernière session,
// exercices à refaire. Tout vient de la base (RLS : seulement le contenu publié et les
// données de l'utilisateur connecté).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

type Mode = Database['public']['Enums']['activity_mode']
type Variante = Database['public']['Enums']['session_variant']

export type ChapterInfo = {
  id: string
  subjectId: string
  nom: string
  /** Part des QCM publiés réussis au moins une fois (0 à 1). */
  progression: number
  questionsReussies: number
  nbQcm: number
  nbCartes: number
  cartesDues: number
  cartesNouvelles: number
  nbExercices: number
  exoDureeMin: number | null
  exoDureeMax: number | null
}

export type SubjectInfo = {
  id: string
  nom: string
  chapters: ChapterInfo[]
  progression: number
  cartesDues: number
  /** Prochain contrôle de la matière (date ISO), s'il y en a un. */
  nextExam: ExamInfo | null
}

export type ExamInfo = { id: string; nom: string; date: string; subjectId: string; subjectNom: string }

export type LastSession = {
  id: string
  mode: Mode
  variante: Variante | null
  chapterId: string | null
  chapterNom: string | null
  subjectNom: string | null
  terminee: boolean
  /** Réponses données dans la session. */
  repondues: number
  score: number
  points: number
  /** Taille de la série quand on la connaît (QCM ou exercices du chapitre, cartes du chapitre). */
  total: number | null
}

export type RedoItem = { id: string; titre: string; dureeMin: number; chapterNom: string; subjectNom: string }

export type RevisionData = {
  subjects: SubjectInfo[]
  exams: ExamInfo[]
  lastSession: LastSession | null
  redo: RedoItem[]
  /** Cartes dues aujourd'hui, toutes matières. */
  dueTotal: number
}

/** "Partiel de biochimie" si le nom cite déjà la matière, sinon "Biochimie, Partiel". */
export function examLabel(x: ExamInfo) {
  return x.nom.toLowerCase().includes(x.subjectNom.toLowerCase()) ? x.nom : `${x.subjectNom}, ${x.nom}`
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: RevisionData }

const must = <T>(res: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (res.error) throw new Error(`${what} : ${res.error.message}`)
  return res.data as T
}

async function load(): Promise<RevisionData> {
  const nowIso = new Date().toISOString()
  const [subjectsRes, chaptersRes, examsRes, progressRes, overviewRes, sessionsRes, todoRes] = await Promise.all([
    supabase.from('subjects').select('id, nom, ordre').order('ordre').order('nom'),
    supabase.from('chapters').select('id, subject_id, nom, ordre').order('ordre').order('nom'),
    supabase.from('exams').select('id, subject_id, nom, date').gte('date', nowIso).order('date'),
    supabase.from('chapter_progress').select('chapter_id, progression, questions_reussies'),
    supabase.rpc('revision_overview'),
    supabase.from('sessions').select('id, chapter_id, mode, variante, started_at, ended_at, score, points').order('started_at', { ascending: false }).limit(10),
    supabase.from('exercise_todo').select('exercise_id, added_at, exercises(id, titre, duree_min, chapter_id)').order('added_at', { ascending: false }),
  ])

  const subjectsRows = must(subjectsRes, 'matières')
  const chaptersRows = must(chaptersRes, 'chapitres')
  const examsRows = must(examsRes, 'contrôles')
  const progressRows = must(progressRes, 'progression')
  const overviewRows = must(overviewRes, 'compteurs')
  const sessionsRows = must(sessionsRes, 'sessions')
  const todoRows = must(todoRes, 'exercices à refaire')

  const subjectNom = new Map(subjectsRows.map((s) => [s.id, s.nom]))
  const progress = new Map(progressRows.map((p) => [p.chapter_id, p]))
  const overview = new Map(overviewRows.map((o) => [o.chapter_id, o]))

  const exams: ExamInfo[] = examsRows.map((e) => ({ id: e.id, nom: e.nom, date: e.date, subjectId: e.subject_id, subjectNom: subjectNom.get(e.subject_id) ?? '' }))

  const chapters: ChapterInfo[] = chaptersRows.map((c) => {
    const p = progress.get(c.id)
    const o = overview.get(c.id)
    return {
      id: c.id,
      subjectId: c.subject_id,
      nom: c.nom,
      progression: Number(p?.progression ?? 0),
      questionsReussies: Number(p?.questions_reussies ?? 0),
      nbQcm: o?.nb_qcm ?? 0,
      nbCartes: o?.nb_cartes ?? 0,
      cartesDues: o?.cartes_dues ?? 0,
      cartesNouvelles: o?.cartes_nouvelles ?? 0,
      nbExercices: o?.nb_exercices ?? 0,
      exoDureeMin: o?.exo_duree_min ?? null,
      exoDureeMax: o?.exo_duree_max ?? null,
    }
  })
  const chapterById = new Map(chapters.map((c) => [c.id, c]))

  const subjects: SubjectInfo[] = subjectsRows.map((s) => {
    const list = chapters.filter((c) => c.subjectId === s.id)
    const total = list.reduce((n, c) => n + c.nbQcm, 0)
    const done = list.reduce((n, c) => n + Math.min(c.questionsReussies, c.nbQcm), 0)
    return {
      id: s.id,
      nom: s.nom,
      chapters: list,
      progression: total ? done / total : 0,
      cartesDues: list.reduce((n, c) => n + c.cartesDues, 0),
      nextExam: exams.find((e) => e.subjectId === s.id) ?? null,
    }
  })

  // Reprendre : dernière session non terminée (parmi les 10 dernières), sinon la dernière.
  const pick = sessionsRows.find((s) => !s.ended_at) ?? sessionsRows[0]
  let lastSession: LastSession | null = null
  if (pick) {
    const { count } = await supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('session_id', pick.id)
    const chap = pick.chapter_id ? chapterById.get(pick.chapter_id) : undefined
    const total = !chap ? null : pick.mode === 'qcm' ? chap.nbQcm : pick.mode === 'exo' ? chap.nbExercices : chap.nbCartes
    lastSession = {
      id: pick.id,
      mode: pick.mode,
      variante: pick.variante,
      chapterId: pick.chapter_id,
      chapterNom: chap?.nom ?? null,
      subjectNom: chap ? (subjectNom.get(chap.subjectId) ?? null) : null,
      terminee: !!pick.ended_at,
      repondues: count ?? 0,
      score: pick.score,
      points: pick.points,
      total: total || null,
    }
  }

  const redo: RedoItem[] = todoRows.flatMap((t) => {
    const ex = t.exercises
    if (!ex) return [] // exercice dépublié
    const chap = chapterById.get(ex.chapter_id)
    return [{ id: ex.id, titre: ex.titre, dureeMin: ex.duree_min, chapterNom: chap?.nom ?? '', subjectNom: chap ? (subjectNom.get(chap.subjectId) ?? '') : '' }]
  })

  return { subjects, exams, lastSession, redo, dueTotal: chapters.reduce((n, c) => n + c.cartesDues, 0) }
}

export function useRevisionData() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const reload = useCallback(() => {
    load()
      .then((data) => setState({ status: 'ready', data }))
      .catch((e: unknown) => setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { state, reload }
}
