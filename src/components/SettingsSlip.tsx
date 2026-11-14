import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export function SettingsSlip({ label = '设置', children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = panelRef.current
    if (el) (el as any).inert = !open
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        className={`slip-tag ${open ? 'slip-tag-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? '收起设置' : '展开设置'}
      >
        <span className="slip-tag-char font-display">调</span>
        <span className="slip-tag-label">{label}</span>
      </button>

      <div className={`slip-scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside ref={panelRef} className={`slip-panel paper-surface on-paper ${open ? 'open' : ''}`} aria-label={label} aria-hidden={!open}>
        <div className="slip-head">
          <span className="slip-title font-display">{label}</span>
          <button ref={closeRef} className="icon-btn-sm" onClick={() => setOpen(false)} aria-label="收起设置"><Icon name="close" size={16} /></button>
        </div>
        <div className="slip-body">{children}</div>
      </aside>
    </>
  )
}