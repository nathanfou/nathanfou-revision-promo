import type { InputHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icons'

export const fieldStyle = {
  width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--card)', color: 'var(--text)', fontSize: 16,
} as const

type FieldProps = {
  id: string
  label: string
  help?: ReactNode
  /** message sous le champ ; tone "ok" en vert, "ko" en rouge */
  status?: { tone: 'ok' | 'ko'; text: string } | null
  trailing?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>

export function Field({ id, label, help, status, trailing, style, ...rest }: FieldProps) {
  const border = status?.tone === 'ko' ? 'var(--ko)' : status?.tone === 'ok' ? 'var(--ok)' : undefined
  const describedBy = [help ? `${id}-help` : null, status ? `${id}-status` : null].filter(Boolean).join(' ') || undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className="field"
          aria-describedby={describedBy}
          aria-invalid={status?.tone === 'ko' || undefined}
          style={{ ...fieldStyle, ...(trailing ? { paddingRight: 56 } : null), ...(border ? { borderColor: border } : null), ...style }}
          {...rest}
        />
        {trailing && <div style={{ position: 'absolute', right: 2, top: 2 }}>{trailing}</div>}
      </div>
      {status && (
        <span id={`${id}-status`} role={status.tone === 'ko' ? 'alert' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: status.tone === 'ko' ? 'var(--ko)' : 'var(--ok)' }}>
          <Icon name={status.tone === 'ko' ? 'close' : 'check'} size={14} strokeWidth={2.5} />
          {status.text}
        </span>
      )}
      {help && (
        <span id={`${id}-help`} style={{ fontSize: 13, color: 'var(--muted)' }}>
          {help}
        </span>
      )}
    </div>
  )
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--ko-bg)', border: '1px solid var(--ko-border)', color: 'var(--ko)', fontSize: 14, lineHeight: 1.45 }}>
      <Icon name="alert" size={18} strokeWidth={2} style={{ marginTop: 1 }} />
      <div>{children}</div>
    </div>
  )
}
