import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Points de l'utilisateur connecté (pastille de la barre de navigation, profil…).
// Source : RPC leaderboard (calculé côté serveur depuis activity_log).
// Après une RPC qui rapporte des points, appeler refreshMyPoints().

export type MyPoints = { total: number; week: number; weekRank: number | null; promoSize: number; loaded: boolean }

let state: MyPoints = { total: 0, week: 0, weekRank: null, promoSize: 0, loaded: false }
const listeners = new Set<() => void>()
let inflight: Promise<void> | null = null

export function refreshMyPoints(): Promise<void> {
  if (inflight) return inflight
  inflight = (async () => {
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) return
    const [total, week] = await Promise.all([
      supabase.rpc('leaderboard', { p_scope: 'total' }),
      supabase.rpc('leaderboard', { p_scope: 'week' }),
    ])
    const meT = total.data?.find((r) => r.user_id === uid)
    const meW = week.data?.find((r) => r.user_id === uid)
    state = {
      total: meT?.points ?? 0,
      week: meW?.points ?? 0,
      weekRank: meW?.rang ?? null,
      promoSize: week.data?.length ?? 0,
      loaded: true,
    }
    listeners.forEach((l) => l())
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function useMyPoints(): MyPoints {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
  useEffect(() => {
    if (!state.loaded) void refreshMyPoints()
  }, [])
  return snap
}
