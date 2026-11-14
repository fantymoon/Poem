// 一笺 — shared data model. Every game outputs a Poem; the workshop only knows Poem.

export type Source = 'free' | 'blind' | 'blackout' | 'qian' | 'dice'

export interface Author {
  id: string
  name: string
  color: string
}

export interface PoemLine {
  text: string
  authorId?: string
}

export interface Poem {
  id: string
  title: string
  lines: PoemLine[]
  stanzaBreaks: number[] // line indices that START a new stanza
  authors: Author[]
  source: Source
  theme?: string[]
  origin?: string // 出处 e.g. "双盲 · 主题词：塔"
  date?: string // YYYY-MM-DD, shown on card
  showDate?: boolean
  showOrigin?: boolean
  blackoutImage?: string // dataURL, kept-as-is blackout background
  createdAt: number
}

export type Direction = 'horizontal' | 'vertical'
export type Align = 'left' | 'center' | 'right' | 'justify'

export interface TitleStyle {
  position: 'top' | 'bottom' | 'hidden'
  scale: number // font size multiplier vs body
  font: string | null // null = same as body
  dx: number // normalized drag offset -0.5..0.5 of paper
  dy: number
}

export interface SignatureStyle {
  position: 'bottom' | 'top' | 'hidden'
  scale: number
  show: boolean
  showDate: boolean
  showOrigin: boolean
  dx: number
  dy: number
}

export type RatioKey = 'square' | 'portrait' | 'postcard' | 'bookmark' | 'wallpaper' | 'custom'

export interface PaperStyle {
  ratio: RatioKey
  customW: number
  customH: number
  color: string
}

export interface TextureStyle {
  type: 'none' | 'xuan' | 'kraft' | 'water' | 'image'
  opacity: number
  fit: 'cover' | 'center'
  image?: string
}

export interface GridStyle {
  type: 'none' | 'letter' | 'manuscript' | 'wusi'
  color: string
  spacing: number
}

export interface MarginStyle {
  top: number
  right: number
  bottom: number
  left: number
  linked: boolean
}

export interface SealStyle {
  on: boolean
  text: string
  mode: 'zhu' | 'bai' // 朱文 red glyphs / 白文 white glyphs
  shape: 'square' | 'round'
  size: number
  rotation: number
  distress: number // 0..1 印泥斑驳
  x: number // normalized 0..1 center
  y: number
  pair: boolean // two name seals side by side (合著)
}

export interface BorderStyle {
  type: 'none' | 'thin' | 'double' | 'torn'
  color: string
}

export interface Sticker {
  id: string
  type: 'flower' | 'ticket' | 'clip' | 'leaf' | 'stamp'
  x: number
  y: number
  scale: number
  rotation: number
}

export type AuthorDistinction = 'none' | 'color' | 'indent' | 'endmark'

export interface CardStyle {
  direction: Direction
  font: string
  inkColor: string
  hideBody: boolean
  size: number
  tracking: number
  leading: number
  stanzaGap: number
  align: Align
  authorDistinction: AuthorDistinction
  title: TitleStyle
  signature: SignatureStyle
  paper: PaperStyle
  texture: TextureStyle
  grid: GridStyle
  margin: MarginStyle
  seal: SealStyle
  border: BorderStyle
  stickers: Sticker[]
}

export interface Card {
  id: string
  poem: Poem
  style: CardStyle
  updatedAt: number
}

export interface Template {
  id: string
  name: string
  style: CardStyle
  builtIn: boolean
}

export interface FontDef {
  id: string
  name: string
  stack: string
  vertical: boolean
}

// ---- game option bundles ----

export interface QianSettings {
  allowPast: boolean
  shake: boolean
  style: 'serious' | 'playful' | 'mixed'
}

export interface DiceSettings {
  count: number
  categories: string[] // per die
  custom: string // newline separated
}

export interface BlindSettings {
  lines: number
  allocation: 'alternate' | 'halves' | 'random'
  blind: 'full' | 'lastchar'
  maxChars: number // 0 = unlimited
  blindTitle: boolean
  reveal: 'slow' | 'fast' | 'manual'
  hideAfterSeal: boolean
}

export interface BlackoutSettings {
  snap: 'word' | 'char' | 'free'
  brush: number
  texture: 'marker' | 'ink' | 'tape'
  color: string
}

export interface Settings {
  theme: 'night' | 'day'
  sound: boolean
  reducedMotion: boolean
  scatter: boolean // folio random rotation
  qian: QianSettings
  dice: DiceSettings
  blind: BlindSettings
  blackout: BlackoutSettings
}

// A handoff carries a poem (or a theme) between rooms.
export interface Handoff {
  poem?: Poem
  card?: Card // full card when editing from folio
  theme?: string[]
  target?: 'blind' | 'blackout'
  templateHint?: string
  challenge?: boolean // blackout: only keep words containing theme
}