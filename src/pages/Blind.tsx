import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { makePoem, AUTHOR_COLORS } from '../lib/cardStyle'
import type { PoemLine } from '../lib/types'
import { playSound } from '../lib/sound'
import { Icon } from '../components/Icon'
import { Segmented, Stepper, ToggleRow, Slider } from '../components/ui'

type Phase = 'setup' | 'handoff' | 'writing' | 'reveal'
interface Player { id: string; name: string; color: string }

const NAMES_KEY = 'yijian-blind-names-v1'

function loadNames(): [string, string] {
  try { const v = JSON.parse(localStorage.getItem(NAMES_KEY) || '[]'); return [v[0] || '甲', v[1] || '乙'] } catch { return ['甲', '乙'] }
}

export function Blind() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const setGameSettings = useStore((s) => s.setGameSettings)
  const setHandoff = useStore((s) => s.setHandoff)
  const handoff = useStore((s) => s.handoff)
  const toast = useStore((s) => s.toast)
  const bs = settings.blind
  const reduced = settings.reducedMotion

  const [names, setNames] = useState<[string, string]>(loadNames)
  const players: Player[] = useMemo(() => [
    { id: 'a', name: names[0] || '甲', color: AUTHOR_COLORS[0] },
    { id: 'b', name: names[1] || '乙', color: AUTHOR_COLORS[1] },
  ], [names])

  const theme = handoff?.theme || []
  useEffect(() => { if (handoff?.target === 'blind' || handoff?.theme) setHandoff(null) }, [])

  const [phase, setPhase] = useState<Phase>('setup')
  const [assign, setAssign] = useState<string[]>([])
  const [lines, setLines] = useState<PoemLine[]>([])
  const [turn, setTurn] = useState(0)
  const [draft, setDraft] = useState('')
  const [seeds, setSeeds] = useState<Record<string, string>>({})
  const [seedDraft, setSeedDraft] = useState('')
  const [title, setTitle] = useState('')
  const [revealed, setRevealed] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const revealTimer = useRef<number>()

  const total = bs.lines
  const curPlayer = players[assign[turn] === 'b' ? 1 : 0]
  const isFirstTurnForPlayer = assign.slice(0, turn).every((a) => a !== assign[turn])

  const buildAssign = (): string[] => {
    const out: string[] = []
    if (bs.allocation === 'alternate') for (let i = 0; i < total; i++) out.push(i % 2 === 0 ? 'a' : 'b')
    else if (bs.allocation === 'halves') { const h = Math.ceil(total / 2); for (let i = 0; i < total; i++) out.push(i < h ? 'a' : 'b') }
    else for (let i = 0; i < total; i++) out.push(Math.random() < 0.5 ? 'a' : 'b')
    return out
  }

  const start = () => {
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(names)) } catch { /* ignore */ }
    setAssign(buildAssign())
    setLines(Array.from({ length: total }, () => ({ text: '' })))
    setTurn(0); setDraft(''); setSeeds({}); setSeedDraft(''); setTitle(''); setRevealed(0)
    setPhase('handoff')
    playSound('flip')
  }

  const ready = () => { setPhase('writing'); playSound('flip'); setTimeout(() => inputRef.current?.focus(), 80) }

  const commit = () => {
    const text = draft.trim()
    if (!text) return
    const pid = assign[turn]
    const nextLines = lines.map((l, i) => i === turn ? { text, authorId: pid } : l)
    setLines(nextLines)
    if (bs.blindTitle && isFirstTurnForPlayer && seedDraft.trim()) setSeeds((s) => ({ ...s, [pid]: seedDraft.trim() }))
    setDraft(''); setSeedDraft('')
    playSound('seal')
    const nextTurn = turn + 1
    if (nextTurn >= total) { setPhase('reveal'); return }
    setTurn(nextTurn)
    const authorChanged = assign[nextTurn] !== pid
    if (authorChanged || bs.hideAfterSeal) setPhase('handoff')
    else setTimeout(() => inputRef.current?.focus(), 60)
  }

  // zipper reveal
  useEffect(() => {
    if (phase !== 'reveal') return
    setRevealed(0)
    if (bs.reveal === 'manual') { setRevealed(0); return }
    const step = reduced ? 0 : bs.reveal === 'fast' ? 180 : 520
    let i = 0
    const tick = () => {
      i++; setRevealed(i); playSound('reveal')
      if (i < total) revealTimer.current = window.setTimeout(tick, step)
      else finalizeTitle()
    }
    revealTimer.current = window.setTimeout(tick, step || 10)
    return () => { if (revealTimer.current) window.clearTimeout(revealTimer.current) }
  }, [phase])

  const finalizeTitle = () => {
    if (bs.blindTitle) {
      const merged = players.map((p) => seeds[p.id]).filter(Boolean).join('·')
      if (merged) setTitle(merged)
    }
  }
  const revealNext = () => {
    if (revealed < total) { setRevealed((r) => r + 1); playSound('reveal'); if (revealed + 1 >= total) finalizeTitle() }
  }

  const makeCard = () => {
    const poem = makePoem({
      source: 'blind',
      title: title.trim(),
      lines: lines.map((l) => ({ text: l.text, authorId: l.authorId })),
      authors: players,
      theme,
      origin: theme.length ? `双盲 · 主题：${theme.join(' ')}` : '双盲合著',
    })
    setHandoff({ poem, templateHint: 'hezhu' })
    playSound('click'); navigate('/')
  }
  const replay = () => { setAssign(buildAssign()); setLines(Array.from({ length: total }, () => ({ text: '' }))); setTurn(0); setDraft(''); setSeeds({}); setSeedDraft(''); setTitle(''); setRevealed(0); setPhase('handoff'); playSound('flip') }
  const rematch = () => { setPhase('setup'); playSound('flip') }

  /* ---------------- setup ---------------- */
  if (phase === 'setup') {
    return (
      <div className="blind-room">
        <div className="game-head">
          <h1 className="game-title font-display">双盲诗</h1>
          <p className="game-sub soft">两个人，一支笔，谁也看不见对方写了什么。</p>
        </div>
        <div className="blind-scroll">
          <div className="blind-setup paper-surface on-paper paper-in">
            <div className="blind-fold" />
            <div className="blind-players">
              {players.map((p, i) => (
                <div className="blind-player" key={p.id}>
                  <span className="blind-dot" style={{ background: p.color }} />
                  <input
                    className="blind-name-input font-poem" value={names[i]} maxLength={8}
                    onChange={(e) => setNames((n) => { const c = [...n] as [string, string]; c[i] = e.target.value; return c })}
                    aria-label={`第${i + 1}位作者的名字`}
                  />
                </div>
              ))}
            </div>
            {theme.length > 0 && <div className="blind-theme">主题词：<span className="font-display">{theme.join(' · ')}</span></div>}

            <div className="blind-form">
              <div className="blind-field">
                <span className="field-label">行数</span>
                <Stepper value={bs.lines} min={2} max={12} onChange={(v) => setGameSettings('blind', { lines: v })} />
              </div>
              <div className="blind-field">
                <span className="field-label">怎么分</span>
                <Segmented value={bs.allocation} onChange={(v) => setGameSettings('blind', { allocation: v as any })}
                  options={[{ value: 'alternate', label: '交替' }, { value: 'halves', label: '上下半' }, { value: 'random', label: '随机' }]} />
              </div>
              <div className="blind-field">
                <span className="field-label">遮蔽程度</span>
                <Segmented value={bs.blind} onChange={(v) => setGameSettings('blind', { blind: v as any })}
                  options={[{ value: 'full', label: '全遮' }, { value: 'lastchar', label: '只露末字' }]} />
              </div>
              <div className="blind-field">
                <span className="field-label">揭晓方式</span>
                <Segmented value={bs.reveal} onChange={(v) => setGameSettings('blind', { reveal: v as any })}
                  options={[{ value: 'slow', label: '慢' }, { value: 'fast', label: '快' }, { value: 'manual', label: '手动' }]} />
              </div>
              <div className="blind-field blind-field-wide">
                <Slider label="每行字数上限（0 为不限）" value={bs.maxChars} min={0} max={40} onChange={(v) => setGameSettings('blind', { maxChars: v })} defaultValue={0} />
              </div>
              <ToggleRow label="合题" hint="每人首次落笔时写一个题眼，最后合成题目。" checked={bs.blindTitle} onChange={(v) => setGameSettings('blind', { blindTitle: v })} />
              <ToggleRow label="落笔后即遮" hint="每次落笔立刻交给下一位，不留痕迹。" checked={bs.hideAfterSeal} onChange={(v) => setGameSettings('blind', { hideAfterSeal: v })} />
            </div>

            <button className="btn btn-seal btn-lg btn-block" onClick={start}><Icon name="blind" size={18} /> 折好纸，开始</button>
            <p className="blind-tip field-hint">在同一台设备上传递。轮到谁，就把设备交给谁。</p>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- handoff ---------------- */
  if (phase === 'handoff') {
    return (
      <div className="blind-room">
        <div className="blind-handoff fade-in">
          <div className="blind-handoff-card paper-surface on-paper paper-in" style={{ ['--pc' as any]: curPlayer.color }}>
            <div className="blind-handoff-seal font-display" style={{ background: curPlayer.color }}>{curPlayer.name.slice(0, 1)}</div>
            <div className="blind-handoff-to faint">请把设备交给</div>
            <div className="blind-handoff-name font-display" style={{ color: curPlayer.color }}>{curPlayer.name}</div>
            <div className="blind-handoff-meta font-num">第 {turn + 1} / {total} 行</div>
            {theme.length > 0 && <div className="blind-handoff-theme">主题：{theme.join(' · ')}</div>}
            <button className="btn btn-seal btn-lg" onClick={ready}><Icon name="hand" size={18} /> 我是{curPlayer.name}，开始写</button>
            <p className="field-hint" style={{ marginTop: 14 }}>其他人请回避屏幕。</p>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- writing ---------------- */
  if (phase === 'writing') {
    const prev = lines[turn - 1]
    const lastChar = bs.blind === 'lastchar' && prev ? Array.from(prev.text).slice(-1)[0] : null
    const count = Array.from(draft).length
    return (
      <div className="blind-room">
        <div className="game-head">
          <div className="blind-turn-tag">
            <span className="blind-dot" style={{ background: curPlayer.color }} />
            <span className="font-display" style={{ color: 'var(--on-desk)' }}>{curPlayer.name}</span>
            <span className="faint font-num">· 第 {turn + 1} / {total} 行</span>
          </div>
        </div>
        <div className="blind-scroll">
          <div className="blind-sheet paper-surface on-paper">
            {theme.length > 0 && <div className="blind-sheet-theme faint">主题 · {theme.join(' ')}</div>}
            <div className="blind-lines">
              {lines.slice(0, turn).map((l, i) => (
                <div className="blind-line-row" key={i}>
                  <span className="blind-bar" style={{ width: `${Math.min(90, Math.max(18, Array.from(l.text).length * 7))}%` }} />
                  <span className="sr-only">第 {i + 1} 行，已隐藏</span>
                </div>
              ))}
              {lastChar && <div className="blind-lastchar">接上一句末字：<span className="font-poem">{lastChar}</span></div>}
              <div className="blind-active-line">
                <textarea
                  ref={inputRef} className="blind-input font-poem" rows={1} value={draft}
                  placeholder={`${curPlayer.name}，写下这一行…`}
                  onChange={(e) => { let v = e.target.value.replace(/\n/g, ''); if (bs.maxChars > 0) v = Array.from(v).slice(0, bs.maxChars).join(''); setDraft(v) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
                  aria-label="写下当前这一行"
                />
                <span className="blind-cursor" />
              </div>
            </div>
            {bs.blindTitle && isFirstTurnForPlayer && (
              <div className="blind-seed">
                <span className="field-label">题眼（可选，最后合题）</span>
                <input className="blind-seed-input font-poem" value={seedDraft} maxLength={6} placeholder="一个词" onChange={(e) => setSeedDraft(e.target.value)} />
              </div>
            )}
            <div className="blind-write-foot">
              <span className="faint font-num">{bs.maxChars > 0 ? `${count} / ${bs.maxChars}` : `${count} 字`}</span>
              <button className="btn btn-seal" onClick={commit} disabled={!draft.trim()}><Icon name="seal" size={16} /> 落笔</button>
            </div>
          </div>
          <p className="blind-tip field-hint">你看不见前面的句子{bs.blind === 'lastchar' ? '，只能看到上一句的末字' : ''}。凭直觉接下去。</p>
        </div>
      </div>
    )
  }

  /* ---------------- reveal ---------------- */
  const allRevealed = revealed >= total
  return (
    <div className="blind-room">
      <div className="game-head">
        <h1 className="game-title font-display">{allRevealed ? '合著完成' : '正在揭晓'}</h1>
        <p className="game-sub soft">{allRevealed ? '两个人的句子，终于见面了。' : '一句一句，拉开这道拉链。'}</p>
      </div>
      <div className="blind-scroll">
        <div className="blind-sheet blind-reveal-sheet paper-surface on-paper">
          {title && allRevealed && <div className="blind-reveal-title font-display ink-in">{title}</div>}
          <div className="blind-lines">
            {lines.map((l, i) => {
              const shown = i < revealed
              const p = players[l.authorId === 'b' ? 1 : 0]
              return (
                <div className={`blind-reveal-line ${shown ? 'shown' : ''}`} key={i}>
                  {shown ? (
                    <>
                      <span className="blind-dot" style={{ background: p.color }} />
                      <span className="blind-reveal-text font-poem ink-in" style={{ color: p.color }}>{l.text}</span>
                    </>
                  ) : (
                    <span className="blind-bar" style={{ width: `${Math.min(90, Math.max(18, Array.from(l.text).length * 7))}%` }} />
                  )}
                </div>
              )
            })}
          </div>
          {!allRevealed && bs.reveal === 'manual' && (
            <button className="btn btn-line btn-block" onClick={revealNext}><Icon name="eye" size={16} /> 拉开下一行（{revealed}/{total}）</button>
          )}
        </div>

        {allRevealed && (
          <div className="blind-done rise-in">
            <div className="blind-title-edit">
              <span className="field-label">题目</span>
              <input className="text-input font-poem" value={title} placeholder="给这首合著诗起个名字（可留空）" onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="blind-done-actions">
              <button className="btn btn-seal btn-lg" onClick={makeCard}><Icon name="workshop" size={17} /> 做成合著卡</button>
              <button className="btn btn-line" onClick={replay}><Icon name="refresh" size={15} /> 再来一次</button>
              <button className="btn btn-ghost" onClick={rematch}><Icon name="settings" size={15} /> 重新设置</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}