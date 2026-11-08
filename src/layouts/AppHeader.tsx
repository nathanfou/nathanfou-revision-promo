// Barre de navigation des pages principales (Révision, Feed, Profil).
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useMe } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icons'
import { LeafToggle } from '../components/Leaves'
import { Logo } from '../components/Logo'
import { roundButtonStyle } from '../components/ui'
import { NotificationsPanel } from '../features/notifications/NotificationsPanel'
import { useNotifications } from '../features/notifications/useNotifications'
import { fmtInt } from '../lib/format'
import { useMyPoints } from '../lib/points'
import { useCountUp } from '../lib/useCountUp'

const NAV = [
  { to: '/', label: 'Révision', end: true },
  { to: '/feed', label: 'Feed', end: false },
  { to: '/profil', label: 'Profil', end: false },
]

export const headerShellStyle = {
  position: 'relative',
  zIndex: 4,
  backgroundColor: 'rgba(255,250,243,0.78)',
  WebkitBackdropFilter: 'blur(10px)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid var(--border)',
} as const

export const headerInnerStyle = {
  maxWidth: 1280, margin: '0 auto', padding: '10px 32px', minHeight: 64, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 32px',
} as const

export function AppHeader() {
  const me = useMe()
  const { total } = useMyPoints()
  const pts = useCountUp(total)
  const notifs = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header style={headerShellStyle}>
      <div style={headerInnerStyle}>
        <Logo to="/" />
        <nav aria-label="Navigation principale" style={{ display: 'flex', gap: 2, padding: 4, backgroundColor: 'var(--track)', borderRadius: 999 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => (isActive ? undefined : 'tab')}
              style={({ isActive }) => ({
                padding: '8px 18px', borderRadius: 999, fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                backgroundColor: isActive ? 'var(--card)' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(120,60,20,0.15)' : undefined,
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LeafToggle />
          <div ref={wrapRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-ghost"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={notifs.unread ? `Notifications, ${notifs.unread} nouvelles` : 'Notifications'}
              onClick={() => setOpen((o) => !o)}
              style={roundButtonStyle}
            >
              <Icon name="bell" size={20} />
              {notifs.unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, padding: '0 5px', display: 'grid', placeItems: 'center', borderRadius: 999, backgroundColor: 'var(--accent)', color: 'var(--accent-text)', fontSize: 11, fontWeight: 600, border: '2px solid var(--card)' }}>
                  {notifs.unread}
                </span>
              )}
            </button>
            {open && (
              <div role="dialog" aria-label="Notifications" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', zIndex: 20 }}>
                <NotificationsPanel state={notifs} onClose={() => setOpen(false)} />
              </div>
            )}
          </div>
          <Link to="/profil" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 4px 4px', borderRadius: 999, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', backgroundColor: 'var(--card)' }}>
            <Avatar ppId={me.pp_id} size={34} />
            <span style={{ fontSize: 15, fontWeight: 500 }}>{me.pseudo}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, padding: '4px 10px', borderRadius: 999, backgroundColor: 'var(--ink)', color: 'var(--caramel)' }}>
              <span className="lcd" style={{ fontSize: 15 }}>{fmtInt(pts)}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>pts</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
