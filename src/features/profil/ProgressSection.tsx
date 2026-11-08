// Progression par matière et chapitre : part des QCM publiés réussis au moins une fois (vue chapter_progress).
import { useState } from 'react'
import { Icon } from '../../components/Icons'
import { MiniMeter } from '../../components/Meter'
import type { ProfileContent } from './useProfileData'

const pct = (reussies: number, total: number) => (total > 0 ? Math.round((reussies / total) * 100) : 0)

export function ProgressSection({ content }: { content: ProfileContent }) {
  const subjects = content.subjects
    .map((s) => {
      const chapters = content.chapters
        .filter((c) => c.subject_id === s.id)
        .map((c) => {
          const p = content.progress.get(c.id)
          return { id: c.id, nom: c.nom, total: p?.total ?? 0, reussies: p?.reussies ?? 0 }
        })
      const total = chapters.reduce((a, c) => a + c.total, 0)
      const reussies = chapters.reduce((a, c) => a + c.reussies, 0)
      return { id: s.id, nom: s.nom, chapters, total, pct: pct(reussies, total) }
    })
    .filter((s) => s.chapters.length > 0)
  const [open, setOpen] = useState<string | null>(subjects[0]?.id ?? null)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 16px', margin: '0 12px 10px' }}>
        <h2 id="t-prog" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Progression
        </h2>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Questions réussies au moins une fois</span>
      </div>
      {subjects.length === 0 ? (
        <p style={{ margin: '0 12px 8px', fontSize: 14, color: 'var(--muted)' }}>Aucune matière publiée pour l’instant.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {subjects.map((s) => {
            const isOpen = s.id === open
            return (
              <div key={s.id}>
                <button
                  type="button"
                  className="row"
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  aria-expanded={isOpen}
                  aria-controls={`prog-${s.id}`}
                  style={{
                    width: '100%', display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr) 160px 44px', alignItems: 'center', gap: 12, padding: 12,
                    border: 0, borderRadius: 12, textAlign: 'left', color: 'var(--text)', backgroundColor: isOpen ? '#fdebd8' : 'transparent',
                  }}
                >
                  <span style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                    <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} strokeWidth={2} />
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{s.nom}</span>
                  <MiniMeter value={s.pct / 100} active={isOpen} height={8} />
                  <span className="mono" style={{ textAlign: 'right', fontSize: 14 }}>
                    {s.total ? `${s.pct}%` : '–'}
                  </span>
                </button>
                {isOpen && (
                  <ul id={`prog-${s.id}`} style={{ listStyle: 'none', margin: 0, padding: '6px 12px 14px 42px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {s.chapters.map((c) => {
                      const p = pct(c.reussies, c.total)
                      return (
                        <li key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px 44px', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{c.nom}</span>
                          <MiniMeter value={p / 100} height={5} />
                          <span className="mono" style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-2)' }} title={c.total ? `${c.reussies} sur ${c.total} QCM` : 'Pas encore de QCM'}>
                            {c.total ? `${p}%` : '–'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
