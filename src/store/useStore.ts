import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card, Handoff, Settings, Template } from '../lib/types'
import { uid } from '../lib/cardStyle'
import {
  loadCards, persistCards, loadUserTemplates, persistUserTemplates, parseImport,
} from '../lib/db'

export const defaultSettings: Settings = {
  theme: 'night',
  sound: false,
  reducedMotion: false,
  scatter: true,
  qian: { allowPast: true, shake: true, style: 'mixed' },
  dice: { count: 3, categories: ['object', 'place', 'sky'], custom: '' },
  blind: { lines: 6, allocation: 'alternate', blind: 'full', maxChars: 0, blindTitle: false, reveal: 'slow', hideAfterSeal: true },
  blackout: { snap: 'word', brush: 26, texture: 'marker', color: '#1f1c19' },
}

interface Toast {
  id: string
  msg: string
  kind: 'info' | 'success' | 'danger'
}

interface StoreState {
  settings: Settings
  setSettings: (patch: Partial<Settings>) => void
  setGameSettings: <K extends 'qian' | 'dice' | 'blind' | 'blackout'>(key: K, patch: Partial<Settings[K]>) => void

  handoff: Handoff | null
  setHandoff: (h: Handoff | null) => void

  cards: Card[]
  userTemplates: Template[]
  folioReady: boolean
  initFolio: () => Promise<void>
  saveCard: (card: Card) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  duplicateCard: (id: string) => Promise<Card | undefined>
  addTemplate: (t: Template) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  importFolio: (json: string) => Promise<number>

  toasts: Toast[]
  toast: (msg: string, kind?: Toast['kind']) => void
  dismissToast: (id: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setGameSettings: (key, patch) =>
        set((s) => ({ settings: { ...s.settings, [key]: { ...s.settings[key], ...patch } } })),

      handoff: null,
      setHandoff: (h) => set({ handoff: h }),

      cards: [],
      userTemplates: [],
      folioReady: false,
      initFolio: async () => {
        if (get().folioReady) return
        const [cards, userTemplates] = await Promise.all([loadCards(), loadUserTemplates()])
        set({ cards, userTemplates, folioReady: true })
      },
      saveCard: async (card) => {
        const cards = [...get().cards]
        const i = cards.findIndex((c) => c.id === card.id)
        if (i >= 0) cards[i] = card
        else cards.unshift(card)
        set({ cards })
        await persistCards(cards)
      },
      deleteCard: async (id) => {
        const cards = get().cards.filter((c) => c.id !== id)
        set({ cards })
        await persistCards(cards)
      },
      duplicateCard: async (id) => {
        const src = get().cards.find((c) => c.id === id)
        if (!src) return undefined
        const copy: Card = JSON.parse(JSON.stringify(src))
        copy.id = uid('card_')
        copy.poem.id = uid('poem_')
        copy.poem.title = copy.poem.title ? copy.poem.title + '（副本）' : ''
        copy.updatedAt = Date.now()
        const cards = [copy, ...get().cards]
        set({ cards })
        await persistCards(cards)
        return copy
      },
      addTemplate: async (t) => {
        const userTemplates = [t, ...get().userTemplates]
        set({ userTemplates })
        await persistUserTemplates(userTemplates)
      },
      deleteTemplate: async (id) => {
        const userTemplates = get().userTemplates.filter((t) => t.id !== id)
        set({ userTemplates })
        await persistUserTemplates(userTemplates)
      },
      importFolio: async (json) => {
        const { cards: incoming, templates } = parseImport(json)
        const existing = get().cards
        const ids = new Set(existing.map((c) => c.id))
        const merged = [...existing]
        let added = 0
        for (const c of incoming) {
          if (ids.has(c.id)) {
            const idx = merged.findIndex((x) => x.id === c.id)
            merged[idx] = c
          } else {
            merged.unshift(c)
            added++
          }
        }
        merged.sort((a, b) => b.updatedAt - a.updatedAt)
        const tplIds = new Set(get().userTemplates.map((t) => t.id))
        const newTpl = [...get().userTemplates, ...templates.filter((t) => !tplIds.has(t.id))]
        set({ cards: merged, userTemplates: newTpl })
        await Promise.all([persistCards(merged), persistUserTemplates(newTpl)])
        return added
      },

      toasts: [],
      toast: (msg, kind = 'info') => {
        const id = uid('t_')
        set((s) => ({ toasts: [...s.toasts, { id, msg, kind }] }))
        setTimeout(() => get().dismissToast(id), 3000)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'yijian-settings-v1',
      partialize: (s) => ({ settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted as any)?.settings || {}
        return {
          ...current,
          settings: {
            ...defaultSettings,
            ...p,
            qian: { ...defaultSettings.qian, ...(p.qian || {}) },
            dice: { ...defaultSettings.dice, ...(p.dice || {}) },
            blind: { ...defaultSettings.blind, ...(p.blind || {}) },
            blackout: { ...defaultSettings.blackout, ...(p.blackout || {}) },
          },
        }
      },
    },
  ),
)