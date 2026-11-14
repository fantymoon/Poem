import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

export type LayoutMode = 'three' | 'two' | 'mobile'
export function useLayoutMode(): LayoutMode {
  const wide = useMediaQuery('(min-width: 1200px)')
  const mid = useMediaQuery('(min-width: 768px)')
  return wide ? 'three' : mid ? 'two' : 'mobile'
}