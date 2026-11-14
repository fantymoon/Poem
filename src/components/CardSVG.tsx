import { useId, type CSSProperties } from 'react'
import type { CardStyle, Poem, SealStyle, Sticker } from '../lib/types'
import { layoutCard, type Glyph } from '../lib/layout'
import { paperDims } from '../lib/cardStyle'

function Glyphs({ glyphs }: { glyphs: Glyph[] }) {
  return (
    <>
      {glyphs.map((g, i) => (
        <text
          key={i}
          x={g.x}
          y={g.y}
          fontSize={g.size}
          fill={g.fill}
          fontFamily={g.font}
          textAnchor="middle"
          dominantBaseline="central"
          opacity={g.opacity ?? 1}
          transform={g.rotate ? `rotate(${g.rotate} ${g.x} ${g.y})` : undefined}
          style={{ fontWeight: 400 }}
        >
          {g.ch === ' ' ? '\u00A0' : g.ch}
        </text>
      ))}
    </>
  )
}

/* ---------------- seal ---------------- */
function sealChars(text: string): { ch: string; col: number; row: number }[] {
  const chars = Array.from(text).slice(0, 4)
  const n = chars.length
  if (n <= 1) return chars.map((ch) => ({ ch, col: 0, row: 0 }))
  if (n === 2) return [{ ch: chars[0], col: 0, row: 0 }, { ch: chars[1], col: 0, row: 1 }]
  if (n === 3) return [{ ch: chars[0], col: 0, row: 0 }, { ch: chars[1], col: 0, row: 1 }, { ch: chars[2], col: 1, row: 0 }]
  // 4 chars: traditional right-column top→bottom, then left-column
  return [
    { ch: chars[0], col: 0, row: 0 }, { ch: chars[1], col: 0, row: 1 },
    { ch: chars[2], col: 1, row: 0 }, { ch: chars[3], col: 1, row: 1 },
  ]
}

function Seal({ seal, cx, cy, uid, paper, text }: { seal: SealStyle; cx: number; cy: number; uid: string; paper: string; text?: string }) {
  const s = seal.size
  const half = s / 2
  const red = '#b2382a'
  const chars = sealChars(text || seal.text)
  const cols = Math.max(...chars.map((c) => c.col)) + 1
  const rows = Math.max(...chars.map((c) => c.row)) + 1
  const pad = s * 0.16
  const cellW = (s - pad * 2) / cols
  const cellH = (s - pad * 2) / rows
  const glyphSize = Math.min(cellW, cellH) * 0.82
  const isZhu = seal.mode === 'zhu'
  const rough = `seal-rough-${uid}`
  const speck = `seal-speck-${uid}`
  const clip = `seal-clip-${uid}`
  const shape = seal.shape === 'round'
    ? <circle cx={0} cy={0} r={half} />
    : <rect x={-half} y={-half} width={s} height={s} rx={s * 0.08} />

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${seal.rotation})`}>
      <defs>
        <filter id={rough} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2 + seal.distress * 7} />
        </filter>
        <filter id={speck} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.4 -0.5" />
        </filter>
        <clipPath id={clip}>{shape}</clipPath>
      </defs>
      <g filter={`url(#${rough})`}>
        {isZhu ? (
          <>
            <g fill="none" stroke={red} strokeWidth={s * 0.055}>{shape}</g>
            {chars.map((c, i) => (
              <text key={i} x={-half + pad + c.col * cellW + cellW / 2} y={-half + pad + c.row * cellH + cellH / 2}
                fontSize={glyphSize} fill={red} fontFamily='"STKaiti","KaiTi","SimKai",serif' textAnchor="middle" dominantBaseline="central">{c.ch}</text>
            ))}
          </>
        ) : (
          <>
            <g fill={red}>{shape}</g>
            {chars.map((c, i) => (
              <text key={i} x={-half + pad + c.col * cellW + cellW / 2} y={-half + pad + c.row * cellH + cellH / 2}
                fontSize={glyphSize} fill={paper} fontFamily='"STKaiti","KaiTi","SimKai",serif' textAnchor="middle" dominantBaseline="central">{c.ch}</text>
            ))}
          </>
        )}
      </g>
      {/* 印泥斑驳: paper-colored speckles eroding the ink */}
      {seal.distress > 0.05 && (
        <g clipPath={`url(#${clip})`} opacity={seal.distress * 0.85}>
          <rect x={-half} y={-half} width={s} height={s} fill={paper} filter={`url(#${speck})`} />
        </g>
      )}
    </g>
  )
}

/* ---------------- stickers ---------------- */
function StickerShape({ s, uid }: { s: Sticker; uid: string }) {
  const sh = `st-${uid}`
  const common = { filter: `url(#${sh})` } as any
  let body: JSX.Element
  switch (s.type) {
    case 'clip':
      body = (
        <g {...common}>
          <path d="M -10 -26 C -10 -34 10 -34 10 -26 L 10 20 C 10 30 -6 30 -6 20 L -6 -18 C -6 -24 4 -24 4 -18 L 4 16"
            fill="none" stroke="#9a958c" strokeWidth="4" strokeLinecap="round" />
          <path d="M -10 -26 C -10 -34 10 -34 10 -26 L 10 20" fill="none" stroke="#c7c2b8" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ); break
    case 'ticket':
      body = (
        <g {...common}>
          <rect x="-46" y="-22" width="92" height="44" rx="3" fill="#e8dcc0" />
          <rect x="-46" y="-22" width="92" height="44" rx="3" fill="none" stroke="#b9a97f" strokeWidth="1" />
          <line x1="20" y1="-22" x2="20" y2="22" stroke="#b9a97f" strokeWidth="1" strokeDasharray="3 3" />
          <text x="-13" y="-3" fontSize="11" fill="#8a6d3b" textAnchor="middle" fontFamily='"STKaiti","KaiTi",serif'>車票</text>
          <text x="-13" y="12" fontSize="7" fill="#a8946a" textAnchor="middle" fontFamily="monospace">No.0417</text>
          <circle cx="33" cy="0" r="7" fill="none" stroke="#b2382a" strokeWidth="1.4" opacity="0.7" />
        </g>
      ); break
    case 'leaf':
      body = (
        <g {...common}>
          <path d="M 0 -30 C 18 -18 18 14 0 30 C -18 14 -18 -18 0 -30 Z" fill="#8a7a4a" opacity="0.9" />
          <path d="M 0 -28 L 0 28" stroke="#6d5f38" strokeWidth="1.2" />
          {[-18, -8, 2, 12].map((y, i) => <path key={i} d={`M 0 ${y} L ${i % 2 ? 10 : -10} ${y + 6}`} stroke="#6d5f38" strokeWidth="0.8" />)}
        </g>
      ); break
    case 'stamp':
      body = (
        <g {...common}>
          <rect x="-26" y="-30" width="52" height="60" fill="#f0e8d8" />
          <rect x="-26" y="-30" width="52" height="60" fill="none" stroke="#f0e8d8" strokeWidth="6" strokeDasharray="4 4" />
          <rect x="-20" y="-24" width="40" height="48" fill="#3f6b7d" opacity="0.85" />
          <circle cx="0" cy="-4" r="11" fill="#f0e8d8" opacity="0.9" />
          <text x="0" y="20" fontSize="8" fill="#f0e8d8" textAnchor="middle" fontFamily="serif">8分</text>
        </g>
      ); break
    default: // flower
      body = (
        <g {...common}>
          <path d="M 0 6 L 0 34" stroke="#7a6a3a" strokeWidth="2" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="0" cy="-12" rx="7" ry="14" fill="#c98a9a" opacity="0.85" transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="6" fill="#d9b24a" />
          <path d="M 0 18 L -10 12" stroke="#7a6a3a" strokeWidth="1.6" />
        </g>
      )
  }
  return (
    <g transform={`translate(${s.x} ${s.y}) rotate(${s.rotation}) scale(${s.scale})`}>
      <defs>
        <filter id={sh} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>
      {body}
    </g>
  )
}

/* ---------------- main renderer ---------------- */
export interface CardSVGProps {
  poem: Poem
  style: CardStyle
  showGuides?: boolean
  className?: string
  cssStyle?: CSSProperties
  svgRef?: React.Ref<SVGSVGElement>
  interactive?: boolean
  onBlockPointerDown?: (block: 'title' | 'signature' | 'seal', e: React.PointerEvent) => void
}

export function CardSVG({ poem, style, showGuides, className, cssStyle, svgRef, interactive, onBlockPointerDown }: CardSVGProps) {
  const uid = useId().replace(/[:]/g, '')
  const layout = layoutCard(poem, style)
  const { w, h, content } = layout
  const grain = `grain-${uid}`
  const water = `water-${uid}`
  const edge = `edge-${uid}`
  const tex = style.texture

  const grainFreq = tex.type === 'kraft' ? '0.7' : tex.type === 'water' ? '0.012 0.09' : '0.85'
  const grainAlpha = tex.type === 'kraft' ? 0.1 : 0.05
  const grainTint = tex.type === 'kraft' ? '0.35 0.28 0.18' : '0.3 0.26 0.2'

  return (
    <svg
      ref={svgRef}
      className={className}
      style={cssStyle}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={grainFreq} numOctaves="2" seed="8" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values={`0 0 0 0 ${grainTint.split(' ')[0]} 0 0 0 0 ${grainTint.split(' ')[1]} 0 0 0 0 ${grainTint.split(' ')[2]} 0 0 0 ${grainAlpha} 0`} />
        </filter>
        <filter id={edge} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="10" />
        </filter>
        <pattern id={water} width="120" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 13 Q 30 4 60 13 T 120 13" fill="none" stroke="#7a8a9a" strokeWidth="1" opacity="0.5" />
        </pattern>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="42%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* paper */}
      <rect x="0" y="0" width={w} height={h} fill={style.paper.color} />

      {/* texture */}
      {tex.type === 'image' && tex.image ? (
        <image href={tex.image} x="0" y="0" width={w} height={h} preserveAspectRatio={tex.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} opacity={tex.opacity} />
      ) : tex.type === 'water' ? (
        <rect x="0" y="0" width={w} height={h} fill={`url(#${water})`} opacity={tex.opacity} />
      ) : tex.type !== 'none' ? (
        <rect x="0" y="0" width={w} height={h} filter={`url(#${grain})`} opacity={tex.opacity} />
      ) : null}
      <rect x="0" y="0" width={w} height={h} fill={`url(#vig-${uid})`} />

      {/* grid */}
      <Grid style={style} content={content} w={w} h={h} />

      {/* border */}
      <Border style={style} w={w} h={h} uid={edge} />

      {/* body */}
      {!style.hideBody && <Glyphs glyphs={layout.body} />}

      {/* title + signature */}
      {layout.title && <Glyphs glyphs={layout.title.glyphs} />}
      {layout.signature && <Glyphs glyphs={layout.signature.glyphs} />}

      {/* stickers */}
      {style.stickers.map((s) => <StickerShape key={s.id} s={{ ...s, x: s.x * w, y: s.y * h }} uid={uid + s.id} />)}

      {/* seal(s) */}
      {style.seal.on && !style.seal.pair && (
        <Seal seal={style.seal} cx={style.seal.x * w} cy={style.seal.y * h} uid={uid} paper={style.paper.color} />
      )}
      {style.seal.on && style.seal.pair && (
        <>
          <Seal seal={{ ...style.seal, size: style.seal.size * 0.82 }} cx={style.seal.x * w - style.seal.size * 0.6} cy={style.seal.y * h} uid={uid + 'a'} paper={style.paper.color} text={poem.authors[0]?.name.slice(-1) || style.seal.text} />
          <Seal seal={{ ...style.seal, size: style.seal.size * 0.82, rotation: -style.seal.rotation }} cx={style.seal.x * w + style.seal.size * 0.6} cy={style.seal.y * h} uid={uid + 'b'} paper={style.paper.color} text={poem.authors[1]?.name.slice(-1) || style.seal.text} />
        </>
      )}

      {/* overflow indicator */}
      {layout.overflow && layout.overflowBox && (
        <rect x={layout.overflowBox.x} y={layout.overflowBox.y} width={layout.overflowBox.w} height={layout.overflowBox.h}
          fill="rgba(178,56,42,0.06)" stroke="#b2382a" strokeWidth="2" strokeDasharray="8 6" />
      )}

      {/* content guides */}
      {showGuides && (
        <g pointerEvents="none">
          <rect x={content.x} y={content.y} width={content.w} height={content.h} fill="none" stroke="#b2382a" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.5" />
          <line x1={w / 2} y1={content.y} x2={w / 2} y2={content.y + content.h} stroke="#b2382a" strokeWidth="1" strokeDasharray="3 7" opacity="0.3" />
          <line x1={content.x} y1={h / 2} x2={content.x + content.w} y2={h / 2} stroke="#b2382a" strokeWidth="1" strokeDasharray="3 7" opacity="0.3" />
        </g>
      )}

      {/* drag hit areas */}
      {interactive && (
        <g>
          {layout.title && (
            <rect className="drag-hit" x={layout.title.box.x} y={layout.title.box.y} width={layout.title.box.w} height={layout.title.box.h}
              fill="transparent" onPointerDown={(e) => onBlockPointerDown?.('title', e)} />
          )}
          {layout.signature && (
            <rect className="drag-hit" x={layout.signature.box.x} y={layout.signature.box.y} width={layout.signature.box.w} height={layout.signature.box.h}
              fill="transparent" onPointerDown={(e) => onBlockPointerDown?.('signature', e)} />
          )}
          {style.seal.on && (
            <rect className="drag-hit" x={style.seal.x * w - style.seal.size / 2} y={style.seal.y * h - style.seal.size / 2} width={style.seal.size} height={style.seal.size}
              fill="transparent" onPointerDown={(e) => onBlockPointerDown?.('seal', e)} />
          )}
        </g>
      )}
    </svg>
  )
}

function Grid({ style, content, w, h }: { style: CardStyle; content: { x: number; y: number; w: number; h: number }; w: number; h: number }) {
  const g = style.grid
  if (g.type === 'none') return null
  const sp = g.spacing
  const lines: JSX.Element[] = []
  if (g.type === 'letter') {
    if (style.direction === 'vertical') {
      for (let x = content.x + content.w; x >= content.x; x -= sp) lines.push(<line key={'v' + x} x1={x} y1={content.y} x2={x} y2={content.y + content.h} stroke={g.color} strokeWidth="1" opacity="0.5" />)
    } else {
      for (let y = content.y + sp; y <= content.y + content.h; y += sp) lines.push(<line key={'h' + y} x1={content.x} y1={y} x2={content.x + content.w} y2={y} stroke={g.color} strokeWidth="1" opacity="0.5" />)
    }
  } else if (g.type === 'wusi') {
    for (let x = content.x + content.w; x >= content.x; x -= sp) lines.push(<line key={'w' + x} x1={x} y1={content.y} x2={x} y2={content.y + content.h} stroke={g.color} strokeWidth="1.4" opacity="0.55" />)
    lines.push(<rect key="frame" x={content.x} y={content.y} width={content.w} height={content.h} fill="none" stroke={g.color} strokeWidth="1.8" opacity="0.6" />)
  } else if (g.type === 'manuscript') {
    const cols = Math.floor(content.w / sp)
    const rows = Math.floor(content.h / sp)
    for (let i = 0; i <= cols; i++) lines.push(<line key={'mc' + i} x1={content.x + i * sp} y1={content.y} x2={content.x + i * sp} y2={content.y + rows * sp} stroke={g.color} strokeWidth="1" opacity="0.55" />)
    for (let j = 0; j <= rows; j++) lines.push(<line key={'mr' + j} x1={content.x} y1={content.y + j * sp} x2={content.x + cols * sp} y2={content.y + j * sp} stroke={g.color} strokeWidth="1" opacity="0.55" />)
  }
  return <g>{lines}</g>
}

function Border({ style, w, h, uid }: { style: CardStyle; w: number; h: number; uid: string }) {
  const b = style.border
  if (b.type === 'none') return null
  const inset = Math.min(w, h) * 0.045
  if (b.type === 'thin') return <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} fill="none" stroke={b.color} strokeWidth="2" opacity="0.7" />
  if (b.type === 'double') return (
    <g opacity="0.7">
      <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} fill="none" stroke={b.color} strokeWidth="2.5" />
      <rect x={inset + 8} y={inset + 8} width={w - (inset + 8) * 2} height={h - (inset + 8) * 2} fill="none" stroke={b.color} strokeWidth="1" />
    </g>
  )
  // torn / deckle edge
  return <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} fill="none" stroke={b.color} strokeWidth="2" opacity="0.6" filter={`url(#${uid})`} />
}