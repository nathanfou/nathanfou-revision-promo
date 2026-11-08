// Chargement des données du profil privé (toutes lues côté base, filtrées sur l'utilisateur connecté).
import { useCallback, useEffect, useState } from 'react'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import type { TimeRow } from './time'

type Async<T> = { data: T | null; error: boolean; loading: boolean }

function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): Async<T> {
  const [state, setState] = useState<Async<T>>({ data: null, error: false, loading: true })
  useEffect(() => {
    let cancelled = false
    fn().then(
      (data) => !cancelled && setState({ data, error: false, loading: false }),
      () => !cancelled && setState({ data: null, error: true, loading: false }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export type Subject = { id: string; nom: string; ordre: number }
export type Chapter = { id: string; nom: string; ordre: number; subject_id: string }
export type ChapterProgress = { chapter_id: string; total: number; reussies: number }
export type ExamDay = { jour: string; nom: string }

export type ProfileContent = {
  subjects: Subject[]
  chapters: Chapter[]
  progress: Map<string, ChapterProgress>
  exams: { date: string; nom: string; subject: string | null }[]
}

/** Matières, chapitres, progression et contrôles. */
export function useProfileContent(): Async<ProfileContent> {
  return useQuery(async () => {
    const [s, c, p, e] = await Promise.all([
      supabase.from('subjects').select('id, nom, ordre').order('ordre').order('nom'),
      supabase.from('chapters').select('id, nom, ordre, subject_id').order('ordre').order('nom'),
      supabase.from('chapter_progress').select('chapter_id, total_questions, questions_reussies'),
      supabase.from('exams').select('date, nom, subjects(nom)').order('date'),
    ])
    if (s.error || c.error || p.error || e.error) throw new Error('profil')
    const progress = new Map<string, ChapterProgress>()
    for (const r of p.data) {
      if (r.chapter_id) progress.set(r.chapter_id, { chapter_id: r.chapter_id, total: r.total_questions ?? 0, reussies: r.questions_reussies ?? 0 })
    }
    return {
      subjects: s.data,
      chapters: c.data,
      progress,
      exams: e.data.map((x) => ({ date: x.date, nom: x.nom, subject: (x.subjects as { nom: string } | null)?.nom ?? null })),
    }
  }, [])
}

/** Activité par jour et par matière (RPC my_revision_time). */
export function useRevisionTime(): Async<TimeRow[]> {
  return useQuery(async () => {
    const { data, error } = await supabase.rpc('my_revision_time')
    if (error) throw error
    return data
  }, [])
}

export type SessionRow = Database['public']['Functions']['my_session_history']['Returns'][number]

const FIRST_PAGE = 6
const NEXT_PAGE = 10

/** Historique des sessions, paginé par date de début. */
export function useSessionHistory() {
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (before: string | null) => {
    setLoading(true)
    const limit = before ? NEXT_PAGE : FIRST_PAGE
    const { data, error: err } = await supabase.rpc('my_session_history', { p_limit: limit + 1, ...(before ? { p_before: before } : {}) })
    if (err) {
      setError(true)
    } else {
      setError(false)
      setHasMore(data.length > limit)
      setRows((prev) => (before ? [...prev, ...data.slice(0, limit)] : data.slice(0, limit)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Chargement initial : l'état passe par les callbacks asynchrones de load().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(null)
  }, [load])

  const more = () => {
    const last = rows[rows.length - 1]
    if (last) void load(last.started_at)
  }
  return { rows, loading, error, hasMore, more }
}
