// Notifications in-app (spec : pastilles, pas d'e-mail ni de push).
// Source : RPC my_notifications (réponses et réactions à mes posts et événements),
// état "lu" stocké en base (notifications.read_at, RPC mark_notifications_read).
// Un seul abonnement temps réel partagé entre la cloche (AppHeader) et la page Feed.
import { useSyncExternalStore } from 'react'
import { supabase } from '../../lib/supabase'

export type AppNotification = {
  id: string
  /** "person" : avatar d'un camarade ; "system" : icône */
  kind: 'person' | 'system'
  ppId?: string
  text: string
  detail?: string
  createdAt: string
  unread: boolean
  /** lien optionnel (ex. vers le post) */
  href?: string
  action?: { label: string; href: string }
}

export type NotificationsState = {
  items: AppNotification[]
  unread: number
  markAllRead: () => void
  markRead: (id: string) => void
}

type Store = { items: AppNotification[]; unread: number }

let store: Store = { items: [], unread: 0 }
const listeners = new Set<() => void>()
let channel: ReturnType<typeof supabase.channel> | null = null
let timer: ReturnType<typeof setTimeout> | undefined

const emit = (items: AppNotification[]) => {
  store = { items, unread: items.filter((n) => n.unread).length }
  listeners.forEach((l) => l())
}

const clip = (s: string | null, max = 90) => {
  if (!s) return undefined
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

async function load() {
  const { data, error } = await supabase.rpc('my_notifications', { p_limit: 30 })
  if (error || !data) return
  emit(
    data.map((n) => {
      const who = n.actor_pseudo ?? 'Quelqu’un'
      const target = n.post_kind === 'event' ? 'ton activité' : n.item_id !== n.post_id ? 'ta réponse' : 'ton post'
      const isReply = n.kind === 'reponse'
      return {
        id: n.id,
        kind: n.actor_pp_id ? 'person' : 'system',
        ppId: n.actor_pp_id ?? undefined,
        text: isReply ? `${who} a répondu à ${n.post_kind === 'event' ? 'ton activité' : 'ton post'}` : `${who} a réagi ${n.emoji ?? ''} à ${target}`,
        detail: clip(isReply ? n.item_texte : n.post_texte),
        createdAt: n.created_at,
        unread: !(n.read_at as string | null),
        href: n.post_id ? `/feed#item-${n.post_id}` : '/feed',
      } satisfies AppNotification
    }),
  )
}

function start() {
  void load()
  channel = supabase
    .channel('my-notifications')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
      clearTimeout(timer)
      timer = setTimeout(() => void load(), 250)
    })
    .subscribe()
}

function stop() {
  clearTimeout(timer)
  if (channel) void supabase.removeChannel(channel)
  channel = null
  store = { items: [], unread: 0 }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) stop()
  }
}

async function markRead(ids: string[] | null) {
  const targets = ids ?? store.items.filter((n) => n.unread).map((n) => n.id)
  if (targets.length === 0) return
  emit(store.items.map((n) => (targets.includes(n.id) ? { ...n, unread: false } : n)))
  const { error } = await supabase.rpc('mark_notifications_read', ids ? { p_ids: ids } : {})
  if (error) void load()
}

const actions = {
  markAllRead: () => void markRead(null),
  markRead: (id: string) => void markRead([id]),
}

export function useNotifications(): NotificationsState {
  const snap = useSyncExternalStore(subscribe, () => store)
  return { items: snap.items, unread: snap.unread, ...actions }
}
