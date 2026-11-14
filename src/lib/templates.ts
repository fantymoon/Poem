import type { CardStyle, Template } from './types'
import { defaultCardStyle, cloneStyle } from './cardStyle'

function make(over: Partial<CardStyle>): CardStyle {
  const s = cloneStyle(defaultCardStyle)
  return deepMerge(s, over)
}

function deepMerge<T>(base: T, over: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base }
  for (const k in over) {
    const v = (over as any)[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && (base as any)[k] && typeof (base as any)[k] === 'object') {
      out[k] = deepMerge((base as any)[k], v)
    } else {
      out[k] = v
    }
  }
  return out
}

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'sujian',
    name: '素笺',
    builtIn: true,
    style: make({}),
  },
  {
    id: 'shufu',
    name: '竖幅',
    builtIn: true,
    style: make({
      direction: 'vertical',
      font: 'kai',
      align: 'left',
      size: 48,
      tracking: 6,
      leading: 2.0,
      grid: { type: 'wusi', color: '#8a8172', spacing: 92 },
      title: { position: 'top', scale: 1.4, font: 'kai', dx: 0, dy: 0 },
      seal: { on: true, text: '一笺', mode: 'zhu', shape: 'square', size: 92, rotation: -2, distress: 0.4, x: 0.2, y: 0.86, pair: false },
      margin: { top: 150, right: 130, bottom: 150, left: 130, linked: true },
    }),
  },
  {
    id: 'yejian',
    name: '夜笺',
    builtIn: true,
    style: make({
      font: 'song',
      inkColor: '#f0e8da',
      paper: { ratio: 'portrait', customW: 3, customH: 4, color: '#23201c' },
      texture: { type: 'xuan', opacity: 0.28, fit: 'cover' },
      size: 44,
      leading: 2.1,
      tracking: 6,
      margin: { top: 200, right: 170, bottom: 200, left: 170, linked: true },
      seal: { on: true, text: '夜', mode: 'zhu', shape: 'round', size: 78, rotation: 3, distress: 0.45, x: 0.8, y: 0.84, pair: false },
      border: { type: 'none', color: '#f0e8da' },
    }),
  },
  {
    id: 'gaozhi',
    name: '稿纸',
    builtIn: true,
    style: make({
      font: 'song',
      size: 40,
      align: 'left',
      paper: { ratio: 'portrait', customW: 3, customH: 4, color: '#f4f1e6' },
      texture: { type: 'none', opacity: 0.4, fit: 'cover' },
      grid: { type: 'manuscript', color: '#6d7a3a', spacing: 74 },
      title: { position: 'top', scale: 1.3, font: 'hei', dx: 0, dy: 0 },
      margin: { top: 130, right: 110, bottom: 130, left: 110, linked: true },
      seal: { on: false, text: '稿', mode: 'zhu', shape: 'square', size: 80, rotation: 0, distress: 0.3, x: 0.85, y: 0.88, pair: false },
    }),
  },
  {
    id: 'hezhu',
    name: '合著',
    builtIn: true,
    style: make({
      font: 'song',
      authorDistinction: 'color',
      align: 'center',
      size: 44,
      leading: 1.95,
      paper: { ratio: 'portrait', customW: 3, customH: 4, color: '#f3ede1' },
      seal: { on: true, text: '合', mode: 'zhu', shape: 'square', size: 74, rotation: -2, distress: 0.4, x: 0.5, y: 0.88, pair: true },
      signature: { position: 'bottom', scale: 0.58, show: true, showDate: true, showOrigin: true, dx: 0, dy: -0.02 },
    }),
  },
  {
    id: 'jiubao',
    name: '旧报',
    builtIn: true,
    style: make({
      font: 'song',
      hideBody: true,
      paper: { ratio: 'portrait', customW: 3, customH: 4, color: '#e9e0cd' },
      texture: { type: 'image', opacity: 1, fit: 'cover' },
      title: { position: 'top', scale: 1.2, font: 'hei', dx: 0, dy: 0 },
      seal: { on: true, text: '遮', mode: 'zhu', shape: 'square', size: 80, rotation: -4, distress: 0.5, x: 0.84, y: 0.86, pair: false },
      margin: { top: 120, right: 110, bottom: 120, left: 110, linked: true },
    }),
  },
  {
    id: 'qiantiao',
    name: '签条',
    builtIn: true,
    style: make({
      direction: 'vertical',
      font: 'kai',
      paper: { ratio: 'bookmark', customW: 1, customH: 3, color: '#efe4c4' },
      texture: { type: 'xuan', opacity: 0.5, fit: 'cover' },
      size: 52,
      leading: 1.6,
      tracking: 8,
      align: 'center',
      title: { position: 'top', scale: 1.15, font: 'kai', dx: 0, dy: 0 },
      border: { type: 'thin', color: '#b2382a' },
      seal: { on: true, text: '签', mode: 'zhu', shape: 'round', size: 74, rotation: 2, distress: 0.4, x: 0.5, y: 0.9, pair: false },
      signature: { position: 'bottom', scale: 0.5, show: true, showDate: true, showOrigin: false, dx: 0, dy: 0 },
      margin: { top: 150, right: 90, bottom: 150, left: 90, linked: true },
    }),
  },
]

export function templateById(id: string): Template | undefined {
  return PRESET_TEMPLATES.find((t) => t.id === id)
}

// source → default template id (spec 3.4)
export const SOURCE_TEMPLATE: Record<string, string> = {
  free: 'sujian',
  blind: 'hezhu',
  blackout: 'jiubao',
  qian: 'qiantiao',
  dice: 'sujian',
}