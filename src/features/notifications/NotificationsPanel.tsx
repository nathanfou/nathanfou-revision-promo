// Panneau des notifications (maquette Notifications.dc.html), ouvert depuis la cloche.
// SOCLE : rendu de base ; le chantier "Feed" complète (groupes Aujourd'hui / Plus tôt, actions).
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icons'
import { fmtAgo } from '../../lib/format'
import type { NotificationsState } from './useNotifications'

export function NotificationsPanel({ state, onClose }: { state: NotificationsState; onClose: () => void }) {
  const { items, unread, markAllRead } = state
  return (
    <section
      aria-labelledby="t-notifs"
      className="popin"
      style={{ width: 392, maxWidth: 'calc(100vw - 24px)', maxHeight: 632, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, boxShadow: 'var(--shadow-pop)' }}
    >
      <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-soft)' }}>
        <Icon name="bell" size={20} />
        <h2 id="t-notifs" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Notifications</h2>
        {unread > 0 && <span style={{ padding: '1px 8px', borderRadius: 999, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontSize: 12, fontWeight: 600 }}>{unread}</span>}
        <button type="button" onClick={markAllRead} disabled={!unread} style={{ marginLeft: 'auto', minHeight: 36, padding: '0 6px', border: 0, backgroundColor: 'transparent', color: 'var(--link)', fontSize: 13, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, opacity: unread ? 1 : 0.5 }}>
          Tout marquer comme lu
        </button>
        <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', border: 0, borderRadius: 10, backgroundColor: 'transparent', color: 'var(--muted)' }}>
          <Icon name="close" size={18} strokeWidth={2} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 12px' }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, padding: '28px 12px', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>Rien de neuf pour l’instant.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((n) => (
              <li key={n.id} style={{ display: 'flex', gap: 12, padding: '12px 10px', borderRadius: 14, backgroundColor: n.unread ? '#fdf0e2' : undefined }}>
                {n.kind === 'person' && n.ppId ? (
                  <Avatar ppId={n.ppId} size={38} />
                ) : (
                  <span aria-hidden="true" style={{ flex: '0 0 38px', width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, backgroundColor: 'var(--chip-strong)', color: 'var(--link)' }}>
                    <Icon name="medal" size={18} />
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, fontWeight: n.unread ? 500 : 400 }}>{n.text}</p>
                  {n.detail && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: 'var(--muted)' }}>{n.detail}</p>}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{fmtAgo(n.createdAt)}</p>
                </div>
                {n.unread && <span aria-label="non lue" style={{ flex: '0 0 8px', width: 8, height: 8, marginTop: 6, borderRadius: 999, backgroundColor: 'var(--accent)' }} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p style={{ margin: 0, padding: '12px 18px 14px', borderTop: '1px solid var(--border-soft)', fontSize: 12, lineHeight: 1.45, color: 'var(--muted)' }}>
        Pas d’e-mail ni de notification sur le téléphone : tout se passe ici.
      </p>
    </section>
  )
}
