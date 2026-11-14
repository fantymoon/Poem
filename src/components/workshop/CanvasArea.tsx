import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CardStyle, Poem, Template } from '../../lib/types'
import { CardSVG } from '../CardSVG'
import { TemplateStrip } from './TemplateStrip'
import { Icon } from '../Icon'
import { layoutCard } from '../../lib/layout'
import { paperDims } from '../../lib/cardStyle'
import { qianForDate } from '../../lib/data/qian'
import { todayStr } from '../../lib/cardStyle'
import { playSound } from '../../lib/sound'

const GRID = [0.15, 0.5, 0.85]
function snap(v: number): number {
  for (const g of GRID) if (Math.abs(v - g) < 0.035) return g
  return v
}

interface Props {
  poem: Poem
  style: CardStyle
  setStyle: (u: (s: CardStyle) => CardStyle, key?: string) => void
  displayStyle: CardStyle
  isEmpty: boolean
  templates: Template[]
  activeTemplateId: string | null
  onApplyTemplate: (t: Template) => void
  onPreviewTemplate: (t: Template | null) => void
  onDeleteTemplate: (t: Template) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onWrite: () => void
}

export function CanvasArea(props: Props) {
  const { poem, style, setStyle, displayStyle, isEmpty } = props
  const navigate = useNavigate()
  const stageRef = useRef<HTMLDivElement>(null)
  const svgWrapRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 })
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [guides, setGuides] = useState(false)
  const dims = paperDims(displayStyle.paper)
  const layout = layoutCard(poem, displayStyle)

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setStageSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fitScale = Math.min((stageSize.w - 64) / dims.w, (stageSize.h - 64) / dims.h)
  const scale = zoom === 'fit' ? Math.max(0.05, fitScale) : zoom
  const dispW = dims.w * scale
  const dispH = dims.h * scale
  const zoomPct = Math.round((scale / 0.7) * 100)

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return
    e.preventDefault()
    const base = zoom === 'fit' ? scale : zoom
    const next = Math.min(2.5, Math.max(0.12, base * (e.deltaY > 0 ? 0.92 : 1.08)))
    setZoom(next)
  }

  // ---- drag blocks ----
  const dragRef = useRef<{ block: string; sx: number; sy: number; start: any; scale: number } | null>(null)
  const onBlockPointerDown = useCallback((block: 'title' | 'signature' | 'seal', e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const svg = svgWrapRef.current?.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const sc = rect.width / dims.w
    const start = block === 'seal' ? { x: style.seal.x, y: style.seal.y }
      : block === 'title' ? { dx: style.title.dx, dy: style.title.dy }
      : { dx: style.signature.dx, dy: style.signature.dy }
    dragRef.current = { block, sx: e.clientX, sy: e.clientY, start, scale: sc }
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dux = (ev.clientX - d.sx) / d.scale / dims.w
      const duy = (ev.clientY - d.sy) / d.scale / dims.h
      if (d.block === 'seal') {
        const nx = snap(Math.min(0.97, Math.max(0.03, d.start.x + dux)))
        const ny = snap(Math.min(0.97, Math.max(0.03, d.start.y + duy)))
        setStyle((s) => ({ ...s, seal: { ...s.seal, x: nx, y: ny } }), 'drag-seal')
      } else if (d.block === 'title') {
        setStyle((s) => ({ ...s, title: { ...s.title, dx: clamp(d.start.dx + dux), dy: clamp(d.start.dy + duy) } }), 'drag-title')
      } else {
        setStyle((s) => ({ ...s, signature: { ...s.signature, dx: clamp(d.start.dx + dux), dy: clamp(d.start.dy + duy) } }), 'drag-sig')
      }
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      playSound('click')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [style, dims.w, dims.h, setStyle])

  const today = qianForDate(todayStr(), 'mixed')

  return (
    <div className="canvas-area">
      <TemplateStrip
        templates={props.templates}
        activeId={props.activeTemplateId}
        onApply={props.onApplyTemplate}
        onPreview={props.onPreviewTemplate}
        onDelete={props.onDeleteTemplate}
      />

      <div className="canvas-stage" ref={stageRef} onWheel={onWheel}>
        {layout.overflow && !isEmpty && (
          <div className="overflow-hint paper-in">
            <Icon name="spark" size={14} />
            <span>文字溢出版心</span>
            <button onClick={() => setStyle((s) => ({ ...s, size: Math.max(20, Math.round(s.size * 0.85)) }))}>缩小字号</button>
            <button onClick={() => setStyle((s) => ({ ...s, margin: { ...s.margin, top: Math.round(s.margin.top * 0.7), bottom: Math.round(s.margin.bottom * 0.7), left: Math.round(s.margin.left * 0.7), right: Math.round(s.margin.right * 0.7) } }))}>扩大版心</button>
          </div>
        )}

        <div className="canvas-scroll">
          <div
            ref={svgWrapRef}
            className={`card-holder ${isEmpty ? 'card-holder-empty' : ''}`}
            style={{ width: dispW, height: dispH }}
          >
            <CardSVG
              poem={poem}
              style={displayStyle}
              showGuides={guides && !isEmpty}
              interactive={!isEmpty}
              onBlockPointerDown={onBlockPointerDown}
              cssStyle={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>

        {isEmpty && <EmptyState onWrite={props.onWrite} navigate={navigate} today={today} />}

        {/* today's qian tucked in the corner */}
        {!isEmpty && (
          <button className="corner-qian" onClick={() => navigate('/qian')} title="今日一签">
            <span className="corner-qian-no font-display">{today.numberLabel}</span>
            <span className="corner-qian-line font-poem">{today.poem.slice(0, 10)}…</span>
          </button>
        )}
      </div>

      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button className={`tool-btn ${zoom === 'fit' ? 'tool-active' : ''}`} onClick={() => setZoom('fit')} title="适应窗口"><Icon name="zoom" size={16} /> 适应</button>
          <button className={`tool-btn ${zoom !== 'fit' && Math.abs(zoomPct - 100) < 3 ? 'tool-active' : ''}`} onClick={() => setZoom(0.7)} title="实际大小">100%</button>
          <span className="toolbar-zoom font-num">{zoomPct}%</span>
        </div>
        <div className="toolbar-group">
          <button className={`tool-btn ${guides ? 'tool-active' : ''}`} onClick={() => setGuides((g) => !g)} title="版心辅助线"><Icon name="grid" size={16} /></button>
          <span className="toolbar-sep" />
          <button className="tool-btn" disabled={!props.canUndo} onClick={props.onUndo} title="撤销 Ctrl+Z"><Icon name="undo" size={16} /></button>
          <button className="tool-btn" disabled={!props.canRedo} onClick={props.onRedo} title="重做 Ctrl+Shift+Z"><Icon name="redo" size={16} /></button>
        </div>
      </div>
    </div>
  )
}

function clamp(v: number): number { return Math.min(0.4, Math.max(-0.4, v)) }

function EmptyState({ onWrite, navigate, today }: { onWrite: () => void; navigate: (p: string) => void; today: ReturnType<typeof qianForDate> }) {
  const entries = [
    { label: '自己写', icon: 'pen', action: onWrite },
    { label: '抽一签', icon: 'qian', action: () => navigate('/qian') },
    { label: '摇骰子', icon: 'dice', action: () => navigate('/dice') },
    { label: '两人盲写', icon: 'blind', action: () => navigate('/blind') },
    { label: '涂一页字', icon: 'blackout', action: () => navigate('/blackout') },
  ]
  return (
    <div className="empty-state">
      <div className="empty-hint font-poem">写一首，或者从桌上拿一首</div>

      {/* desktop: real objects resting around the card, pressing the desk edges */}
      <div className="empty-desk">
        <button className="desk-obj desk-pen" onClick={onWrite} title="自己写">
          <span className="desk-obj-art pen-body"><span className="pen-band" /><span className="pen-nib" /></span>
          <span className="desk-obj-label">自己写</span>
        </button>

        <button className="desk-obj desk-qian" onClick={() => navigate('/qian')} title="抽一签">
          <span className="desk-obj-art desk-qian-paper">
            <span className="desk-qian-no font-display">{today.numberLabel}</span>
            <span className="desk-qian-line font-poem">{today.poem}</span>
            <span className="desk-qian-yi">宜 {today.yi}</span>
          </span>
          <span className="desk-obj-label">抽一签</span>
        </button>

        <button className="desk-obj desk-dice" onClick={() => navigate('/dice')} title="摇骰子">
          <span className="desk-obj-art dice-pair">
            <span className="mini-die mini-die-a font-poem">象</span>
            <span className="mini-die mini-die-b font-poem">意</span>
          </span>
          <span className="desk-obj-label">摇骰子</span>
        </button>

        <button className="desk-obj desk-fold" onClick={() => navigate('/blind')} title="两人盲写">
          <span className="desk-obj-art fold-sheet">
            <span className="fold-crease" />
            <span className="fold-half fold-a font-poem">甲</span>
            <span className="fold-half fold-b font-poem">乙</span>
          </span>
          <span className="desk-obj-label">两人盲写</span>
        </button>

        <button className="desk-obj desk-news" onClick={() => navigate('/blackout')} title="涂一页字">
          <span className="desk-obj-art news-frag">
            <span className="news-frag-head font-display">城南旧报</span>
            <span className="news-frag-lines"><i /><i /><i /><i /><i /></span>
            <span className="news-frag-black" />
          </span>
          <span className="desk-obj-label">涂一页字</span>
        </button>
      </div>

      {/* mobile: compact labeled row */}
      <div className="empty-entries">
        {entries.map((e) => (
          <button key={e.label} className="empty-entry" onClick={e.action}>
            <span className="empty-entry-obj"><Icon name={e.icon} size={22} /></span>
            <span className="empty-entry-label">{e.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}