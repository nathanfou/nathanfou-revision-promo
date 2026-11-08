// Profil public d'un camarade (/u/:pseudo). Maquette : docs/maquettes/ProfilPublic.dc.html.
// Photo, niveau (depuis leaderboard('total')) et rang de la semaine. L'historique reste privé.
// Défier / duel et badges (v2) : masqués tant que la gamification n'existe pas.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMe } from '../auth/AuthProvider'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { ButtonLink, Card, Chip, EmptyState } from '../components/ui'
import { rankValue } from '../features/profil/lcd'
import { InfoNote, ProfileCard } from '../features/profil/ProfileCard'
import { levelInfo } from '../lib/levels'
import { routes } from '../lib/routes'
import { supabase } from '../lib/supabase'

type PublicData = { pseudo: string; pp_id: string; created_at: string; total: number; weekRank: number | null; promoSize: number }
type State = { pseudo: string } & ({ status: 'loading' } | { status: 'notfound' } | { status: 'error' } | { status: 'ok'; data: PublicData })

export default function ProfilPublic() {
  const { pseudo: raw = '' } = useParams()
  const pseudo = raw.toLowerCase()
  const me = useMe()
  const navigate = useNavigate()
  const [loaded, setState] = useState<State>({ pseudo: '', status: 'loading' })
  // tant que le pseudo demandé n'est pas chargé, on affiche le chargement
  const state: State = loaded.pseudo === pseudo ? loaded : { pseudo, status: 'loading' }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [p, total, week] = await Promise.all([
        supabase.from('profiles').select('id, pseudo, pp_id, created_at').eq('pseudo', pseudo).maybeSingle(),
        supabase.rpc('leaderboard', { p_scope: 'total' }),
        supabase.rpc('leaderboard', { p_scope: 'week' }),
      ])
      if (cancelled) return
      if (p.error || total.error || week.error) return setState({ pseudo, status: 'error' })
      if (!p.data) return setState({ pseudo, status: 'notfound' })
      const id = p.data.id
      setState({
        pseudo,
        status: 'ok',
        data: {
          pseudo: p.data.pseudo,
          pp_id: p.data.pp_id,
          created_at: p.data.created_at,
          total: total.data.find((r) => r.user_id === id)?.points ?? 0,
          weekRank: week.data.find((r) => r.user_id === id)?.rang ?? null,
          promoSize: week.data.length,
        },
      })
    })()
    return () => {
      cancelled = true
    }
  }, [pseudo])

  const back = (
    <Link
      to={routes.feed}
      onClick={(e) => {
        if (window.history.state?.idx > 0) {
          e.preventDefault()
          navigate(-1)
        }
      }}
      className="rise"
      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
    >
      <Icon name="arrowLeft" size={16} strokeWidth={2} />
      Retour
    </Link>
  )

  if (state.status !== 'ok') {
    return (
      <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {back}
        <Card className="rise">
          {state.status === 'loading' ? (
            <InlineLoader />
          ) : state.status === 'notfound' ? (
            <EmptyState title="Profil introuvable" action={<ButtonLink to={routes.feed} variant="ghost">Aller au feed</ButtonLink>}>
              Personne ne s’appelle « {raw} » dans la promo.
            </EmptyState>
          ) : (
            <EmptyState title="Chargement impossible">Le profil n’a pas pu être chargé. Réessaie dans un instant.</EmptyState>
          )}
        </Card>
      </div>
    )
  }

  const d = state.data
  const isMe = d.pseudo === me.pseudo
  return (
    <div style={{ maxWidth: 1080, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {back}
      <ProfileCard
        headingLevel={1}
        pseudo={d.pseudo}
        ppId={d.pp_id}
        createdAt={d.created_at}
        totalPoints={d.total}
        lcd={[
          { label: 'RANG', value: rankValue(d.weekRank), ghost: '88', unit: d.promoSize ? `sur ${d.promoSize} cette semaine` : 'cette semaine' },
          { label: 'NIVEAU', value: String(levelInfo(d.total).level).padStart(2, '0'), ghost: '88', unit: 'niveau' },
        ]}
        lcdNote="Rang recalculé chaque lundi à 00h00"
        actions={
          isMe && (
            <>
              <Chip tone="ink">C’est toi</Chip>
              <ButtonLink to={routes.profile} variant="ghost" size="sm">
                Voir mon profil complet
              </ButtonLink>
            </>
          )
        }
      />
      <InfoNote icon={<Icon name="lock" size={20} />}>
        Profil public : l’historique, la progression, le calendrier et le temps de révision de {d.pseudo} restent privés.
      </InfoNote>
    </div>
  )
}
