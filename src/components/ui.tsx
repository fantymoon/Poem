import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { useStore } from '../store/useStore'

/* ---------------- Field + section ---------------- */
export function Field({ label, hint, children, right }: { label?: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="field">
      {label && (
        <div className="field-head">
          <span className="field-label">{label}</span>
          {right}
        </div>
      )}
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}

export function Section({ title, onReset, children, defaultOpen = true }: {
  title: string; onReset?: () => void; children: ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <div className="section-head">
        <button className="section-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Icon name="chevronDown" size={14} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform var(--dur)' }} />
          {title}
        </button>
        {onReset && <button className="reset-link" onClick={onReset}>恢复默认</button>}
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}

export function More({ children, label = '更多' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="more">
      <button className="more-toggle" onClick={() => setOpen((o) => !o)}>
        <Icon name={open ? 'chevronDown' : 'chevron'} size={13} /> {label}
      </button>
      {open && <div className="more-body rise-in">{children}</div>}
    </div>
  )
}

/* ---------------- Slider ---------------- */
export function Slider({ label, value, min, max, step = 1, onChange, defaultValue, unit, format }: {
  label?: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; defaultValue?: number; unit?: string; format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="slider" onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}>
      {label && <div className="slider-label">{label}</div>}
      <div className="slider-row">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ ['--pct' as any]: pct + '%' }}
          aria-label={label}
        />
        <div className="slider-num">
          <input
            type="number" min={min} max={max} step={step} value={format ? undefined : value}
            defaultValue={format ? format(value) : undefined}
            key={format ? format(value) : undefined}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
            }}
            aria-label={label + ' 数值'}
          />
          {unit && <span className="slider-unit">{unit}</span>}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Segmented ---------------- */
export interface SegOption { value: string; label: ReactNode; title?: string }
export function Segmented({ options, value, onChange, size = 'md', block }: {
  options: SegOption[]; value: string; onChange: (v: string) => void; size?: 'sm' | 'md'; block?: boolean
}) {
  return (
    <div className={`segmented seg-${size} ${block ? 'seg-block' : ''}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          className={`seg-item ${value === o.value ? 'seg-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Swatch ---------------- */
export function Swatches({ colors, value, onChange, allowCustom = true }: {
  colors: { value: string; name?: string }[]; value: string; onChange: (v: string) => void; allowCustom?: boolean
}) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button
          key={c.value}
          className={`swatch ${value.toLowerCase() === c.value.toLowerCase() ? 'swatch-active' : ''}`}
          style={{ background: c.value }}
          title={c.name || c.value}
          aria-label={c.name || c.value}
          onClick={() => onChange(c.value)}
        />
      ))}
      {allowCustom && (
        <label className={`swatch swatch-add ${!colors.some((c) => c.value.toLowerCase() === value.toLowerCase()) ? 'swatch-active' : ''}`} title="自定义颜色">
          <Icon name="plus" size={13} />
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      )}
    </div>
  )
}

/* ---------------- Select with previews ---------------- */
export interface SelectOption { value: string; label: string; preview?: ReactNode }
export function Select({ options, value, onChange, ariaLabel }: {
  options: SelectOption[]; value: string; onChange: (v: string) => void; ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="select" ref={ref}>
      <button className="select-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span className="select-current">{current?.preview}{current?.label}</span>
        <Icon name="chevronDown" size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur)' }} />
      </button>
      {open && (
        <div className="select-pop panel rise-in" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`select-item ${o.value === value ? 'select-item-active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              <span className="select-item-label">{o.preview}{o.label}</span>
              {o.value === value && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Toggle ---------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button className={`toggle ${checked ? 'toggle-on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="toggle-track"><span className="toggle-knob" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </button>
  )
}

export function ToggleRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="field-label">{label}</div>
        {hint && <div className="field-hint">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

/* ---------------- Stepper ---------------- */
export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button className="stepper-btn" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="减少">−</button>
      <span className="stepper-val font-num">{value}</span>
      <button className="stepper-btn" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="增加">+</button>
    </div>
  )
}

/* ---------------- Toast host ---------------- */
export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind} paper-in`} onClick={() => dismiss(t.id)}>
          <Icon name={t.kind === 'success' ? 'check' : t.kind === 'danger' ? 'close' : 'spark'} size={15} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Prompt dialog ---------------- */
export function Prompt({ open, title, label, defaultValue = '', placeholder, confirmLabel = '确定', onConfirm, onCancel }: {
  open: boolean; title: string; label?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string
  onConfirm: (value: string) => void; onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  useEffect(() => { if (open) setValue(defaultValue) }, [open, defaultValue])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') onConfirm(value) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, value, onCancel, onConfirm])
  if (!open) return null
  return (
    <div className="modal-scrim fade-in" onClick={onCancel}>
      <div className="modal panel paper-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-title font-display">{title}</h3>
        {label && <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>}
        <input autoFocus className="text-input" value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} style={{ marginBottom: 20 }} />
        <div className="modal-actions">
          <button className="btn btn-line" onClick={onCancel}>取消</button>
          <button className="btn btn-seal" onClick={() => onConfirm(value)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Confirm dialog ---------------- */
export function Confirm({ open, title, body, confirmLabel = '确定', danger, onConfirm, onCancel }: {
  open: boolean; title: string; body?: string; confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  if (!open) return null
  return (
    <div className="modal-scrim fade-in" onClick={onCancel}>
      <div className="modal panel paper-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-title font-display">{title}</h3>
        {body && <p className="modal-body soft">{body}</p>}
        <div className="modal-actions">
          <button className="btn btn-line" onClick={onCancel}>取消</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-seal'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}