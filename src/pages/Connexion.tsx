import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthError, useAuth } from '../auth/AuthProvider'
import { ErrorBanner, Field } from '../components/Form'
import { Icon } from '../components/Icons'
import { Button } from '../components/ui'
import { AuthLayout, authCardStyle } from '../layouts/AuthLayout'
import { useIsMobile } from '../lib/useMediaQuery'

export default function Connexion() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [pseudo, setPseudo] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(pseudo, pw)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/connexion' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Connexion impossible pour le moment.')
    } finally {
      setBusy(false)
    }
  }

  const ko = error ? { borderColor: 'var(--ko)' } : undefined
  return (
    <AuthLayout compact={isMobile}>
      <form onSubmit={onSubmit} className="rise" aria-labelledby="t-login" style={{ ...authCardStyle, animationDelay: '80ms', maxWidth: 420 }}>
        <div>
          <h1 id="t-login" style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>Connexion</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--muted)' }}>Content de te revoir.</p>
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Field id="pseudo" label="Pseudo" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="ton pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required style={ko} />
        <Field
          id="mdp"
          label="Mot de passe"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          style={ko}
          trailing={
            <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', border: 0, borderRadius: 10, backgroundColor: 'transparent', color: 'var(--muted)' }}>
              <Icon name="eye" size={20} />
            </button>
          }
        />
        <Button type="submit" size="lg" block disabled={busy || !pseudo || !pw} style={{ marginTop: 4 }}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </Button>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>Mot de passe oublié ? Demande à l’admin de la promo de le réinitialiser.</p>
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-soft)', fontSize: 15 }}>
          Pas encore de compte ? <Link to="/inscription" style={{ fontWeight: 600 }}>Créer un compte</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
