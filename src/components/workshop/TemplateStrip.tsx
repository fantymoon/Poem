import { useMemo } from 'react'
import type { Template, Poem } from '../../lib/types'
import { CardSVG } from '../CardSVG'
import { Icon } from '../Icon'
import { makePoem } from '../../lib/cardStyle'

const SAMPLE: Poem = makePoem({
  source: 'free',
  title: '一笺',
  lines: [{ text: '山高月小' }, { text: '水落石出' }],
  authors: [{ id: 'a', name: '甲', color: '#b2382a' }, { id: 'b', name: '乙', color: '#3f6b7d' }],
  date: '',
  showDate: false,
  showOrigin: false,
})

export function TemplateStrip({ templates, activeId, onApply, onPreview, onDelete }: {
  templates: Template[]
  activeId: string | null
  onApply: (t: Template) => void
  onPreview: (t: Template | null) => void
  onDelete?: (t: Template) => void
}) {
  const sample = useMemo(() => SAMPLE, [])
  const mid = (templates.length - 1) / 2
  const current = templates.find((t) => t.id === activeId)
  return (
    <div className="template-strip" onMouseLeave={() => onPreview(null)}>
      <span className="template-strip-label">模板</span>
      <div className="template-scroll">
        {templates.map((t, i) => {
          const fan = Math.max(-11, Math.min(11, (i - mid) * 4.5))
          const active = activeId === t.id
          return (
            <button
              key={t.id}
              className={`template-thumb ${active ? 'template-thumb-active' : ''}`}
              style={{ '--fan': `${fan}deg`, zIndex: active ? 60 : i + 1 } as React.CSSProperties}
              onMouseEnter={() => onPreview(t)}
              onFocus={() => onPreview(t)}
              onClick={() => onApply(t)}
              title={t.name}
            >
              <span className="template-thumb-card">
                <CardSVG poem={sample} style={t.style} cssStyle={{ width: '100%', height: '100%', display: 'block' }} />
                {!t.builtIn && <span className="template-mine-dot" title="我的模板" />}
              </span>
              {!t.builtIn && onDelete && (
                <span className="template-del" role="button" title="删除模板" onClick={(e) => { e.stopPropagation(); onDelete(t) }}>
                  <Icon name="close" size={11} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <span className="template-current font-display">{current ? current.name : '自定义'}</span>
    </div>
  )
}