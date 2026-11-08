// Fil de la promo en temps réel : la première page est rechargée dès qu'un post,
// une réponse ou une réaction change (Supabase Realtime sur feed_items et reactions).
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchFeed, PAGE_SIZE, setReaction, type Emoji, type FeedItem } from './api'

export type FeedState = {
  items: FeedItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => void
  reload: () => Promise<void>
  toggleReaction: (itemId: string, emoji: Emoji) => void
}

export function useFeed(userId: string): FeedState {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  // nombre d'éléments affichés : un rechargement temps réel garde la même longueur
  const shown = useRef(PAGE_SIZE)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reload = useCallback(async () => {
    try {
      const limit = Math.max(shown.current, PAGE_SIZE)
      const data = await fetchFeed(null, limit)
      setItems(data)
      setHasMore(data.length >= limit)
      setError(null)
    } catch {
      setError('Impossible de charger le fil. Vérifie ta connexion puis recharge la page.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    const last = items[items.length - 1]
    if (!last || loadingMore) return
    setLoadingMore(true)
    fetchFeed(last.created_at, PAGE_SIZE)
      .then((data) => {
        setItems((prev) => [...prev, ...data.filter((d) => !prev.some((p) => p.id === d.id))])
        shown.current = items.length + data.length
        setHasMore(data.length >= PAGE_SIZE)
      })
      .catch(() => setError('Impossible de charger la suite du fil.'))
      .finally(() => setLoadingMore(false))
  }, [items, loadingMore])

  useEffect(() => {
    void reload()
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void reload(), 250)
    }
    const channel = supabase
      .channel(`feed-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_items' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, schedule)
      .subscribe()
    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [reload, userId])

  const toggleReaction = useCallback(
    (itemId: string, emoji: Emoji) => {
      const target = itemsRef.current.find((it) => it.id === itemId)
      const on = !target?.reactions.find((r) => r.emoji === emoji)?.mine
      // mise à jour immédiate, confirmée par le rechargement temps réel
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId) return it
          const cur = it.reactions.find((r) => r.emoji === emoji)
          if (!!cur?.mine === on) return it
          const others = it.reactions.filter((r) => r.emoji !== emoji)
          const n = (cur?.n ?? 0) + (on ? 1 : -1)
          return { ...it, reactions: n > 0 ? [...others, { emoji, n, mine: on }] : others }
        }),
      )
      setReaction(userId, itemId, emoji, on).catch(() => void reload())
    },
    [userId, reload],
  )

  return { items, loading, error, hasMore, loadingMore, loadMore, reload, toggleReaction }
}
