// Tiny synthesized sound effects — no assets, all offline. Default off (spec 1.5).
import { useStore } from '../store/useStore'

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

export type SoundName = 'flip' | 'dice' | 'seal' | 'draw' | 'reveal' | 'click'

export function playSound(name: SoundName) {
  if (!useStore.getState().settings.sound) return
  const c = ac()
  if (!c) return
  const now = c.currentTime
  const master = c.createGain()
  master.connect(c.destination)
  master.gain.value = 0.5

  if (name === 'flip' || name === 'draw') {
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c, 0.22)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1800, now)
    bp.frequency.exponentialRampToValueAtTime(600, now + 0.2)
    bp.Q.value = 0.8
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    src.connect(bp).connect(g).connect(master)
    src.start(now); src.stop(now + 0.24)
  } else if (name === 'dice') {
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.07 + Math.random() * 0.02
      const src = c.createBufferSource()
      src.buffer = noiseBuffer(c, 0.05)
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'; bp.frequency.value = 2200 + Math.random() * 800; bp.Q.value = 2
      const g = c.createGain()
      g.gain.setValueAtTime(0.35, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      src.connect(bp).connect(g).connect(master)
      src.start(t); src.stop(t + 0.06)
    }
  } else if (name === 'seal') {
    const o = c.createOscillator()
    o.type = 'sine'; o.frequency.setValueAtTime(150, now)
    o.frequency.exponentialRampToValueAtTime(60, now + 0.12)
    const g = c.createGain()
    g.gain.setValueAtTime(0.5, now)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    o.connect(g).connect(master)
    o.start(now); o.stop(now + 0.2)
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c, 0.06)
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.2, now); g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
    src.connect(g2).connect(master); src.start(now); src.stop(now + 0.07)
  } else if (name === 'reveal') {
    const o = c.createOscillator()
    o.type = 'triangle'; o.frequency.setValueAtTime(520, now)
    o.frequency.exponentialRampToValueAtTime(880, now + 0.18)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    o.connect(g).connect(master); o.start(now); o.stop(now + 0.32)
  } else if (name === 'click') {
    const o = c.createOscillator()
    o.type = 'square'; o.frequency.value = 660
    const g = c.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    o.connect(g).connect(master); o.start(now); o.stop(now + 0.06)
  }
}