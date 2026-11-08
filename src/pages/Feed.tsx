// Page Feed : classement + fil. Maquette : docs/maquettes/Feed.dc.html. Chantier "Feed".
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { useMe } from '../auth/AuthProvider'
import { Card, PageTitle } from '../components/ui'
import { fetchLeaderboard, fetchMoves, type RankRow } from '../features/feed/api'
import { Composer, FeedList } from '../features/feed/FeedList'
import { MyPositionCard, RankingCard, type BoardView } from '../features/feed/Leaderboard'
import { PastWeeksCard, usePastWeeks } from '../features/feed/PastWeeks'
import { useFeed } from '../features/feed/useFeed'
import { parisMonday, weekLongRange, weekNo } from '../features/feed/weeks'
import { NotificationsList } from '../features/notifications/NotificationsPanel'
import { useNotifications } from '../features/notifications/useNotifications'

type Boards = { week: RankRow[]; total: RankRow[]; movesWeek: Map<string, number>; movesTotal: Map<string, number> }

function useBoards() {
  const [boards, setBoards] = useState<Boards | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const [week, total, movesWeek, movesTotal] = await Promise.all([
        fetchLeaderboard('week'),
        fetchLeaderboard('total'),
        fetchMoves('week').catch(() => new Map<string, number>()),
        fetchMoves('total').catch(() => new Map<string, number>()),
      ])
      setBoards({ week, total, movesWeek, movesTotal })
      setError(null)
    } catch {
      setError('Vérifie ta connexion puis recharge la page.')
    }
  }, [])
  useEffect(() => {
    void load()
    // les points ne sont pas diffusés en temps réel : on rafraîchit chaque minute et au retour sur l'onglet
    const t = setInterval(() => void load(), 60_000)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])
  return { boards, error, reload: load }
}

export default function Feed() {
  const me = useMe()
  const monday = parisMonday()
  const { boards, error } = useBoards()
  const pastWeeks = usePastWeeks(monday)
  const [view, setView] = useState<BoardView>({ kind: 'week' })
  const feed = useFeed(me.id)
  const notifs = useNotifications()
  const { hash } = useLocation()
  const highlightId = hash.startsWith('#item-') ? hash.slice(6) : null

  // lien depuis une notification : faire défiler jusqu'au post une fois le fil chargé
  useEffect(() => {
    if (!highlightId || feed.loading) return
    document.getElementById(`item-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, feed.loading])

  const totals = useMemo(() => new Map((boards?.total ?? []).map((r) => [r.user_id, r.points])), [boards])
  const pastRows = view.kind === 'past' ? (pastWeeks?.find((w) => w.monday === view.monday)?.rows ?? []) : []
  const rows = view.kind === 'week' ? (boards?.week ?? []) : view.kind === 'total' ? (boards?.total ?? []) : pastRows
  const moves = view.kind === 'week' ? boards?.movesWeek : view.kind === 'total' ? boards?.movesTotal : undefined

  return (
    <>
      <PageTitle title="Feed" subtitle={`Semaine ${weekNo(monday).slice(1)}, ${weekLongRange(monday)}.`} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
        <RankingCard view={view} onView={setView} rows={rows} totals={totals} moves={moves ?? new Map()} loading={!boards} error={error} />
        <MyPositionCard view={view} rows={rows} meId={me.id} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', marginTop: 8 }}>
        <section className="rise" aria-labelledby="t-fil" style={{ animationDelay: '240ms', flex: '7 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 id="t-fil" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Fil de la promo</h2>
          <Composer userId={me.id} onPosted={() => void feed.reload()} />
          <FeedList feed={feed} meId={me.id} isAdmin={me.is_admin} highlightId={highlightId} />
        </section>

        <aside className="rise" style={{ animationDelay: '320ms', flex: '4 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PastWeeksCard
            weeks={pastWeeks}
            meId={me.id}
            selected={view.kind === 'past' ? view.monday : null}
            onSelect={(w) => {
              setView(view.kind === 'past' && view.monday === w.monday ? { kind: 'week' } : { kind: 'past', monday: w.monday, label: `Semaine ${weekNo(w.monday).slice(1)}` })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
          <Card aria-labelledby="t-notif" padding="20px 12px 12px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 10px 8px' }}>
              <h2 id="t-notif" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Notifications</h2>
              {notifs.unread > 0 && <span style={{ padding: '1px 8px', borderRadius: 999, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontSize: 12, fontWeight: 600 }}>{notifs.unread}</span>}
              {notifs.unread > 0 && (
                <button type="button" onClick={notifs.markAllRead} style={{ marginLeft: 'auto', border: 0, padding: 0, background: 'none', color: 'var(--link)', fontSize: 13, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Tout lire
                </button>
              )}
            </div>
            <NotificationsList state={notifs} />
          </Card>
        </aside>
      </div>
    </>
  )
}
