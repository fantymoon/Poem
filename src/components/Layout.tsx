import { type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Icon } from './Icon'
import { playSound } from '../lib/sound'

const ROOMS = [
  { to: '/', label: '工坊', icon: 'workshop', end: true },
  { to: '/qian', label: '一签', icon: 'qian' },
  { to: '/dice', label: '骰子', icon: 'dice' },
  { to: '/blind', label: '双盲', icon: 'blind' },
  { to: '/blackout', label: '遮字', icon: 'blackout' },
]

function BrandSeal() {
  return (
    <div className="brand-seal" title="一笺" aria-label="一笺">
      <span>一</span>
      <span>笺</span>
    </div>
  )
}

function Controls({ compact }: { compact?: boolean }) {
  const theme = useStore((s) => s.settings.theme)
  const sound = useStore((s) => s.settings.sound)
  const setSettings = useStore((s) => s.setSettings)
  const navigate = useNavigate()
  const loc = useLocation()
  return (
    <div className="nav-controls">
      <button
        className={`icon-btn ${loc.pathname === '/folio' ? 'icon-btn-active' : ''}`}
        onClick={() => { playSound('click'); navigate('/folio') }}
        title="作品夹" aria-label="作品夹"
      >
        <Icon name="folio" size={19} />
        {!compact && <span className="icon-btn-label">作品夹</span>}
      </button>
      <button
        className="icon-btn"
        onClick={() => { setSettings({ theme: theme === 'night' ? 'day' : 'night' }); playSound('flip') }}
        title={theme === 'night' ? '切换到昼' : '切换到夜'} aria-label="昼夜切换"
      >
        <Icon name={theme === 'night' ? 'sun' : 'moon'} size={19} />
      </button>
      <button
        className={`icon-btn ${sound ? 'icon-btn-active' : ''}`}
        onClick={() => { setSettings({ sound: !sound }); if (!sound) setTimeout(() => playSound('click'), 30) }}
        title={sound ? '关闭音效' : '开启音效'} aria-label="音效开关" aria-pressed={sound}
      >
        <Icon name={sound ? 'soundOn' : 'soundOff'} size={19} />
      </button>
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      {/* desktop top bar */}
      <header className="topbar">
        <NavLink to="/" className="brand-link" aria-label="一笺 首页">
          <BrandSeal />
          <span className="brand-name font-display">一笺</span>
        </NavLink>
        <nav className="room-nav" aria-label="房间">
          {ROOMS.map((r) => (
            <NavLink key={r.to} to={r.to} end={r.end} className={({ isActive }) => `room-link ${isActive ? 'room-active' : ''}`}>
              <Icon name={r.icon} size={16} />
              <span>{r.label}</span>
            </NavLink>
          ))}
        </nav>
        <Controls />
      </header>

      {/* mobile slim top bar */}
      <header className="topbar-mobile">
        <NavLink to="/" className="brand-link" aria-label="一笺 首页">
          <BrandSeal />
        </NavLink>
        <Controls compact />
      </header>

      <main className="app-main">{children}</main>

      {/* mobile bottom nav */}
      <nav className="bottombar" aria-label="房间">
        {ROOMS.map((r) => (
          <NavLink key={r.to} to={r.to} end={r.end} className={({ isActive }) => `bottom-link ${r.to === '/' ? 'bottom-home' : ''} ${isActive ? 'bottom-active' : ''}`}>
            <Icon name={r.icon} size={r.to === '/' ? 24 : 21} />
            <span>{r.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}