// Bouton de choix A-D (maquette Qcm.dc.html).
import type { CSSProperties } from 'react'
import { Icon } from '../../components/Icons'

/** idle : pas encore répondu ; selected : coché (multiple / examen) ; ok / ko : corrigé ; done : corrigé, ni bon ni choisi */
export type ChoiceState = 'idle' | 'selected' | 'ok' | 'ko' | 'done'

const BOX: Record<ChoiceState, CSSProperties> = {
  idle: { border: '1.5px solid var(--border)', backgroundColor: 'var(--card)' },
  selected: { border: '1.5px solid var(--accent)', backgroundColor: 'var(--chip-strong)' },
  ok: { border: '1.5px solid var(--ok)', backgroundColor: 'var(--ok-bg)', cursor: 'default' },
  ko: { border: '1.5px solid var(--ko)', backgroundColor: 'var(--ko-bg)', cursor: 'default' },
  done: { border: '1.5px solid var(--border)', backgroundColor: 'var(--card)', opacity: 0.65, cursor: 'default' },
}
const BADGE: Record<ChoiceState, CSSProperties> = {
  idle: { backgroundColor: 'var(--chip)', color: 'var(--text-2)' },
  selected: { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' },
  ok: { backgroundColor: 'var(--ok)', color: 'var(--accent-text)' },
  ko: { backgroundColor: 'var(--ko)', color: 'var(--accent-text)' },
  done: { backgroundColor: 'var(--chip)', color: 'var(--text-2)' },
}
const ARIA: Record<ChoiceState, string> = {
  idle: '',
  selected: ', sélectionnée',
  ok: ', bonne réponse',
  ko: ', ta réponse, fausse',
  done: '',
}

type Props = {
  letter: string
  text: string
  state: ChoiceState
  /** case à cocher (plusieurs réponses) plutôt que bouton simple */
  checkbox?: boolean
  disabled?: boolean
  onClick: () => void
}

export function ChoiceButton({ letter, text, state, checkbox, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className={`opt${state === 'ko' ? ' shake' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checkbox ? state === 'selected' : undefined}
      aria-label={`${letter}. ${text}${ARIA[state]}`}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, textAlign: 'left', color: 'var(--text)', cursor: 'pointer', font: 'inherit', ...BOX[state] }}
    >
      <span aria-hidden="true" style={{ flex: '0 0 34px', width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: checkbox ? 8 : 10, fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, ...BADGE[state] }}>
        {letter}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 17, lineHeight: 1.4 }}>{text}</span>
      {state === 'ok' && <Icon name="check" size={22} strokeWidth={2.25} style={{ color: 'var(--ok)' }} />}
      {state === 'ko' && <Icon name="close" size={22} strokeWidth={2.25} style={{ color: 'var(--ko)' }} />}
    </button>
  )
}
