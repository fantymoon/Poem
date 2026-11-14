import { get, set, del } from 'idb-keyval'
import type { Card, Template } from './types'

const CARDS_KEY = 'yijian-folio-v1'
const TPL_KEY = 'yijian-templates-v1'

export async function loadCards(): Promise<Card[]> {
  try {
    return (await get<Card[]>(CARDS_KEY)) || []
  } catch {
    return []
  }
}

export async function persistCards(cards: Card[]): Promise<void> {
  await set(CARDS_KEY, cards)
}

export async function loadUserTemplates(): Promise<Template[]> {
  try {
    return (await get<Template[]>(TPL_KEY)) || []
  } catch {
    return []
  }
}

export async function persistUserTemplates(t: Template[]): Promise<void> {
  await set(TPL_KEY, t)
}

export interface FolioExport {
  app: 'yijian'
  version: 1
  exportedAt: number
  cards: Card[]
  templates: Template[]
}

export function buildExport(cards: Card[], templates: Template[]): FolioExport {
  return { app: 'yijian', version: 1, exportedAt: Date.now(), cards, templates }
}

export function parseImport(json: string): { cards: Card[]; templates: Template[] } {
  const data = JSON.parse(json)
  if (!data || data.app !== 'yijian' || !Array.isArray(data.cards)) {
    throw new Error('不是一笺的作品夹文件')
  }
  return { cards: data.cards as Card[], templates: (data.templates || []) as Template[] }
}

export async function clearAll(): Promise<void> {
  await del(CARDS_KEY)
  await del(TPL_KEY)
}