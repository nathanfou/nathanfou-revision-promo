// Inscription, étape 1 sur 2 : pseudo, mot de passe, code d'inscription.
// Le compte est créé ici (pp_01 par défaut) ; l'étape 2 (/inscription/photo) met à jour la photo.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthError, useAuth } from '../auth/AuthProvider'
import { ErrorBanner, Field } from '../components/Form'
import { Icon } from '../components/Icons'
import { Button } from '../components/ui'
import { AuthLayout, authCardStyle } from '../layouts/AuthLayout'
import { normalizePseudo, PSEUDO_RE } from '../lib/supabase'
import { useIsMobile } from '../lib/useMediaQuery'

export default function Inscription() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [pseudo, setPseudo] = useState('')
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<AuthError | null>(null)
  const [busy, setBusy] = useState(false)

  const p = normalizePseudo(pseudo)
  const pseudoValid = PSEUDO_RE.test(p)
  const pseudoStatus =
    error?.field === 'pseudo'
      ? { tone: 'ko' as const, text: error.message }
      : p.length === 0
        ? null
        : pseudoValid
          ? { tone: 'ok' as const, text: 'Format valide' }
          : { tone: 'ko' as const, text: '3 à 20 caractères : lettres minuscules, chiffres, point, tiret et tiret bas.' }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!pseudoValid) return
    if (pw.length < 8) {
      setError(new AuthError('8 caractères minimum.', 'password'))
      return
    }
    setBusy(true)
    try {
      await signUp(p, pw, code)
      navigate('/inscription/photo', { replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err : new AuthError('Inscription impossible pour le moment.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout compact={isMobile}>
      <form onSubmit={onSubmit} className="rise" aria-labelledby="t-signup" style={{ ...authCardStyle, animationDelay: '80ms', maxWidth: 440 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>Étape 1 sur 2</p>
          <h1 id="t-signup" style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>Crée ton compte</h1>
        </div>
        {error && !error.field && <ErrorBanner>{error.message}</ErrorBanner>}
        <Field
          id="pseudo"
          label="Pseudo"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={pseudo}
          onChange={(e) => {
            setPseudo(e.target.value.toLowerCase())
            if (error?.field === 'pseudo') setError(null)
          }}
          status={pseudoStatus}
          help="Visible par toute la promo. Lettres, chiffres, point et tiret bas."
          required
        />
        <Field
          id="mdp"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          status={error?.field === 'password' ? { tone: 'ko', text: error.message } : null}
          help="8 caractères minimum. Pas de réinitialisation automatique : garde-le bien."
          required
        />
        <Field
          id="code"
          label="Code d’inscription"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Code du groupe"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (error?.field === 'code') setError(null)
          }}
          status={error?.field === 'code' ? { tone: 'ko', text: error.message } : null}
          help="Le code partagé dans le groupe de la promo."
          style={{ fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}
          required
        />
        <Button type="submit" size="lg" block disabled={busy || !pseudoValid || !pw || !code} style={{ marginTop: 4 }}>
          {busy ? 'Création du compte…' : 'Continuer'}
          {!busy && <Icon name="arrowRight" size={18} strokeWidth={2} />}
        </Button>
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-soft)', fontSize: 15 }}>
          Tu as déjà un compte ? <Link to="/connexion" style={{ fontWeight: 600 }}>Se connecter</Link>
        </div>
      </form>
    </AuthLayout>
  )
}
