import type { CSSProperties } from 'react'

// Thin-line icons (1.5px), no color fills (spec 1.4).
const P: Record<string, string> = {
  workshop: 'M4 20l4-1 9.5-9.5-3-3L5 16l-1 4zM13.5 6.5l3 3M16 4l1.5-1.5a1.8 1.8 0 012.5 2.5L18.5 6.5',
  qian: 'M8 3h8l-1 18H9L8 3zM8 7h8M10 3l.5 4M14 3l-.5 4',
  dice: 'M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8',
  blind: 'M12 4v16M12 4C9 6 6 6 4 5v13c2 1 5 1 8-1M12 4c3 2 6 2 8 1v13c-2 1-5 1-8-1',
  blackout: 'M4 6h16M4 10h10M4 14h16M4 18h7',
  folio: 'M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z',
  sun: 'M12 4v2M12 18v2M4 12H2M22 12h-2M6 6L4.5 4.5M19.5 19.5L18 18M18 6l1.5-1.5M4.5 19.5L6 18M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z',
  soundOn: 'M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 010 6M18.5 7a6 6 0 010 10',
  soundOff: 'M4 9v6h4l5 4V5L8 9H4zM17 9l4 6M21 9l-4 6',
  undo: 'M8 7L4 11l4 4M4 11h11a5 5 0 010 10h-2',
  redo: 'M16 7l4 4-4 4M20 11H9a5 5 0 000 10h2',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L19 7',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v9H5v-9zM12 15v2',
  unlock: 'M7 11V8a5 5 0 019.5-2M5 11h14v9H5v-9zM12 15v2',
  download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
  edit: 'M4 20l4-1 10-10-3-3L5 16l-1 4zM13.5 6.5l3 3',
  copy: 'M9 9h10v10H9V9zM5 15V5h10',
  trash: 'M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4M11 8v6M8 11h6',
  grid: 'M4 4h16v16H4V4zM4 10h16M4 16h16M10 4v16M16 4v16',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  shuffle: 'M4 7h4l8 10h4M4 17h4l2-2.5M14 9l2-2h4M18 5l2 2-2 2M18 15l2 2-2 2',
  refresh: 'M4 12a8 8 0 0114-5l2 2M20 4v5h-5M20 12a8 8 0 01-14 5l-2-2M4 20v-5h5',
  calendar: 'M5 6h14v14H5V6zM5 10h14M9 4v4M15 4v4',
  image: 'M4 5h16v14H4V5zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  print: 'M7 8V4h10v4M7 16H5v-6h14v6h-2M7 13h10v7H7v-7z',
  save: 'M5 5h11l3 3v11H5V5zM8 5v5h7V5M8 19v-6h8v6',
  seal: 'M6 4h12v12H6V4zM9 20h6M12 16v4M9 8h6M9 11h6',
  eraser: 'M4 15l7-7 6 6-4 4H8l-4-3zM9 20h11',
  circle: 'M12 4a8 8 0 100 16 8 8 0 000-16z',
  pen: 'M4 20l3-1 11-11-2-2L5 17l-1 3zM14 6l2 2',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z',
  book: 'M5 4h9a3 3 0 013 3v13H8a3 3 0 00-3 3V4zM5 4v16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 100 6 3 3 0 000-6z',
  layers: 'M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18',
  send: 'M4 12l16-8-6 16-3-6-7-2z',
  hand: 'M8 12V6a1.5 1.5 0 013 0v5M11 11V5a1.5 1.5 0 013 0v6M14 11V7a1.5 1.5 0 013 0v7a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 13',
}

export function Icon({ name, size = 18, style, strokeWidth = 1.5, className }: {
  name: keyof typeof P | string
  size?: number
  style?: CSSProperties
  strokeWidth?: number
  className?: string
}) {
  const d = P[name] || P.circle
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}