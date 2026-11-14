import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { DICE_CATEGORIES, categoryById } from '../lib/data/dice'
import { makePoem } from '../lib/cardStyle'
import { playSound } from '../lib/sound'
import { Icon } from '../components/Icon'
import { Stepper, Select } from '../components/ui'

interface Die { category: string; locked: boolean; words: string[]; faceIndex: number; spin: number }
interface Recent { words: string[]; at: number }

const FACE_ROT = [
  { x: 0, y: 0 }, { x: 0, y: 180 }, { x: 0, y: -90 }, { x: 0, y: 90 }, { x: -90, y: 0 }, { x: 90, y: 0 },
]
const RECENT_KEY = 'yijian-dice-recent-v1'

function parseCustom(custom: string): string[] {
  return custom.split(/[\n,，、\s]+/).map((w) => w.trim()).filter(Boolean)
}
function sampleN(bank: string[], n: number): string[] {
  if (!bank.length) return Array.from({ length: n }, () => '—')
  const pool = [...bank]
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    if (!pool.length) pool.push(...bank)
    const j = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(j, 1)[0])
  }
  return out
}

export function Dice() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const setGameSettings = useStore((s) => s.setGameSettings)
  const setHandoff = useStore((s) => s.setHandoff)
  const toast = useStore((s) => s.toast)
  const ds = settings.dice
  const reduced = settings.reducedMotion

  const bankFor = (cat: string): string[] => {
    if (cat === 'custom') { const c = parseCustom(ds.custom); return c.length ? c : categoryById('object').words }
    return categoryById(cat).words
  }

  const [dice, setDice] = useState<Die[]>(() =>
    Array.from({ length: ds.count }, (_, i) => {
      const category = ds.categories[i] || 'object'
      return { category, locked: false, words: sampleN(category === 'custom' ? parseCustom(ds.custom) : categoryById(category).words, 6), faceIndex: 0, spin: 0 }
    }),
  )
  const [rolling, setRolling] = useState(false)
  const [hasRolled, setHasRolled] = useState(false)
  const [recent, setRecent] = useState<Recent[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  })
  const timer = useRef<number>()
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const words = useMemo(() => dice.map((d) => d.words[d.faceIndex] || '—'), [dice])

  const catOptions = [...DICE_CATEGORIES.map((c) => ({ value: c.id, label: c.name })), { value: 'custom', label: '自定义' }]

  const setCount = (n: number) => {
    setGameSettings('dice', { count: n })
    setDice((prev) => {
      const next = [...prev]
      while (next.length < n) {
        const category = ds.categories[next.length] || 'object'
        next.push({ category, locked: false, words: sampleN(bankFor(category), 6), faceIndex: 0, spin: 0 })
      }
      next.length = n
      return next
    })
  }

  const setCategory = (i: number, category: string) => {
    const cats = dice.map((d) => d.category); cats[i] = category
    setGameSettings('dice', { categories: cats })
    setDice((prev) => prev.map((d, di) => di === i ? { ...d, category, words: sampleN(bankFor(category), 6), faceIndex: 0 } : d))
  }

  const toggleLock = (i: number) => setDice((prev) => prev.map((d, di) => di === i ? { ...d, locked: !d.locked } : d))

  const roll = () => {
    if (rolling) return
    const next = dice.map((d) => {
      if (d.locked) return d
      return { ...d, words: sampleN(bankFor(d.category), 6), faceIndex: Math.floor(Math.random() * 6), spin: d.spin + 2 + Math.floor(Math.random() * 2) }
    })
    setDice(next)
    setRolling(true)
    playSound('dice')
    timer.current = window.setTimeout(() => {
      setRolling(false)
      setHasRolled(true)
      playSound('reveal')
      const w = next.map((d) => d.words[d.faceIndex] || '—')
      setRecent((prev) => {
        const r = [{ words: w, at: Date.now() }, ...prev].slice(0, 10)
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(r)) } catch { /* ignore */ }
        return r
      })
    }, reduced ? 0 : 950)
  }

  const writePoem = () => {
    const poem = makePoem({ source: 'dice', theme: words, origin: `意象 · ${words.join(' · ')}`, lines: [{ text: '' }] })
    setHandoff({ poem, templateHint: 'sujian' })
    playSound('click'); navigate('/')
  }
  const sendBlind = () => { setHandoff({ theme: words, target: 'blind' }); toast('意象已送去双盲', 'success'); navigate('/blind') }
  const sendBlackout = () => { setHandoff({ theme: words, target: 'blackout' }); toast('意象已送去遮字', 'success'); navigate('/blackout') }
  const reuseRecent = (r: Recent) => {
    setDice((prev) => prev.map((d, i) => ({ ...d, words: [r.words[i] || r.words[0] || '—', ...d.words.slice(1)], faceIndex: 0 })))
    setHasRolled(true)
    playSound('flip')
  }

  return (
    <div className="game-room dice-room">
      <div className="game-main">
        <div className="game-head">
          <h1 className="game-title font-display">意象骰子</h1>
          <p className="game-sub soft">掷出几个词，让它们撞出一首诗。</p>
        </div>

        <div className="game-scroll dice-scroll">
          <div className={`dice-tray ${rolling ? 'rolling' : ''}`}>
            {dice.map((d, i) => {
              const rot = FACE_ROT[d.faceIndex]
              const rx = rot.x + d.spin * 360
              const ry = rot.y + d.spin * 360
              return (
                <div className="die-col" key={i}>
                  <div className={`die ${d.locked ? 'die-locked' : ''}`}>
                    <div className="die-tilt">
                      <div className="die-cube" style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transitionDuration: reduced ? '0ms' : '950ms' }}>
                        {d.words.map((w, fi) => (
                          <div className={`die-face face-${fi}`} key={fi}><span className="die-word font-poem">{w}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="die-controls">
                    <Select options={catOptions} value={d.category} onChange={(v) => setCategory(i, v)} ariaLabel={`第${i + 1}颗骰子的类别`} />
                    <button className={`die-lock ${d.locked ? 'locked' : ''}`} onClick={() => toggleLock(i)} title={d.locked ? '已锁定，掷骰时保留' : '锁定这颗'} aria-pressed={d.locked}>
                      <Icon name={d.locked ? 'lock' : 'unlock'} size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button className="btn btn-seal btn-lg dice-roll-btn" onClick={roll} disabled={rolling}>
            <Icon name="dice" size={18} /> {rolling ? '骰子滚动中…' : hasRolled ? '再掷一次' : '掷骰子'}
          </button>

          {hasRolled && (
            <div className="dice-result rise-in">
              <div className="dice-words">
                {words.map((w, i) => <span className="dice-word-chip font-display" key={i}>{w}</span>)}
              </div>
              <div className="dice-actions">
                <button className="btn btn-seal" onClick={writePoem}><Icon name="pen" size={16} /> 用这些词写诗</button>
                <button className="btn btn-line" onClick={sendBlind}><Icon name="blind" size={15} /> 送去双盲</button>
                <button className="btn btn-line" onClick={sendBlackout}><Icon name="blackout" size={15} /> 送去遮字</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="game-aside on-desk-scroll">
        <div className="game-aside-inner">
          <div className="game-aside-block">
            <div className="spread">
              <span className="field-label">骰子数量</span>
              <Stepper value={ds.count} min={1} max={5} onChange={setCount} />
            </div>
            <div className="field-hint">每颗骰子可单独选类别、单独锁定。锁定的词在下次掷骰时保留。</div>
          </div>

          <div className="game-aside-block">
            <div className="field-label">自定义词库</div>
            <textarea
              className="text-input dice-custom" rows={4}
              placeholder={'把自己的词放进来，\n用逗号或换行分隔。\n选「自定义」类别即可使用。'}
              value={ds.custom} onChange={(e) => setGameSettings('dice', { custom: e.target.value })}
            />
            <div className="field-hint">{parseCustom(ds.custom).length} 个词</div>
          </div>

          <div className="game-aside-block">
            <div className="field-label">最近掷出</div>
            {recent.length === 0 ? (
              <div className="field-hint">还没有记录。掷一次试试。</div>
            ) : (
              <div className="dice-recent">
                {recent.map((r, i) => (
                  <button className="dice-recent-row" key={i} onClick={() => reuseRecent(r)} title="重新取用这组词">
                    <span className="dice-recent-words font-poem">{r.words.join(' · ')}</span>
                    <Icon name="refresh" size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="game-aside-note field-hint">
            骰子只给意象，不给句子。把撞出来的词带去工坊自己写，或送去双盲、遮字，看看它们长成什么。
          </p>
        </div>
      </aside>
    </div>
  )
}