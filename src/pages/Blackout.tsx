import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { BLACKOUT_TEXTS, blackoutById } from '../lib/data/blackout'
import { makePoem } from '../lib/cardStyle'
import { downloadBlob } from '../lib/export'
import { playSound } from '../lib/sound'
import { Icon } from '../components/Icon'
import { Segmented, Select, Swatches, Slider } from '../components/ui'
import { RoomTag } from '../components/RoomTag'
import { SettingsSlip } from '../components/SettingsSlip'

interface Token { text: string; space: boolean }
interface Rect { x: number; y: number; w: number; h: number }
type Tool = 'paint' | 'eraser' | 'circle' | 'pan'
interface Stroke { pts: { x: number; y: number }[]; size: number; color: string; texture: string }

const MARK_COLORS = [
  { value: '#1f1c19', name: '墨' }, { value: '#b2382a', name: '朱' },
  { value: '#3f6b7d', name: '靛' }, { value: '#6d7a3a', name: '苔' },
]

function segment(text: string, mode: string): Token[] {
  const raw: string[] = []
  if (mode === 'char' || typeof Intl === 'undefined' || !(Intl as any).Segmenter) {
    raw.push(...Array.from(text))
  } else {
    const seg = new (Intl as any).Segmenter('zh', { granularity: 'word' })
    for (const s of seg.segment(text)) raw.push(s.segment)
  }
  return raw.map((t) => ({ text: t, space: /^\s+$/.test(t) }))
}

function hash(n: number): number { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function drawMark(ctx: CanvasRenderingContext2D, r: Rect, texture: string, color: string, seed: number) {
  ctx.save()
  const j = (k: number) => (hash(seed + k) - 0.5)
  if (texture === 'tape') {
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(j(1) * 0.05)
    ctx.fillStyle = hexA('#d8c9a8', 0.9)
    ctx.fillRect(-r.w / 2 - 3, -r.h / 2 - 1, r.w + 6, r.h + 2)
    ctx.fillStyle = hexA('#c7b48c', 0.5)
    ctx.fillRect(-r.w / 2 - 3, -r.h / 2 - 1, r.w + 6, 2)
    ctx.fillRect(-r.w / 2 - 3, r.h / 2 - 1, r.w + 6, 2)
  } else if (texture === 'ink') {
    ctx.fillStyle = color
    ctx.beginPath()
    const pad = 2
    ctx.moveTo(r.x - pad + j(2) * 3, r.y - pad + j(3) * 3)
    ctx.lineTo(r.x + r.w + pad + j(4) * 3, r.y - pad + j(5) * 2)
    ctx.lineTo(r.x + r.w + pad + j(6) * 3, r.y + r.h + pad + j(7) * 3)
    ctx.lineTo(r.x - pad + j(8) * 3, r.y + r.h + pad + j(9) * 2)
    ctx.closePath(); ctx.fill()
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(r.x + hash(seed + k) * r.w, r.y + (k % 2 ? 0 : r.h), 1.6 + hash(seed + k * 2) * 2, 0, 7); ctx.fill() }
  } else { // marker
    ctx.fillStyle = hexA(color, 0.82)
    ctx.fillRect(r.x - 2, r.y - 1 + j(2) * 2, r.w + 4, r.h + 2)
    ctx.fillStyle = hexA(color, 0.28)
    ctx.fillRect(r.x - 3, r.y + r.h * 0.2, r.w + 6, r.h * 0.28)
    ctx.fillStyle = hexA(color, 0.5)
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, 2.2)
  }
  ctx.restore()
}

function drawCircle(ctx: CanvasRenderingContext2D, r: Rect, color: string, seed: number) {
  ctx.save()
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rx = r.w / 2 + 7, ry = r.h / 2 + 6
  ctx.beginPath()
  for (let a = 0; a <= Math.PI * 2 + 0.3; a += 0.25) {
    const wob = 1 + (hash(seed + Math.floor(a * 4)) - 0.5) * 0.08
    const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke(); ctx.restore()
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, W: number, H: number) {
  if (s.pts.length < 1) return
  ctx.save()
  ctx.strokeStyle = s.texture === 'tape' ? hexA('#d8c9a8', 0.9) : s.texture === 'marker' ? hexA(s.color, 0.82) : s.color
  ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  s.pts.forEach((p, i) => { const x = p.x * W, y = p.y * H; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
  if (s.pts.length === 1) { const p = s.pts[0]; ctx.lineTo(p.x * W + 0.1, p.y * H + 0.1) }
  ctx.stroke(); ctx.restore()
}

export function Blackout() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const setGameSettings = useStore((s) => s.setGameSettings)
  const setHandoff = useStore((s) => s.setHandoff)
  const handoff = useStore((s) => s.handoff)
  const toast = useStore((s) => s.toast)
  const bos = settings.blackout

  const [textId, setTextId] = useState(BLACKOUT_TEXTS[0].id)
  const source = blackoutById(textId)
  const [tool, setTool] = useState<Tool>('paint')
  const [blacked, setBlacked] = useState<Set<number>>(new Set())
  const [circled, setCircled] = useState<Set<number>>(new Set())
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [title, setTitle] = useState('')
  const [theme] = useState<string[]>(() => handoff?.theme || [])

  const tokens = useMemo(() => segment(source.text, bos.snap), [source.text, bos.snap])
  const pageRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rectsRef = useRef<Rect[]>([])
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, font: '', fontSize: 16 })
  const painting = useRef(false)
  const lastTok = useRef(-1)
  const curStroke = useRef<Stroke | null>(null)

  useEffect(() => { if (handoff?.target === 'blackout' || handoff?.theme) setHandoff(null) }, [])

  // reset marks when text or granularity changes
  useEffect(() => { setBlacked(new Set()); setCircled(new Set()); setStrokes([]); lastTok.current = -1 }, [textId, bos.snap])

  const measure = useCallback(() => {
    const page = pageRef.current, text = textRef.current, canvas = canvasRef.current
    if (!page || !text || !canvas) return
    const pr = page.getBoundingClientRect()
    const spans = Array.from(text.querySelectorAll<HTMLElement>('[data-i]'))
    const rects: Rect[] = []
    spans.forEach((sp) => { const r = sp.getBoundingClientRect(); rects[+sp.dataset.i!] = { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height } })
    rectsRef.current = rects
    const cs = getComputedStyle(text)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = page.clientWidth, h = page.clientHeight
    sizeRef.current = { w, h, dpr, font: cs.fontFamily, fontSize: parseFloat(cs.fontSize) }
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    redraw()
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!; const { w, h, dpr } = sizeRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
    if (bos.snap === 'free') {
      strokes.forEach((s) => drawStroke(ctx, s, w, h))
    } else {
      blacked.forEach((i) => { const r = rectsRef.current[i]; if (r) drawMark(ctx, r, bos.texture, bos.color, i + 1) })
    }
    circled.forEach((i) => { const r = rectsRef.current[i]; if (r) drawCircle(ctx, r, '#b2382a', i + 7) })
  }, [blacked, circled, strokes, bos.snap, bos.texture, bos.color])

  useLayoutEffect(() => { measure() }, [measure, tokens, source.columns])
  useEffect(() => { redraw() }, [redraw])
  useEffect(() => {
    const page = pageRef.current; if (!page) return
    const ro = new ResizeObserver(() => measure()); ro.observe(page)
    if ((document as any).fonts?.ready) (document as any).fonts.ready.then(() => measure())
    return () => ro.disconnect()
  }, [measure])

  const tokenAt = (x: number, y: number): number => {
    const rects = rectsRef.current
    for (let i = 0; i < rects.length; i++) { const r = rects[i]; if (r && x >= r.x - 1 && x <= r.x + r.w + 1 && y >= r.y - 2 && y <= r.y + r.h + 2) return i }
    return -1
  }

  const computeCoverage = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!; const { dpr } = sizeRef.current
    const next = new Set<number>()
    rectsRef.current.forEach((r, i) => {
      if (!r || tokens[i]?.space) return
      let hit = 0, tot = 0
      for (let sx = 0.2; sx <= 0.8; sx += 0.3) for (let sy = 0.3; sy <= 0.7; sy += 0.4) {
        const px = Math.floor((r.x + r.w * sx) * dpr), py = Math.floor((r.y + r.h * sy) * dpr)
        try { const a = ctx.getImageData(px, py, 1, 1).data[3]; tot++; if (a > 90) hit++ } catch { /* ignore */ }
      }
      if (tot && hit / tot >= 0.5) next.add(i)
    })
    setBlacked(next)
  }, [tokens])

  const pointerPos = (e: React.PointerEvent) => {
    const r = pageRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const applyToken = (i: number) => {
    if (i < 0 || tokens[i]?.space) return
    if (tool === 'circle') { setCircled((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n }); playSound('click'); return }
    setBlacked((s) => { const n = new Set(s); if (tool === 'eraser') n.delete(i); else n.add(i); return n })
  }

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    painting.current = true; lastTok.current = -1
    const { x, y } = pointerPos(e)
    if (bos.snap === 'free' && tool !== 'circle') {
      const { w, h } = sizeRef.current
      curStroke.current = { pts: [{ x: x / w, y: y / h }], size: bos.brush, color: bos.color, texture: tool === 'eraser' ? 'eraser' : bos.texture }
      if (tool === 'eraser') eraseAt(x, y); else drawFreeDab(x, y)
    } else {
      const i = tokenAt(x, y); lastTok.current = i; applyToken(i)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!painting.current) return
    const { x, y } = pointerPos(e)
    if (bos.snap === 'free' && tool !== 'circle') {
      const { w, h } = sizeRef.current
      if (tool === 'eraser') { eraseAt(x, y) }
      else if (curStroke.current) { curStroke.current.pts.push({ x: x / w, y: y / h }); drawFreeSeg() }
    } else {
      const i = tokenAt(x, y); if (i !== lastTok.current) { lastTok.current = i; if (tool !== 'circle') applyToken(i) }
    }
  }
  const onUp = () => {
    if (!painting.current) return
    painting.current = false
    if (bos.snap === 'free' && tool !== 'circle') {
      const done = curStroke.current
      if (tool !== 'eraser' && done) { setStrokes((s) => [...s, done]); curStroke.current = null }
      computeCoverage()
    }
  }

  const drawFreeDab = (x: number, y: number) => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.save(); ctx.fillStyle = bos.texture === 'tape' ? hexA('#d8c9a8', 0.9) : bos.texture === 'marker' ? hexA(bos.color, 0.82) : bos.color
    ctx.beginPath(); ctx.arc(x, y, bos.brush / 2, 0, 7); ctx.fill(); ctx.restore()
  }
  const drawFreeSeg = () => {
    const s = curStroke.current; if (!s || s.pts.length < 2) return
    const ctx = canvasRef.current!.getContext('2d')!; const { w, h } = sizeRef.current
    const a = s.pts[s.pts.length - 2], b = s.pts[s.pts.length - 1]
    ctx.save(); ctx.strokeStyle = bos.texture === 'tape' ? hexA('#d8c9a8', 0.9) : bos.texture === 'marker' ? hexA(bos.color, 0.82) : bos.color
    ctx.lineWidth = bos.brush; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); ctx.restore()
  }
  const eraseAt = (x: number, y: number) => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, bos.brush / 2, 0, 7); ctx.fill(); ctx.restore()
  }

  const clearAll = () => { setBlacked(new Set()); setCircled(new Set()); setStrokes([]); const c = canvasRef.current; if (c) { const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, c.width, c.height) } playSound('flip') }

  const started = blacked.size > 0
  const poemLines = useMemo(() => {
    if (!started) return []
    const out: string[] = []; let cur = ''
    tokens.forEach((t, i) => { if (t.space) return; if (blacked.has(i)) { if (cur.trim()) { out.push(cur); cur = '' } } else cur += t.text })
    if (cur.trim()) out.push(cur)
    return out
  }, [tokens, blacked, started])

  const renderExport = useCallback((): string => {
    const { w, h, font, fontSize } = sizeRef.current
    const scale = 1400 / w
    const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = source.layout === 'news' ? '#e9e0cd' : '#f1ead9'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.scale(scale, scale)
    ctx.fillStyle = '#2a2620'; ctx.textBaseline = 'top'; ctx.font = `${fontSize}px ${font}`
    const spans = Array.from(textRef.current!.querySelectorAll<HTMLElement>('[data-i]'))
    spans.forEach((sp) => { const i = +sp.dataset.i!; const r = rectsRef.current[i]; if (r) ctx.fillText(tokens[i].text, r.x, r.y + (r.h - fontSize) / 2) })
    if (bos.snap === 'free') strokes.forEach((s) => drawStroke(ctx, s, w, h))
    else blacked.forEach((i) => { const r = rectsRef.current[i]; if (r) drawMark(ctx, r, bos.texture, bos.color, i + 1) })
    circled.forEach((i) => { const r = rectsRef.current[i]; if (r) drawCircle(ctx, r, '#b2382a', i + 7) })
    return c.toDataURL('image/png')
  }, [tokens, blacked, circled, strokes, bos.snap, bos.texture, bos.color, source.layout])

  const exportPNG = () => {
    const url = renderExport()
    fetch(url).then((r) => r.blob()).then((b) => downloadBlob(b, `${title || source.title}_遮字.png`))
    toast('已导出遮字 PNG', 'success'); playSound('seal')
  }
  const makeCard = () => {
    if (poemLines.length === 0) { toast('先留下几个词，再做成卡', 'info'); return }
    const blackoutImage = renderExport()
    const poem = makePoem({ source: 'blackout', title: title.trim() || source.title, lines: poemLines.map((t) => ({ text: t })), origin: `遮字 · ${source.title}`, blackoutImage })
    setHandoff({ poem, templateHint: 'jiubao' }); playSound('click'); navigate('/')
  }

  const keptCount = tokens.filter((t, i) => !t.space && !blacked.has(i)).length

  return (
    <div className="game-room blackout-room">
      <div className="game-main">
        <RoomTag name="遮字诗" />
        <div className="bo-work">
          <div className="bo-stage on-desk-scroll">
            <div className={`bo-page bo-${source.layout}`} ref={pageRef}>
              <span className="bo-tape bo-tape-l" aria-hidden="true" />
              <span className="bo-tape bo-tape-r" aria-hidden="true" />
              <div className="bo-masthead">
                {source.layout === 'news' && <span className="bo-masthead-date font-poem">丙午年九月<br />晨刊第壹佰貳拾期</span>}
                <span className="bo-masthead-title font-display">{source.title}</span>
                <span className="bo-masthead-kind">{source.kind}{source.layout === 'news' ? ' · 零售每份銅元拾枚' : ''}</span>
              </div>
              {source.layout === 'news' && (
                <figure className="bo-photo" aria-hidden="true">
                  <span className="bo-photo-img" />
                  <figcaption className="bo-photo-cap">城南舊站臺昨日重開，晨霧未散。</figcaption>
                </figure>
              )}
              <div className="bo-text font-poem" ref={textRef} style={{ columnCount: source.columns }}>
                {tokens.map((t, i) => t.space
                  ? <span key={i} className="bo-space">{t.text}</span>
                  : <span key={i} data-i={i} className={`bo-token ${theme.length && theme.some((w) => t.text.includes(w)) ? 'bo-hint' : ''}`}>{t.text}</span>)}
              </div>
              {source.layout === 'news' && (
                <div className="bo-footer" aria-hidden="true">
                  <div className="bo-footer-boxes">
                    <span className="bo-ad font-poem">燈籠鋪<br />後巷老號</span>
                    <span className="bo-ad font-poem">渡船停擺<br />行人繞行</span>
                    <span className="bo-ad font-poem">初雪將至<br />蘆葦先白</span>
                  </div>
                  <div className="bo-footer-line">第壹版 · 城南舊報 · 每晨發行</div>
                </div>
              )}
              <canvas
                ref={canvasRef} className={`bo-canvas bo-cursor-${tool}`}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
              />
            </div>
          </div>

          <div className="bo-toolshelf" role="toolbar" aria-label="遮字工具">
            <button className={`bo-obj bo-obj-pen ${tool === 'paint' ? 'active' : ''}`} onClick={() => setTool('paint')} title="涂黑">
              <span className="bo-obj-art" aria-hidden="true"><i className="obj-pen-cap" /><i className="obj-pen-body" /><i className="obj-pen-nib" /></span>
              <span className="bo-obj-label">涂黑</span>
            </button>
            <button className={`bo-obj bo-obj-eraser ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="擦除">
              <span className="bo-obj-art" aria-hidden="true"><i className="obj-eraser-top" /><i className="obj-eraser-base" /></span>
              <span className="bo-obj-label">擦除</span>
            </button>
            <button className={`bo-obj bo-obj-pencil ${tool === 'circle' ? 'active' : ''}`} onClick={() => setTool('circle')} title="圈选保留">
              <span className="bo-obj-art" aria-hidden="true"><i className="obj-pencil-tip" /><i className="obj-pencil-body" /><i className="obj-pencil-end" /></span>
              <span className="bo-obj-label">圈选</span>
            </button>
            <button className={`bo-obj bo-obj-weight ${tool === 'pan' ? 'active' : ''}`} onClick={() => setTool('pan')} title="移动纸张">
              <span className="bo-obj-art" aria-hidden="true"><i className="obj-weight-bar" /></span>
              <span className="bo-obj-label">移动</span>
            </button>
          </div>

          <div className="bo-side">
            <div className="game-aside-block bo-remaining-block">
              <div className="spread"><span className="field-label">剩下的诗</span><span className="faint font-num">{started ? `${keptCount} 字` : '—'}</span></div>
              <div className="bo-remaining paper-surface on-paper">
                {poemLines.length === 0
                  ? <span className="bo-remaining-empty faint">涂黑之后，留下的词会在这里成诗。</span>
                  : poemLines.map((l, i) => <div className="bo-remaining-line font-poem" key={i}>{l}</div>)}
              </div>
            </div>
            <div className="game-aside-block">
              <div className="field-label">题目</div>
              <input className="text-input font-poem" value={title} placeholder={source.title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="bo-actions">
              <button className="btn btn-seal btn-block" onClick={makeCard}><Icon name="workshop" size={16} /> 做成卡</button>
              <button className="btn btn-line btn-block" onClick={exportPNG}><Icon name="download" size={15} /> 导出这一页 PNG</button>
            </div>
          </div>
        </div>
      </div>

      <SettingsSlip label="遮字设置">
        <div className="game-aside-block">
          <div className="field-label">选一张旧纸</div>
          <Select value={textId} onChange={setTextId} ariaLabel="选择文本"
            options={BLACKOUT_TEXTS.map((t) => ({ value: t.id, label: `${t.title}（${t.kind}）` }))} />
          {theme.length > 0 && <div className="field-hint">主题提示：{theme.join(' · ')}（相关词已标朱）</div>}
        </div>

        <div className="game-aside-block">
          <div className="field-label">吸附粒度</div>
          <Segmented block value={bos.snap} onChange={(v) => setGameSettings('blackout', { snap: v as any })}
            options={[{ value: 'word', label: '词' }, { value: 'char', label: '字' }, { value: 'free', label: '自由' }]} />
          <div className="field-label" style={{ marginTop: 6 }}>笔触质感</div>
          <Segmented block value={bos.texture} onChange={(v) => setGameSettings('blackout', { texture: v as any })}
            options={[{ value: 'marker', label: '马克' }, { value: 'ink', label: '墨' }, { value: 'tape', label: '胶带' }]} />
          <div className="field-label" style={{ marginTop: 6 }}>颜色</div>
          <Swatches colors={MARK_COLORS} value={bos.color} onChange={(v) => setGameSettings('blackout', { color: v })} />
          <div className="field-label" style={{ marginTop: 6 }}>笔触粗细</div>
          <Slider label="" value={bos.brush} min={8} max={60} onChange={(v) => setGameSettings('blackout', { brush: v })} defaultValue={26} />
          <button className="btn btn-line btn-block" onClick={clearAll}><Icon name="refresh" size={15} /> 清空这一页</button>
        </div>

        <p className="game-aside-note field-hint">涂黑多余的词，留下的会自己成诗。圈选可把想留的词标出来。桌边的笔拿起来就能用。</p>
      </SettingsSlip>
    </div>
  )
}