// Navigateur Matière → Chapitre → Mode de la page Révision (maquette Main.dc.html, section "Matières").
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Icon, PlayIcon, type IconName } from '../../components/Icons'
import { MiniMeter, RowMarker } from '../../components/Meter'
import { ButtonLink, EmptyState, Segmented, buttonStyle } from '../../components/ui'
import { daysUntil, jMinus, plural } from '../../lib/format'
import { routes } from '../../lib/routes'
import { POINTS } from '../../lib/scoring'
import type { ChapterInfo, SubjectInfo } from './useRevisionData'

type Mode = 'qcm' | 'cards' | 'exos'
type Variante = 'entrainement' | 'examen'

const pct = (v: number) => Math.round(v * 100)

const rowStyle = (selected: boolean, padding: string): CSSProperties => ({
  width: '100%', display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr) auto', alignItems: 'center', gap: '8px 10px',
  padding, border: 0, borderRadius: 12, textAlign: 'left', color: 'var(--text)',
  backgroundColor: selected ? 'var(--chip-strong)' : 'transparent',
})
const columnTitle: CSSProperties = { margin: '0 12px 10px', fontSize: 13, fontWeight: 500, color: 'var(--muted)' }

function ListColumn({ title, children, flex }: { title: ReactNode; children: ReactNode; flex: string }) {
  return (
    <div style={{ flex, minWidth: 0, padding: '18px 12px', borderRight: '1px solid var(--border-soft)' }}>
      <h3 style={columnTitle}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  )
}

function SubjectRow({ s, index, selected, onPick }: { s: SubjectInfo; index: number; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" className="row" onClick={onPick} aria-pressed={selected} style={rowStyle(selected, '12px')}>
      <RowMarker selected={selected} index={index} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>{s.nom}</span>
        {s.nextExam && (
          <span className="lcd" title={`${s.nextExam.nom}`} style={{ padding: '1px 7px', borderRadius: 6, backgroundColor: 'var(--ink)', color: 'var(--caramel)', fontSize: 12 }}>
            {jMinus(daysUntil(s.nextExam.date))}
          </span>
        )}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-2)' }}>{pct(s.progression)}%</span>
      <span style={{ gridColumn: '2 / 4' }}>
        <MiniMeter value={s.progression} active={selected} />
      </span>
    </button>
  )
}

function ChapterRow({ c, index, selected, onPick }: { c: ChapterInfo; index: number; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" className="row" onClick={onPick} aria-pressed={selected} style={rowStyle(selected, '11px 12px')}>
      <RowMarker selected={selected} index={index} />
      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 10px', minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{c.nom}</span>
        {c.cartesDues > 0 && <span style={{ fontSize: 13, color: 'var(--link)' }}>{c.cartesDues} à revoir</span>}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-2)' }}>{pct(c.progression)}%</span>
      <span style={{ gridColumn: '2 / 4' }}>
        <MiniMeter value={c.progression} active={selected} height={4} />
      </span>
    </button>
  )
}

function ModeOption({ icon, title, meta, selected, onPick }: { icon: IconName; title: string; meta: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className="opt"
      onClick={onPick}
      aria-pressed={selected}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, textAlign: 'left', color: 'var(--text)',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: selected ? 'var(--chip-strong)' : 'var(--card)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 40px', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12, transition: 'background-color .2s, color .2s',
          backgroundColor: selected ? 'var(--accent)' : 'var(--chip)', color: selected ? 'var(--accent-text)' : 'var(--text-2)',
        }}
      >
        <Icon name={icon} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--muted)' }}>{meta}</span>
      </span>
    </button>
  )
}

function exoMeta(c: ChapterInfo) {
  if (!c.nbExercices) return 'Aucun exercice pour l’instant'
  const d = c.exoDureeMin === c.exoDureeMax ? `de ${c.exoDureeMin} min` : `de ${c.exoDureeMin} à ${c.exoDureeMax} min`
  return `${plural(c.nbExercices, 'exercice')} ${d}, puis auto-évaluation`
}

type PanelProps = { chapter: ChapterInfo; mode: Mode; setMode: (m: Mode) => void; variante: Variante; setVariante: (v: Variante) => void }

function ModePanel({ chapter, mode, setMode, variante, setVariante }: PanelProps) {
  const nCards = chapter.cartesDues + chapter.cartesNouvelles

  const cta =
    mode === 'qcm'
      ? chapter.nbQcm
        ? { label: variante === 'entrainement' ? 'Lancer le QCM, entraînement' : 'Lancer le QCM, examen', to: routes.qcm(chapter.id, variante) }
        : { label: 'Aucun QCM pour l’instant' }
      : mode === 'cards'
        ? nCards
          ? { label: `Réviser ${plural(nCards, 'carte')}`, to: routes.flashcards(chapter.id) }
          : { label: chapter.nbCartes ? 'Rien à réviser aujourd’hui' : 'Aucune carte pour l’instant' }
        : chapter.nbExercices
          ? { label: chapter.nbExercices > 1 ? `Voir les ${chapter.nbExercices} exercices` : 'Voir l’exercice', to: routes.exercises(chapter.id) }
          : { label: 'Aucun exercice pour l’instant' }

  return (
    <div style={{ flex: '1.2 1 360px', minWidth: 0, padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: 'var(--card-tint)' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Mode</h3>
        <p style={{ margin: '6px 0 0', fontSize: 22, lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.015em' }}>{chapter.nom}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ModeOption
          icon="qcm"
          title="QCM"
          meta={chapter.nbQcm ? `${plural(chapter.nbQcm, 'question')}, ${POINTS.qcmCorrect} pts par bonne réponse` : 'Aucun QCM pour l’instant'}
          selected={mode === 'qcm'}
          onPick={() => setMode('qcm')}
        />
        <ModeOption
          icon="cards"
          title="Flashcards"
          meta={chapter.nbCartes ? `${chapter.cartesDues} à revoir, ${plural(chapter.cartesNouvelles, 'nouvelle', 'nouvelles')}, ${POINTS.flashcard} pts par carte` : 'Aucune carte pour l’instant'}
          selected={mode === 'cards'}
          onPick={() => setMode('cards')}
        />
        <ModeOption icon="pencil" title="Exercices" meta={exoMeta(chapter)} selected={mode === 'exos'} onPick={() => setMode('exos')} />
      </div>
      {mode === 'qcm' && (
        <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
          <legend style={{ padding: 0, marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>Variante</legend>
          <Segmented
            label="Variante du QCM"
            value={variante}
            onChange={setVariante}
            options={[
              { value: 'entrainement', label: 'Entraînement' },
              { value: 'examen', label: 'Examen' },
            ]}
          />
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {variante === 'entrainement' ? 'Correction et explication après chaque question.' : 'Toutes les corrections à la fin de la série.'}
          </p>
        </fieldset>
      )}
      {cta.to ? (
        <ButtonLink to={cta.to} size="lg" block style={{ marginTop: 'auto', padding: '14px 20px' }}>
          <PlayIcon />
          {cta.label}
        </ButtonLink>
      ) : (
        <span aria-disabled="true" style={{ ...buttonStyle('primary', 'lg', true), marginTop: 'auto', padding: '14px 20px', opacity: 0.45, boxShadow: 'none', cursor: 'not-allowed' }}>
          {cta.label}
        </span>
      )}
    </div>
  )
}

export function Navigator({ subjects, initialSubjectId, initialChapterId }: { subjects: SubjectInfo[]; initialSubjectId?: string; initialChapterId?: string }) {
  const [subjId, setSubjId] = useState(() => (subjects.some((s) => s.id === initialSubjectId) ? initialSubjectId : subjects[0]?.id))
  const [chapId, setChapId] = useState(initialChapterId)
  // Le mode et la variante restent choisis quand on change de chapitre, comme dans la maquette.
  const [mode, setMode] = useState<Mode>('qcm')
  const [variante, setVariante] = useState<Variante>('entrainement')

  const nbChapters = subjects.reduce((n, s) => n + s.chapters.length, 0)
  const cur = subjects.find((s) => s.id === subjId) ?? subjects[0]
  const chapter = cur?.chapters.find((c) => c.id === chapId) ?? cur?.chapters[0]

  return (
    <section className="rise" aria-labelledby="t-lib" style={{ animationDelay: '420ms', marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <h2 id="t-lib" style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Matières</h2>
        {subjects.length > 0 && (
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {plural(subjects.length, 'matière')}, {plural(nbChapters, 'chapitre')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: 'var(--card-alpha)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow-card)' }}>
        {!cur ? (
          <div style={{ flex: 1 }}>
            <EmptyState title="Pas encore de contenu">Les matières, chapitres, QCM, flashcards et exercices apparaîtront ici dès qu’ils seront publiés.</EmptyState>
          </div>
        ) : (
          <>
            <ListColumn title="Matière" flex="1 1 300px">
              {subjects.map((s, i) => (
                <SubjectRow
                  key={s.id}
                  s={s}
                  index={i}
                  selected={s.id === cur.id}
                  onPick={() => {
                    setSubjId(s.id)
                    setChapId(undefined)
                  }}
                />
              ))}
            </ListColumn>
            <ListColumn title={`Chapitre, ${cur.nom}`} flex="1.2 1 340px">
              {cur.chapters.length === 0 ? (
                <p style={{ margin: '0 12px', fontSize: 14, color: 'var(--muted)' }}>Aucun chapitre pour l’instant.</p>
              ) : (
                cur.chapters.map((c, j) => <ChapterRow key={c.id} c={c} index={j} selected={c.id === chapter?.id} onPick={() => setChapId(c.id)} />)
              )}
            </ListColumn>
            {chapter ? (
              <ModePanel chapter={chapter} mode={mode} setMode={setMode} variante={variante} setVariante={setVariante} />
            ) : (
              <div style={{ flex: '1.2 1 360px', padding: '22px 24px', backgroundColor: 'var(--card-tint)' }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Choisis un chapitre.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
