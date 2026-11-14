import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { Layout } from './components/Layout'
import { Toasts } from './components/ui'
import { Workshop } from './pages/Workshop'
import { Qian } from './pages/Qian'
import { Dice } from './pages/Dice'
import { Blind } from './pages/Blind'
import { Blackout } from './pages/Blackout'
import { Folio } from './pages/Folio'

function Ambient() {
  const motes = Array.from({ length: 14 })
  return (
    <>
      <div className="desk-bg" />
      <div className="desk-grain" />
      <div className="motes" aria-hidden="true">
        {motes.map((_, i) => {
          const left = (i * 67) % 100
          const dur = 14 + (i % 7) * 3
          const delay = -(i * 1.7)
          const size = 2 + (i % 3)
          return (
            <span
              key={i}
              className="mote"
              style={{ left: left + '%', top: 60 + (i % 5) * 8 + '%', width: size, height: size, animationDuration: dur + 's', animationDelay: delay + 's' }}
            />
          )
        })}
      </div>
    </>
  )
}

export function App() {
  const theme = useStore((s) => s.settings.theme)
  const reduced = useStore((s) => s.settings.reducedMotion)
  const initFolio = useStore((s) => s.initFolio)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'day' ? '#E9E3D6' : '#2B2724')
  }, [theme, reduced])

  useEffect(() => { initFolio() }, [initFolio])

  return (
    <HashRouter>
      <Ambient />
      <Layout>
        <Routes>
          <Route path="/" element={<Workshop />} />
          <Route path="/qian" element={<Qian />} />
          <Route path="/dice" element={<Dice />} />
          <Route path="/blind" element={<Blind />} />
          <Route path="/blackout" element={<Blackout />} />
          <Route path="/folio" element={<Folio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toasts />
    </HashRouter>
  )
}