import type { CardStyle, Poem, PaperStyle, Source } from './types'

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const defaultCardStyle: CardStyle = {
  direction: 'horizontal',
  font: 'song',
  inkColor: '#1f1c19',
  hideBody: false,
  size: 46,
  tracking: 4,
  leading: 1.8,
  stanzaGap: 0.9,
  align: 'center',
  authorDistinction: 'none',
  title: { position: 'top', scale: 1.5, font: 'kai', dx: 0, dy: 0 },
  signature: { position: 'bottom', scale: 0.6, show: true, showDate: true, showOrigin: true, dx: 0, dy: 0 },
  paper: { ratio: 'portrait', customW: 3, customH: 4, color: '#f3ede1' },
  texture: { type: 'xuan', opacity: 0.5, fit: 'cover' },
  grid: { type: 'none', color: '#b2382a', spacing: 82 },
  margin: { top: 140, right: 120, bottom: 140, left: 120, linked: true },
  seal: { on: false, text: '一笺', mode: 'zhu', shape: 'square', size: 96, rotation: -3, distress: 0.35, x: 0.82, y: 0.85, pair: false },
  border: { type: 'none', color: '#1f1c19' },
  stickers: [],
}

export function cloneStyle(s: CardStyle): CardStyle {
  return JSON.parse(JSON.stringify(s))
}

export function paperDims(paper: PaperStyle): { w: number; h: number } {
  let rw = 3
  let rh = 4
  switch (paper.ratio) {
    case 'square': rw = 1; rh = 1; break
    case 'portrait': rw = 3; rh = 4; break
    case 'postcard': rw = 3; rh = 2; break
    case 'bookmark': rw = 1; rh = 3; break
    case 'wallpaper': rw = 9; rh = 19.5; break
    case 'custom': rw = paper.customW || 3; rh = paper.customH || 4; break
  }
  const m = Math.min(rw, rh)
  const k = 1000 / m
  return { w: Math.round(rw * k), h: Math.round(rh * k) }
}

export const AUTHOR_COLORS = ['#b2382a', '#3f6b7d', '#6d7a3a', '#9a6a2f']

export function makePoem(partial: Partial<Poem> & { source: Source }): Poem {
  return {
    id: uid('poem_'),
    title: '',
    lines: [{ text: '' }],
    stanzaBreaks: [],
    authors: [],
    theme: [],
    date: todayStr(),
    showDate: true,
    showOrigin: true,
    createdAt: Date.now(),
    ...partial,
  }
}

// Convert a raw multiline string into Poem lines + stanza breaks.
export function parseBody(body: string): { lines: { text: string }[]; stanzaBreaks: number[] } {
  const raw = body.replace(/\r/g, '').split('\n')
  const lines: { text: string }[] = []
  const stanzaBreaks: number[] = []
  let pendingBreak = false
  for (const r of raw) {
    if (r.trim() === '') {
      if (lines.length > 0) pendingBreak = true
      continue
    }
    if (pendingBreak && lines.length > 0) {
      stanzaBreaks.push(lines.length)
      pendingBreak = false
    }
    lines.push({ text: r })
  }
  if (lines.length === 0) lines.push({ text: '' })
  return { lines, stanzaBreaks }
}

export function bodyFromPoem(poem: Poem): string {
  const out: string[] = []
  poem.lines.forEach((l, i) => {
    if (poem.stanzaBreaks.includes(i) && i > 0) out.push('')
    out.push(l.text)
  })
  return out.join('\n')
}

export const SOURCE_LABEL: Record<Source, string> = {
  free: '自己写',
  blind: '双盲',
  blackout: '遮字',
  qian: '一签',
  dice: '骰子',
}