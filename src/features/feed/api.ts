// Accès aux données du fil et du classement (RPC de la migration feed_notifications).
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

export const EMOJIS = [
  { e: '🔥', label: 'Feu' },
  { e: '👏', label: 'Bravo' },
  { e: '💪', label: 'Courage' },
  { e: '😂', label: 'Rire' },
] as const
export type Emoji = (typeof EMOJIS)[number]['e']

export const POST_MAX = 280
export const REPLY_MAX = 140
export const PAGE_SIZE = 20

export type ReactionCount = { emoji: Emoji; n: number; mine: boolean }
export type Reply = { id: string; user_id: string; pseudo: string; pp_id: string; texte: string; created_at: string }

/** Données d'un événement automatique (écrites par les triggers de feed_events). */
export type EventData =
  | {
      type: 'session'
      mode: Database['public']['Enums']['activity_mode']
      variante: Database['public']['Enums']['session_variant'] | null
      matiere: string | null
      chapitre: string | null
      items: number
      reussis: number
      points: number
    }
  | { type: 'top5' | 'premier'; rang: number; points: number }

export type FeedItem = {
  id: string
  kind: Database['public']['Enums']['feed_kind']
  user_id: string
  pseudo: string
  pp_id: string
  texte: string
  event_data: EventData | null
  created_at: string
  reactions: ReactionCount[]
  replies: Reply[]
}

export async function fetchFeed(before: string | null, limit = PAGE_SIZE): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('feed_page', { p_before: before ?? undefined, p_limit: limit })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...r,
    event_data: (r.event_data ?? null) as EventData | null,
    reactions: (r.reactions ?? []) as ReactionCount[],
    replies: (r.replies ?? []) as Reply[],
  }))
}

export async function publishPost(userId: string, texte: string) {
  const { error } = await supabase.from('feed_items').insert({ user_id: userId, kind: 'post', texte })
  if (error) throw error
}

export async function publishReply(userId: string, parentId: string, texte: string) {
  const { error } = await supabase.from('feed_items').insert({ user_id: userId, kind: 'reponse', parent_id: parentId, texte })
  if (error) throw error
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from('feed_items').delete().eq('id', id)
  if (error) throw error
}

export async function setReaction(userId: string, itemId: string, emoji: Emoji, on: boolean) {
  const { error } = on
    ? await supabase.from('reactions').insert({ feed_item_id: itemId, user_id: userId, emoji })
    : await supabase.from('reactions').delete().eq('feed_item_id', itemId).eq('user_id', userId).eq('emoji', emoji)
  // 23505 : réaction déjà présente (double clic) ; sans conséquence
  if (error && error.code !== '23505') throw error
}

// ---------------------------------------------------------------- Classement
export type Scope = 'week' | 'total'
export type RankRow = Database['public']['Functions']['leaderboard']['Returns'][number]

export async function fetchLeaderboard(scope: Scope, weekOf?: string): Promise<RankRow[]> {
  const { data, error } = await supabase.rpc('leaderboard', { p_scope: scope, p_week_of: weekOf })
  if (error) throw error
  return data ?? []
}

/** user_id -> rang il y a 24 h (vide si la semaine a moins de 24 h). */
export async function fetchMoves(scope: Scope): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('leaderboard_moves', { p_scope: scope })
  if (error) throw error
  return new Map((data ?? []).map((r) => [r.user_id, r.rang_veille]))
}
