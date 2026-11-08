// Gabarit téléphone (sous 768 px, seules les flashcards sont accessibles).
// Maquettes : docs/maquettes/MobileCartes.dc.html et MobileCarte.dc.html.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth, useMe } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { FallingLeaves, LeafDecor, LeafToggle, type DecorLeaf } from '../components/Leaves'
import { LogoMark, APP_NAME } from '../components/Logo'

const MOBILE_DECOR: DecorLeaf[] = [
  ['B', 56, 'orange', 18, { top: 70, right: -10 }, true],
  ['A', 34, 'gold', -40, { top: 130, right: 46 }, true],
  ['B', 50, 'caramel', -20, { bottom: -14, right: 20 }, false],
  ['A', 36, 'orange', 60, { bottom: 10, left: -6 }, true],
]

/** En-tête par défaut : logo, feuilles, avatar (appui long = rien ; un menu permet de se déconnecter). */
export function MobileHeader() {
  const me = useMe()
  const { signOut } = useAuth()
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', textDecoration: 'none' }}>
        <LogoMark size={26} />
        <span style={{ fontSize: 17, fontWeight: 600 }}>{APP_NAME}</span>
      </Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <LeafToggle />
        <details style={{ position: 'relative' }}>
          <summary aria-label="Menu du compte" style={{ listStyle: 'none', cursor: 'pointer', borderRadius: 999 }}>
            <Avatar ppId={me.pp_id} size={40} />
          </summary>
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 10, minWidth: 180, padding: 8, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-pop)' }}>
            <p style={{ margin: '6px 8px 8px', fontSize: 14, fontWeight: 600 }}>{me.pseudo}</p>
            <button type="button" onClick={() => void signOut()} className="row" style={{ width: '100%', padding: '10px 8px', border: 0, borderRadius: 10, backgroundColor: 'transparent', textAlign: 'left', fontSize: 14 }}>
              Se déconnecter
            </button>
          </div>
        </details>
      </div>
    </header>
  )
}

export function MobileLayout({ children, header = <MobileHeader /> }: { children: ReactNode; header?: ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', background: 'var(--bg-gradient)', color: 'var(--text)' }}>
      <LeafDecor leaves={MOBILE_DECOR} />
      <FallingLeaves count={4} />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}
        {children}
      </div>
    </div>
  )
}
