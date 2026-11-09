// Fil de la promo (maquette Feed.dc.html, section "Fil de la promo") : écrire un post,
// posts et événements automatiques, réactions, réponses à plat, suppression.
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { ErrorBanner } from '../../components/Form'
import { Icon, type IconName } from '../../components/Icons'
import { Button, EmptyState } from '../../components/ui'
import { fmtAgo, fmtInt } from '../../lib/format'
import { routes } from '../../lib/routes'
import { deleteItem, EMOJIS, POST_MAX, publishPost, publishReply, REPLY_MAX, type EventData, type FeedItem } from './api'
import type { FeedState } from './useFeed'

const nameStyle: CSSProperties = { fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }
const fieldStyle: CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 16, lineHeight: 1.45,
}

/** Icône et ligne de détail d'un événement automatique. */
function describeEvent(d: EventData | null): { icon: IconName; detail: string } {
  if (!d) return { icon: 'flag', detail: '' }
  if (d.type === 'session') {
    const where = [d.matiere, d.chapitre].filter(Boolean).join(', ')
    const score = d.mode === 'flashcard' ? '' : `${d.reussis}/${d.items}, `
    const detail = `${where ? `${where}. ` : ''}${score}+${fmtInt(d.points)} pts`
    return { icon: d.mode === 'qcm' ? 'qcm' : d.mode === 'flashcard' ? 'cards' : 'pencil', detail }
  }
  if (d.type === 'seance') {
    const modes = (['qcm', 'flashcard', 'exo'] as const).filter((m) => (d.modes?.[m]?.items ?? 0) > 0)
    const only = modes.length === 1 ? modes[0] : null
    const matieres = d.matieres ?? []
    const chapitres = d.chapitres ?? []
    const where = matieres.length === 1 && chapitres.length === 1 ? `${matieres[0]}, ${chapitres[0]}` : matieres.join(', ')
    const scores = (['qcm', 'exo'] as const)
      .filter((m) => modes.includes(m))
      .map((m) => {
        const part = d.modes[m]!
        return `${modes.length > 1 ? `${m === 'qcm' ? 'QCM' : 'exercices'} ` : ''}${part.reussis}/${part.items}`
      })
    const detail = [where && `${where}.`, [...scores, `+${fmtInt(d.points)} pts`].join(', ')].filter(Boolean).join(' ')
    return { icon: only === 'qcm' ? 'qcm' : only === 'flashcard' ? 'cards' : only === 'exo' ? 'pencil' : 'flag', detail }
  }
  const rank = d.rang === 1 ? '1er' : `${d.rang}e`
  return { icon: d.type === 'premier' ? 'medal' : 'chart', detail: `${rank} avec ${fmtInt(d.points)} pts` }
}

function Counter({ n, max }: { n: number; max: number }) {
  return (
    <span className="mono" aria-live="polite" style={{ fontSize: 13, color: n > max - 20 ? 'var(--link)' : 'var(--muted)' }}>
      {n}/{max}
    </span>
  )
}

export function Composer({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const text = draft.trim()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      await publishPost(userId, text)
      setDraft('')
      onPosted()
    } catch {
      setError('Le post n’a pas pu être publié. Réessaie dans un instant.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 18 }}>
      <label htmlFor="post" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Écrire à la promo</label>
      <textarea
        id="post"
        className="field"
        maxLength={POST_MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, POST_MAX))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(e)
        }}
        placeholder="Une question, un rappel, un encouragement"
        style={{ ...fieldStyle, minHeight: 84, resize: 'vertical' }}
      />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Counter n={draft.length} max={POST_MAX} />
        <Button type="submit" disabled={!text || busy} style={{ padding: '10px 22px' }}>
          {busy ? 'Publication…' : 'Publier'}
        </Button>
      </div>
    </form>
  )
}

function DeleteButton({ onConfirm, label = 'Supprimer' }: { onConfirm: () => Promise<void>; label?: string }) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  const style: CSSProperties = { height: 32, padding: '0 10px', border: 0, borderRadius: 999, backgroundColor: 'transparent', fontSize: 13, fontWeight: 500, color: armed ? 'var(--ko)' : 'var(--muted)' }
  return (
    <button
      type="button"
      className="btn"
      disabled={busy}
      onClick={async () => {
        if (!armed) return setArmed(true)
        setBusy(true)
        try {
          await onConfirm()
        } finally {
          setBusy(false)
          setArmed(false)
        }
      }}
      style={style}
    >
      {armed ? 'Confirmer la suppression' : label}
    </button>
  )
}

function ReplyForm({ userId, parentId, onDone }: { userId: string; parentId: string; onDone: (posted: boolean) => void }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const text = draft.trim()
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      await publishReply(userId, parentId, text)
      setDraft('')
      onDone(true)
    } catch {
      setError('La réponse n’a pas pu être envoyée.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={`reply-${parentId}`} className="sr-only">Ta réponse</label>
      <input
        id={`reply-${parentId}`}
        className="field"
        autoFocus
        maxLength={REPLY_MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, REPLY_MAX))}
        onKeyDown={(e) => e.key === 'Escape' && onDone(false)}
        placeholder="Réponse courte"
        style={{ ...fieldStyle, fontSize: 15, padding: '9px 12px' }}
      />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Counter n={draft.length} max={REPLY_MAX} />
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={() => onDone(false)}>Annuler</Button>
        <Button type="submit" size="sm" disabled={!text || busy}>Répondre</Button>
      </div>
    </form>
  )
}

function FeedArticle({ it, meId, isAdmin, feed, highlighted }: { it: FeedItem; meId: string; isAdmin: boolean; feed: FeedState; highlighted: boolean }) {
  const [replying, setReplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEvent = it.kind === 'event'
  const ev = isEvent ? describeEvent(it.event_data) : null
  const remove = async (id: string) => {
    setError(null)
    try {
      await deleteItem(id)
      await feed.reload()
    } catch {
      setError('Suppression impossible pour le moment.')
    }
  }
  const box: CSSProperties = isEvent
    ? { backgroundColor: 'rgba(255,243,230,0.8)', border: '1px solid var(--border-soft)' }
    : { backgroundColor: 'rgba(255,250,243,0.94)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }

  return (
    <article id={`item-${it.id}`} className="lift" style={{ display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 18, scrollMarginTop: 24, ...box, ...(highlighted ? { outline: '2px solid var(--accent)', outlineOffset: 2 } : null) }}>
      {isEvent && ev ? (
        <span aria-hidden="true" style={{ flex: '0 0 40px', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12, backgroundColor: 'var(--chip-strong)', color: 'var(--link)' }}>
          <Icon name={ev.icon} size={20} />
        </span>
      ) : (
        <Avatar ppId={it.pp_id} size={40} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 8px' }}>
          <Link className="name" to={routes.publicProfile(it.pseudo)} style={{ ...nameStyle, fontSize: 16 }}>{it.pseudo}</Link>
          {isEvent && <span style={{ fontSize: 16 }}>{it.texte}</span>}
          <time dateTime={it.created_at} style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtAgo(it.created_at)}</time>
        </div>
        {ev?.detail && <p style={{ margin: '-4px 0 0', fontSize: 14, color: 'var(--muted)' }}>{ev.detail}</p>}
        {!isEvent && <p style={{ margin: 0, maxWidth: '62ch', fontSize: 16, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{it.texte}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {EMOJIS.map(({ e, label }) => {
            const r = it.reactions.find((x) => x.emoji === e)
            const n = r?.n ?? 0
            const mine = !!r?.mine
            return (
              <button
                key={e}
                type="button"
                className="chip btn"
                aria-pressed={mine}
                aria-label={`${label}, ${n} ${n > 1 ? 'réactions' : 'réaction'}`}
                onClick={() => feed.toggleReaction(it.id, e)}
                style={{
                  minWidth: 44, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 10px', borderRadius: 999, fontSize: 14,
                  ...(mine ? { border: '1px solid var(--accent)', backgroundColor: 'var(--chip-strong)', color: 'var(--link)' } : { border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-2)' }),
                }}
              >
                <span className="emo" aria-hidden="true">{e}</span>
                {n > 0 && <span className="mono" style={{ fontSize: 13 }}>{n}</span>}
              </button>
            )
          })}
          <button type="button" className="btn btn-ghost" aria-expanded={replying} onClick={() => setReplying((v) => !v)} style={{ height: 32, marginLeft: 4, padding: '0 12px', border: '1px solid transparent', borderRadius: 999, backgroundColor: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>
            Répondre
          </button>
          {(it.user_id === meId || isAdmin) && (
            <span style={{ marginLeft: 'auto' }}>
              <DeleteButton onConfirm={() => remove(it.id)} />
            </span>
          )}
        </div>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {(it.replies.length > 0 || replying) && (
          <div style={{ margin: '2px 0 0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 14, backgroundColor: 'var(--row-hover)' }}>
            {it.replies.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {it.replies.map((rp) => (
                  <li key={rp.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar ppId={rp.pp_id} size={28} />
                    <p style={{ flex: 1, margin: 0, fontSize: 15, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                      <Link className="name" to={routes.publicProfile(rp.pseudo)} style={nameStyle}>{rp.pseudo}</Link> <span>{rp.texte}</span>{' '}
                      <time dateTime={rp.created_at} style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtAgo(rp.created_at)}</time>
                    </p>
                    {(rp.user_id === meId || isAdmin) && <DeleteButton onConfirm={() => remove(rp.id)} />}
                  </li>
                ))}
              </ul>
            )}
            {replying && (
              <ReplyForm
                userId={meId}
                parentId={it.id}
                onDone={(posted) => {
                  setReplying(false)
                  if (posted) void feed.reload()
                }}
              />
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export function FeedList({ feed, meId, isAdmin, highlightId }: { feed: FeedState; meId: string; isAdmin: boolean; highlightId: string | null }) {
  if (feed.loading) return <p style={{ margin: 0, padding: '28px 8px', textAlign: 'center', color: 'var(--muted)' }}>Chargement du fil…</p>
  if (feed.error && feed.items.length === 0) return <ErrorBanner>{feed.error}</ErrorBanner>
  if (feed.items.length === 0)
    return (
      <div style={{ backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 18 }}>
        <EmptyState title="Le fil est encore vide">
          Écris le premier message, ou termine une série : elle apparaîtra ici pour toute la promo.
        </EmptyState>
      </div>
    )
  return (
    <>
      {feed.items.map((it) => (
        <FeedArticle key={it.id} it={it} meId={meId} isAdmin={isAdmin} feed={feed} highlighted={it.id === highlightId} />
      ))}
      {feed.error && <ErrorBanner>{feed.error}</ErrorBanner>}
      {feed.hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="ghost" onClick={feed.loadMore} disabled={feed.loadingMore}>
            {feed.loadingMore ? 'Chargement…' : 'Voir plus ancien'}
          </Button>
        </div>
      )}
    </>
  )
}
