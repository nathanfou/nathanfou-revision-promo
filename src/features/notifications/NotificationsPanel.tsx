// Panneau des notifications (maquette Notifications.dc.html), ouvert depuis la cloche.
// Groupes "Aujourd'hui" / "Plus tôt" ; un clic ouvre le post dans le fil et marque la notification lue.
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icons'
import { fmtAgo, parisToday } from '../../lib/format'
import type { AppNotification, NotificationsState } from './useNotifications'

function NotificationRow({ n, onOpen, compact }: { n: AppNotification; onOpen: () => void; compact?: boolean }) {
  const body = (
    <>
      {!compact &&
        (n.kind === 'person' && n.ppId ? (
          <Avatar ppId={n.ppId} size={38} />
        ) : (
          <span aria-hidden="true" style={{ flex: '0 0 38px', width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, backgroundColor: 'var(--chip-strong)', color: 'var(--link)' }}>
            <Icon name="medal" size={18} />
          </span>
        ))}
      {compact && <span aria-hidden="true" style={{ flex: '0 0 8px', width: 8, height: 8, marginTop: 7, borderRadius: 999, backgroundColor: n.unread ? 'var(--accent)' : 'transparent' }} />}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 2 : 4 }}>
        <span style={{ fontSize: compact ? 15 : 14, lineHeight: 1.4, fontWeight: n.unread ? 600 : 400, color: n.unread ? 'var(--text)' : 'var(--text-2)' }}>{n.text}</span>
        {n.detail && !compact && <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--muted)', overflowWrap: 'anywhere' }}>{n.detail}</span>}
        <span style={{ fontSize: compact ? 13 : 12, color: 'var(--muted)' }}>
          {fmtAgo(n.createdAt)}
          {n.unread && <span className="sr-only">, non lue</span>}
        </span>
      </span>
      {n.unread && !compact && <span aria-hidden="true" style={{ flex: '0 0 8px', width: 8, height: 8, marginTop: 6, borderRadius: 999, backgroundColor: 'var(--accent)' }} />}
    </>
  )
  const style = { display: 'flex', gap: 12, padding: compact ? 10 : '12px 10px', borderRadius: compact ? 12 : 14, backgroundColor: n.unread && !compact ? 'var(--chip)' : undefined, textDecoration: 'none', color: 'inherit' } as const
  return (
    <li>
      {n.href ? (
        <Link className="row" to={n.href} onClick={onOpen} style={style}>
          {body}
        </Link>
      ) : (
        <div style={style}>{body}</div>
      )}
    </li>
  )
}

/** Liste compacte (encart de la page Feed). */
export function NotificationsList({ state, limit = 5, onOpen }: { state: NotificationsState; limit?: number; onOpen?: () => void }) {
  const items = state.items.slice(0, limit)
  if (items.length === 0) return <p style={{ margin: 0, padding: '8px 10px 12px', fontSize: 14, color: 'var(--muted)' }}>Rien de neuf pour l’instant. Les réponses et réactions à tes posts arriveront ici.</p>
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((n) => (
        <NotificationRow key={n.id} n={n} compact onOpen={() => {
          state.markRead(n.id)
          onOpen?.()
        }} />
      ))}
    </ul>
  )
}

export function NotificationsPanel({ state, onClose }: { state: NotificationsState; onClose: () => void }) {
  const { items, unread, markAllRead } = state
  const today = parisToday()
  const groups = [
    { title: 'Aujourd’hui', items: items.filter((n) => parisToday(new Date(n.createdAt)) === today) },
    { title: 'Plus tôt', items: items.filter((n) => parisToday(new Date(n.createdAt)) !== today) },
  ].filter((g) => g.items.length > 0)

  return (
    <section
      aria-labelledby="t-notifs"
      className="popin"
      style={{ width: 392, maxWidth: 'calc(100vw - 24px)', maxHeight: 632, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, boxShadow: 'var(--shadow-pop)' }}
    >
      <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-soft)' }}>
        <h2 id="t-notifs" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Notifications</h2>
        {unread > 0 && <span style={{ padding: '1px 8px', borderRadius: 999, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontSize: 12, fontWeight: 600 }}>{unread}</span>}
        <button type="button" onClick={markAllRead} disabled={!unread} style={{ marginLeft: 'auto', minHeight: 36, padding: '0 6px', whiteSpace: 'nowrap', border: 0, backgroundColor: 'transparent', color: 'var(--link)', fontSize: 13, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, opacity: unread ? 1 : 0.5 }}>
          Tout marquer comme lu
        </button>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', border: 0, borderRadius: 10, backgroundColor: 'transparent', color: 'var(--muted)' }}>
          <Icon name="close" size={18} strokeWidth={2} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 12px' }}>
        {groups.length === 0 ? (
          <p style={{ margin: 0, padding: '28px 12px', textAlign: 'center', fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
            Rien de neuf pour l’instant.
            <br />
            Les réponses et réactions à tes posts arriveront ici.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.title} style={{ marginTop: 6 }}>
              <h3 style={{ margin: '6px 10px 4px', fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{g.title}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.items.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={() => {
                    state.markRead(n.id)
                    onClose()
                  }} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <p style={{ margin: 0, padding: '12px 18px 14px', borderTop: '1px solid var(--border-soft)', fontSize: 12, lineHeight: 1.45, color: 'var(--muted)' }}>
        Pas d’e-mail ni de notification sur le téléphone : tout se passe ici.
      </p>
    </section>
  )
}
