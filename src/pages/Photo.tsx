// Choix de la photo de profil. Étape 2 de l'inscription (/inscription/photo),
// aussi utilisée depuis le Profil (/profil/photo).
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth, useMe } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { ErrorBanner } from '../components/Form'
import { LeafToggle } from '../components/Leaves'
import { Logo } from '../components/Logo'
import { PhotoPicker } from '../components/PhotoPicker'
import { Button, ButtonLink, Card, Chip, PageTitle } from '../components/ui'
import { headerInnerStyle, headerShellStyle } from '../layouts/AppHeader'
import { PageBackground } from '../layouts/AppLayout'
import { levelInfo } from '../lib/levels'
import { useMyPoints } from '../lib/points'

export default function Photo() {
  const me = useMe()
  const { setPhoto } = useAuth()
  const { total } = useMyPoints()
  const navigate = useNavigate()
  const fromProfile = useLocation().pathname.startsWith('/profil')
  const [picked, setPicked] = useState(me.pp_id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (picked !== me.pp_id) await setPhoto(picked)
      navigate(fromProfile ? '/profil' : '/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la photo.')
      setBusy(false)
    }
  }

  return (
    <PageBackground>
      <header style={headerShellStyle}>
        <div style={{ ...headerInnerStyle, gap: '12px 24px' }}>
          <Logo to={fromProfile ? '/' : undefined} />
          <Chip mono style={{ backgroundColor: 'var(--track)' }}>{fromProfile ? 'Changer de photo' : 'Étape 2 sur 2'}</Chip>
          <div style={{ marginLeft: 'auto' }}>
            <LeafToggle />
          </div>
        </div>
      </header>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '44px 32px 72px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageTitle title="Choisis ta photo de profil" subtitle="Tu pourras en changer à tout moment depuis ton profil." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
          <Card className="rise" aria-labelledby="t-preview" padding={28} radius={22} style={{ animationDelay: '80ms', flex: '1 1 300px', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <h2 id="t-preview" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>Aperçu</h2>
            <Avatar key={picked} ppId={picked} size={148} ring style={{ animation: undefined }} />
            <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{me.pseudo}</p>
            <Chip tone="accent">Niveau {levelInfo(total).level}</Chip>
            <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>Image {picked}</p>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button size="lg" block onClick={save} disabled={busy} style={{ marginTop: 6 }}>
              {busy ? 'Enregistrement…' : fromProfile ? 'Enregistrer' : 'Valider et commencer'}
            </Button>
            {fromProfile && (
              <ButtonLink to="/profil" variant="ghost" block>
                Annuler
              </ButtonLink>
            )}
          </Card>
          <Card className="rise" aria-labelledby="t-pool" radius={22} style={{ animationDelay: '140ms', flex: '3 1 560px', boxShadow: 'none' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 16px', marginBottom: 16 }}>
              <h2 id="t-pool" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>50 images</h2>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Images provisoires, remplacées plus tard par les illustrations finales.</span>
            </div>
            <PhotoPicker value={picked} onChange={setPicked} labelledBy="t-pool" />
          </Card>
        </div>
      </main>
    </PageBackground>
  )
}
