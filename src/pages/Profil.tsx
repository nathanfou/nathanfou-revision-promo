// Page Profil (vue privée, avec aperçu de la vue publique). Maquette : docs/maquettes/Profil.dc.html.
// Badges, défis et duels (v2) : masqués tant que la gamification n'existe pas.
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useMe } from '../auth/AuthProvider'
import { Icon } from '../components/Icons'
import { InlineLoader } from '../components/Loader'
import { Button, ButtonLink, Card, PageTitle, Segmented } from '../components/ui'
import { ActivityCalendar } from '../features/profil/ActivityCalendar'
import { addDays, mondayOf, weekRangeLabel } from '../features/profil/dates'
import { ghostOf, rankValue } from '../features/profil/lcd'
import { InfoNote, ProfileCard, type LcdItem } from '../features/profil/ProfileCard'
import { ProgressSection } from '../features/profil/ProgressSection'
import { RevisionTime } from '../features/profil/RevisionTime'
import { SessionHistory } from '../features/profil/SessionHistory'
import { rowMinutes } from '../features/profil/time'
import { useProfileContent, useRevisionTime, useSessionHistory } from '../features/profil/useProfileData'
import { fmtInt, isoWeekLabel, parisToday } from '../lib/format'
import { levelInfo } from '../lib/levels'
import { useMyPoints } from '../lib/points'
import { routes } from '../lib/routes'
import { useCountUp } from '../lib/useCountUp'

type View = 'private' | 'public'

function Panel({ id, children, delay, style }: { id: string; children: ReactNode; delay: number; style?: React.CSSProperties }) {
  return (
    <Card className="rise" aria-labelledby={id} style={{ animationDelay: `${delay}ms`, display: 'flex', flexDirection: 'column', gap: 18, ...style }}>
      {children}
    </Card>
  )
}

export default function Profil() {
  const me = useMe()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const pts = useMyPoints()
  const [view, setView] = useState<View>('private')
  const [leaving, setLeaving] = useState(false)

  const total = useCountUp(pts.total)
  const week = useCountUp(pts.week)
  const content = useProfileContent()
  const time = useRevisionTime()
  const history = useSessionHistory()

  const { minutesByDay, bySubject, totalMinutes } = useMemo(() => {
    const byDay = new Map<string, number>()
    const bySub = new Map<string, number>()
    let sum = 0
    for (const r of time.data ?? []) {
      const m = rowMinutes(r)
      byDay.set(r.jour, (byDay.get(r.jour) ?? 0) + m)
      bySub.set(r.subject_id, (bySub.get(r.subject_id) ?? 0) + m)
      sum += m
    }
    const names = new Map((content.data?.subjects ?? []).map((s) => [s.id, s.nom]))
    const list = [...bySub.entries()]
      .map(([id, minutes]) => ({ name: names.get(id) ?? 'Autre', minutes }))
      .filter((s) => s.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
    return { minutesByDay: byDay, bySubject: list, totalMinutes: sum }
  }, [time.data, content.data])

  const isPrivate = view === 'private'
  const monday = mondayOf(parisToday())
  const [y, m, d] = monday.split('-').map(Number)
  const weekNo = isoWeekLabel(new Date(y, m - 1, d)).slice(1)
  const rankUnit = pts.promoSize ? `sur ${pts.promoSize} cette semaine` : 'cette semaine'
  const lcd: LcdItem[] = isPrivate
    ? [
        { label: 'POINTS', value: fmtInt(total), ghost: ghostOf(fmtInt(pts.total)), unit: 'cumulés' },
        { label: 'SEMAINE', value: fmtInt(week), ghost: ghostOf(fmtInt(pts.week)), unit: 'pts' },
        { label: 'RANG', value: rankValue(pts.weekRank), ghost: '88', unit: rankUnit },
      ]
    : [
        { label: 'NIVEAU', value: String(levelInfo(pts.total).level).padStart(2, '0'), ghost: '88', unit: 'niveau' },
        { label: 'RANG', value: rankValue(pts.weekRank), ghost: '88', unit: rankUnit },
      ]

  const logout = async () => {
    setLeaving(true)
    await signOut()
    navigate(routes.login, { replace: true })
  }

  const loadError = content.error || time.error

  return (
    <>
      <PageTitle title="Profil" subtitle={isPrivate ? 'Ta progression et ton historique.' : 'Ton profil tel que la promo le voit.'}>
        <Segmented
          label="Vue du profil"
          value={view}
          onChange={setView}
          options={[
            { value: 'private', label: 'Vue privée' },
            { value: 'public', label: 'Vue publique' },
          ]}
        />
      </PageTitle>

      <ProfileCard
        pseudo={me.pseudo}
        ppId={me.pp_id}
        createdAt={me.created_at}
        totalPoints={pts.total}
        lcd={lcd}
        lcdNote={isPrivate ? `Semaine ${weekNo}, ${weekRangeLabel(monday)}` : 'Rang recalculé chaque lundi à 00h00'}
        privateView={isPrivate}
        actions={
          isPrivate && (
            <>
              <ButtonLink to={routes.profilePhoto} variant="ghost" size="sm">
                Changer de photo
              </ButtonLink>
              <Button variant="ghost" size="sm" onClick={logout} disabled={leaving}>
                {leaving ? 'Déconnexion…' : 'Se déconnecter'}
              </Button>
            </>
          )
        }
      />

      {!isPrivate && (
        <InfoNote icon={<Icon name="eye" size={20} />}>
          Les autres voient ta photo, ton niveau et ton rang de la semaine. Ton historique, ta progression, ton calendrier et ton temps de révision restent privés.
        </InfoNote>
      )}

      {isPrivate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loadError && (
            <InfoNote icon={<Icon name="alert" size={20} />}>Une partie de tes statistiques n’a pas pu être chargée. Recharge la page dans un instant.</InfoNote>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
            <Panel id="t-cal" delay={160} style={{ flex: '7 1 600px' }}>
              {time.loading || content.loading ? (
                <InlineLoader />
              ) : (
                <ActivityCalendar minutesByDay={minutesByDay} exams={(content.data?.exams ?? []).filter((e) => e.date >= addDays(monday, -7 * 12))} createdAt={me.created_at} />
              )}
            </Panel>
            <Panel id="t-time" delay={220} style={{ flex: '5 1 400px', gap: 22 }}>
              {time.loading || content.loading ? <InlineLoader /> : <RevisionTime minutesByDay={minutesByDay} bySubject={bySubject} total={totalMinutes} />}
            </Panel>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
            <Card className="rise" aria-labelledby="t-prog" padding="22px 12px 14px" style={{ animationDelay: '280ms', flex: '1 1 520px' }}>
              {content.data ? <ProgressSection content={content.data} /> : content.loading ? <InlineLoader /> : null}
            </Card>
            <Card className="rise" aria-labelledby="t-hist" padding="22px 24px 16px" style={{ animationDelay: '340ms', flex: '1 1 520px' }}>
              <SessionHistory {...history} />
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
