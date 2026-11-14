import { useCallback, useRef, useState } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

// Undo/redo with coalescing for continuous edits (sliders, drag).
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] })
  const lastKey = useRef<string | null>(null)
  const lastTime = useRef(0)

  const set = useCallback((updater: T | ((prev: T) => T), coalesceKey?: string) => {
    setState((s) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(s.present) : updater
      if (next === s.present) return s
      const now = Date.now()
      const coalesce = coalesceKey != null && lastKey.current === coalesceKey && now - lastTime.current < 700
      lastKey.current = coalesceKey ?? null
      lastTime.current = now
      if (coalesce) return { ...s, present: next, future: [] }
      const past = [...s.past, s.present].slice(-60)
      return { past, present: next, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    lastKey.current = null
    setState((s) => {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future].slice(0, 60) }
    })
  }, [])

  const redo = useCallback(() => {
    lastKey.current = null
    setState((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) }
    })
  }, [])

  const reset = useCallback((value: T) => {
    lastKey.current = null
    setState({ past: [], present: value, future: [] })
  }, [])

  return {
    present: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}