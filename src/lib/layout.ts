import type { CardStyle, Poem } from './types'
import { paperDims } from './cardStyle'
import { fontStack } from './fonts'

export interface Glyph {
  ch: string
  x: number // center x
  y: number // center y
  size: number
  fill: string
  font: string
  rotate: number
  over: boolean
  opacity?: number
}

export interface Block {
  glyphs: Glyph[]
  box: { x: number; y: number; w: number; h: number }
}

export interface CardLayout {
  w: number
  h: number
  content: { x: number; y: number; w: number; h: number }
  body: Glyph[]
  title: Block | null
  signature: Block | null
  overflow: boolean
  overflowBox: { x: number; y: number; w: number; h: number } | null
}

const WIDE_PUNCT = '。．，、：；！？…—·「」『』（）()【】〔〕《》〈〉“”‘’"'
const ROTATE_PUNCT = '（）()「」『』【】〔〕《》〈〉—–…“”‘’'
const CORNER_PUNCT = '。．，、'

function isCJK(ch: string): boolean {
  const c = ch.codePointAt(0) || 0
  return (
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x3000 && c <= 0x303f) ||
    (c >= 0xff00 && c <= 0xffef) ||
    WIDE_PUNCT.includes(ch)
  )
}

function advance(ch: string, size: number, vertical: boolean): number {
  if (vertical) return isCJK(ch) ? size : size * 0.62
  if (ch === ' ') return size * 0.5
  return isCJK(ch) ? size : size * 0.54
}

function authorFill(poem: Poem, style: CardStyle, authorId?: string): string {
  if (style.authorDistinction !== 'color' || !authorId) return style.inkColor
  const a = poem.authors.find((x) => x.id === authorId)
  return a ? a.color : style.inkColor
}

// Split a line into vertical columns of at most maxChars.
function chunk<T>(arr: T[], n: number): T[][] {
  if (n <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out.length ? out : [[]]
}

export function layoutCard(poem: Poem, style: CardStyle): CardLayout {
  const { w, h } = paperDims(style.paper)
  const m = style.margin
  const content = { x: m.left, y: m.top, w: Math.max(40, w - m.left - m.right), h: Math.max(40, h - m.top - m.bottom) }
  const vertical = style.direction === 'vertical'
  const bodyFont = fontStack(style.font)
  const titleFont = fontStack(style.title.font || style.font)
  const size = style.size
  const track = style.tracking
  const lines = poem.lines.filter((l) => l.text.length > 0 || poem.lines.length === 1)

  const layout: CardLayout = {
    w, h, content, body: [], title: null, signature: null, overflow: false, overflowBox: null,
  }
  if (style.hideBody) {
    // blackout keep-mode: only title + signature overlay the image
    buildTitle(poem, style, layout, vertical, titleFont)
    buildSignature(poem, style, layout, vertical)
    return layout
  }

  if (vertical) layoutVertical(poem, style, layout, lines, bodyFont, titleFont, size, track)
  else layoutHorizontal(poem, style, layout, lines, bodyFont, titleFont, size, track)

  buildTitle(poem, style, layout, vertical, titleFont)
  buildSignature(poem, style, layout, vertical)
  return layout
}

/* ---------------- horizontal ---------------- */
function layoutHorizontal(poem: Poem, style: CardStyle, layout: CardLayout, lines: { text: string; authorId?: string }[], bodyFont: string, titleFont: string, size: number, track: number) {
  const c = layout.content
  const manuscript = style.grid.type === 'manuscript'
  const cell = style.grid.spacing
  const titleH = style.title.position !== 'hidden' && poem.title ? size * style.title.scale * 1.5 : 0
  const sigH = style.signature.position !== 'hidden' && style.signature.show ? size * style.signature.scale * 2.4 : 0
  const topBand = style.title.position === 'top' ? titleH : 0
  const bottomBand = (style.title.position === 'bottom' ? titleH : 0) + (style.signature.position === 'bottom' ? sigH : 0)
  const regionY = c.y + topBand + (topBand ? size * 0.4 : 0)
  const regionH = c.h - topBand - bottomBand - (topBand ? size * 0.4 : 0) - (bottomBand ? size * 0.4 : 0)

  // build line metrics
  const linePitch = manuscript ? cell : size * style.leading
  const heights: number[] = []
  let totalH = 0
  lines.forEach((l, i) => {
    const isBreak = poem.stanzaBreaks.includes(i) && i > 0
    const gap = isBreak ? size * style.stanzaGap : 0
    heights.push(gap)
    totalH += gap + linePitch
  })
  let startY = regionY + Math.max(0, (regionH - totalH) / 2) + linePitch / 2
  if (totalH > regionH) { layout.overflow = true; startY = regionY + linePitch / 2 }

  const cols = manuscript ? Math.max(1, Math.floor(c.w / cell)) : 0
  let cursorY = startY
  let overStartY = 0
  lines.forEach((l, li) => {
    cursorY += heights[li]
    const chars = Array.from(l.text)
    const fill = authorFill(poem, style, l.authorId)
    const indent = style.authorDistinction === 'indent' && l.authorId && poem.authors.findIndex((a) => a.id === l.authorId) > 0 ? size : 0

    if (manuscript) {
      // one char per cell, wrap rows
      const rows = chunk(chars, cols)
      rows.forEach((row, ri) => {
        const y = cursorY + ri * cell
        const over = y > regionY + regionH
        if (over && !overStartY) overStartY = y - cell / 2
        row.forEach((ch, ci) => {
          const x = c.x + ci * cell + cell / 2
          layout.body.push({ ch, x, y, size: Math.min(size, cell * 0.78), fill, font: bodyFont, rotate: 0, over })
        })
      })
      cursorY += (rows.length - 1) * cell
    } else {
      const widths = chars.map((ch) => advance(ch, size, false))
      const lineW = widths.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1)
      const availW = c.w - indent
      let x = c.x + indent
      const isLastOfStanza = !poem.stanzaBreaks.includes(li + 1)
      let extra = 0
      if (style.align === 'center') x = c.x + indent + (availW - lineW) / 2
      else if (style.align === 'right') x = c.x + indent + (availW - lineW)
      else if (style.align === 'justify' && chars.length > 1 && lineW < availW && !isLastOfStanza) extra = (availW - lineW) / (chars.length - 1)
      const over = cursorY > regionY + regionH
      if (over && !overStartY) overStartY = cursorY - linePitch / 2
      let gx = x
      chars.forEach((ch, ci) => {
        const adv = widths[ci]
        layout.body.push({ ch, x: gx + adv / 2, y: cursorY, size, fill, font: bodyFont, rotate: 0, over })
        gx += adv + track + extra
      })
      // end mark for author distinction
      if (style.authorDistinction === 'endmark' && l.authorId) {
        const a = poem.authors.find((x) => x.id === l.authorId)
        if (a) layout.body.push({ ch: a.name.slice(-1), x: gx + size * 0.2, y: cursorY, size: size * 0.42, fill: a.color, font: bodyFont, rotate: 0, over, opacity: 0.8 })
      }
    }
    cursorY += linePitch
  })
  if (layout.overflow) layout.overflowBox = { x: c.x, y: overStartY || regionY + regionH, w: c.w, h: Math.max(0, cursorY - (overStartY || regionY + regionH)) }
}

/* ---------------- vertical (右起左行) ---------------- */
function layoutVertical(poem: Poem, style: CardStyle, layout: CardLayout, lines: { text: string; authorId?: string }[], bodyFont: string, titleFont: string, size: number, track: number) {
  const c = layout.content
  const titleW = style.title.position !== 'hidden' && poem.title ? size * style.title.scale * 1.5 : 0
  const sigW = style.signature.position !== 'hidden' && style.signature.show ? size * style.signature.scale * 1.8 : 0
  const rightInset = style.title.position === 'top' ? titleW : 0
  const leftInset = sigW + (style.title.position === 'bottom' ? titleW : 0)
  const bodyRight = c.x + c.w - rightInset - (rightInset ? size * 0.3 : 0)
  const bodyLeft = c.x + leftInset + (leftInset ? size * 0.3 : 0)
  const regionW = bodyRight - bodyLeft
  const colPitch = size * style.leading
  const stepV = size + track
  const maxChars = Math.max(1, Math.floor(c.h / stepV))

  // build columns
  interface Col { chars: string[]; fill: string; authorId?: string; stanzaStart: boolean }
  const cols: Col[] = []
  lines.forEach((l, li) => {
    const chars = Array.from(l.text)
    const fill = authorFill(poem, style, l.authorId)
    const parts = chunk(chars, maxChars)
    parts.forEach((p, pi) => cols.push({ chars: p, fill, authorId: l.authorId, stanzaStart: pi === 0 && poem.stanzaBreaks.includes(li) && li > 0 }))
  })

  let totalW = 0
  cols.forEach((col) => { totalW += colPitch + (col.stanzaStart ? size * style.stanzaGap : 0) })
  let cursorX = bodyRight - colPitch / 2
  if (totalW > regionW) { layout.overflow = true; cursorX = bodyRight - colPitch / 2 }
  else cursorX = bodyRight - colPitch / 2 - Math.max(0, (regionW - totalW) / 2)

  let overStartX = 0
  cols.forEach((col) => {
    if (col.stanzaStart) cursorX -= size * style.stanzaGap
    const n = col.chars.length
    const stackH = n * stepV - track
    let y = c.y + stepV / 2
    if (style.align === 'center') y = c.y + (c.h - stackH) / 2 + stepV / 2
    else if (style.align === 'right') y = c.y + c.h - stackH + stepV / 2 // bottom
    const over = cursorX < bodyLeft
    if (over && !overStartX) overStartX = cursorX + colPitch / 2
    col.chars.forEach((ch, i) => {
      const gy = y + i * stepV
      let rotate = 0
      let dx = 0
      let dy = 0
      if (ROTATE_PUNCT.includes(ch)) rotate = 90
      else if (CORNER_PUNCT.includes(ch)) { dx = size * 0.3; dy = size * 0.32 }
      else if (!isCJK(ch)) rotate = 90
      layout.body.push({ ch, x: cursorX + dx, y: gy + dy, size, fill: col.fill, font: bodyFont, rotate, over })
    })
    if (style.authorDistinction === 'endmark' && col.authorId) {
      const a = poem.authors.find((x) => x.id === col.authorId)
      if (a) layout.body.push({ ch: a.name.slice(-1), x: cursorX, y: y + n * stepV, size: size * 0.42, fill: a.color, font: bodyFont, rotate: 0, over, opacity: 0.8 })
    }
    cursorX -= colPitch
  })
  if (layout.overflow) layout.overflowBox = { x: bodyLeft, y: c.y, w: Math.max(0, (overStartX || bodyLeft) - bodyLeft), h: c.h }
}

/* ---------------- title ---------------- */
function buildTitle(poem: Poem, style: CardStyle, layout: CardLayout, vertical: boolean, titleFont: string) {
  if (style.title.position === 'hidden' || !poem.title) return
  const c = layout.content
  const size = style.size * style.title.scale
  const chars = Array.from(poem.title)
  const glyphs: Glyph[] = []
  const fill = style.inkColor
  const dx = style.title.dx * layout.w
  const dy = style.title.dy * layout.h

  if (vertical) {
    const stepV = size + style.tracking
    const colX = style.title.position === 'top' ? c.x + c.w - size * 0.75 : c.x + size * 0.75
    const stackH = chars.length * stepV
    const startY = c.y + size * 0.6
    chars.forEach((ch, i) => {
      let rotate = 0
      if (ROTATE_PUNCT.includes(ch) || !isCJK(ch)) rotate = 90
      glyphs.push({ ch, x: colX + dx, y: startY + i * stepV + dy, size, fill, font: titleFont, rotate, over: false })
    })
    layout.title = { glyphs, box: { x: colX - size * 0.75 + dx, y: c.y + dy, w: size * 1.5, h: stackH + size * 0.6 } }
  } else {
    const widths = chars.map((ch) => advance(ch, size, false))
    const lineW = widths.reduce((a, b) => a + b, 0) + style.tracking * Math.max(0, chars.length - 1)
    const y = style.title.position === 'top' ? c.y + size * 0.7 : c.y + c.h - size * 0.7
    let x = c.x + (c.w - lineW) / 2
    let gx = x
    chars.forEach((ch, i) => {
      glyphs.push({ ch, x: gx + widths[i] / 2 + dx, y: y + dy, size, fill, font: titleFont, rotate: 0, over: false })
      gx += widths[i] + style.tracking
    })
    layout.title = { glyphs, box: { x: x + dx, y: y - size * 0.7 + dy, w: lineW, h: size * 1.4 } }
  }
}

/* ---------------- signature ---------------- */
function buildSignature(poem: Poem, style: CardStyle, layout: CardLayout, vertical: boolean) {
  if (style.signature.position === 'hidden' || !style.signature.show) return
  const c = layout.content
  const size = style.size * style.signature.scale
  const font = fontStack(style.font)
  const fill = style.inkColor
  const dx = style.signature.dx * layout.w
  const dy = style.signature.dy * layout.h
  const parts: string[] = []
  if (poem.authors.length) parts.push(poem.authors.map((a) => a.name).join(' · '))
  if (style.signature.showDate && poem.showDate && poem.date) parts.push(poem.date)
  if (style.signature.showOrigin && poem.showOrigin && poem.origin) parts.push(poem.origin)
  if (!parts.length) return
  const glyphs: Glyph[] = []

  if (vertical) {
    // 落款: vertical column on the left, lower area
    const colX = c.x + size * 0.7
    const text = parts.join(' ')
    const chars = Array.from(text)
    const stepV = size + 2
    const stackH = chars.length * stepV
    const startY = c.y + c.h - stackH - size * 0.3
    chars.forEach((ch, i) => {
      let rotate = 0
      if (ROTATE_PUNCT.includes(ch) || (!isCJK(ch) && ch !== ' ')) rotate = 90
      glyphs.push({ ch, x: colX + dx, y: startY + i * stepV + dy, size, fill, font, rotate, over: false, opacity: 0.82 })
    })
    layout.signature = { glyphs, box: { x: colX - size * 0.7 + dx, y: startY + dy, w: size * 1.4, h: stackH } }
  } else {
    const text = parts.join('  ·  ')
    const chars = Array.from(text)
    const widths = chars.map((ch) => advance(ch, size, false))
    const lineW = widths.reduce((a, b) => a + b, 0) + 1.5 * Math.max(0, chars.length - 1)
    const y = style.signature.position === 'top' ? c.y + size * 0.7 : c.y + c.h - size * 0.7
    let gx = c.x + (c.w - lineW) / 2
    chars.forEach((ch, i) => {
      glyphs.push({ ch, x: gx + widths[i] / 2 + dx, y: y + dy, size, fill, font, rotate: 0, over: false, opacity: 0.82 })
      gx += widths[i] + 1.5
    })
    layout.signature = { glyphs, box: { x: c.x + (c.w - lineW) / 2 + dx, y: y - size * 0.7 + dy, w: lineW, h: size * 1.4 } }
  }
}