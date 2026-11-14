import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { qianForDate } from '../lib/data/qian'
import { makePoem, todayStr } from '../lib/cardStyle'
import { playSound } from '../lib/sound'
import { Icon } from '../components/Icon'
import { Segmented, ToggleRow } from '../components/ui'
import { RoomTag } from '../components/RoomTag'
import { SettingsSlip } from '../components/SettingsSlip'

type Phase = 'idle' | 'shaking' | 'revealed'

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function MiniCalendar({ selected, allowPast, onPick }: { selected: string; allowPast: boolean; onPick: (d: string) => void }) {
  const today = todayStr()
  const [view, setView] = useState(selected.slice(0, 7))
  const [y, m] = view.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const startPad = (first.getDay() + 6) % 7 // Monday-first
  const days = new Date(y, m, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(`${view}-${String(d).padStart(2, '0')}`)
  const canPrev = true
  const canNext = view < today.slice(0, 7)
  return (
    <div className="qian-cal panel rise-in" role="dialog" aria-label="翻看往日">
      <div className="qian-cal-head">
        <button className="icon-btn-sm" onClick={() => canPrev && setView(shiftMonth(view, -1))} aria-label="上个月"><Icon name="chevron" size={14} style={{ transform: 'rotate(180deg)' }} /></button>
        <span className="font-num">{y} 年 {m} 月</span>
        <button className="icon-btn-sm" disabled={!canNext} onClick={() => canNext && setView(shiftMonth(view, 1))} aria-label="下个月"><Icon name="chevron" size={14} /></button>
      </div>
      <div className="qian-cal-week">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="qian-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const isFuture = d > today
          const isPast = d < today
          const disabled = isFuture || (isPast && !allowPast)
          return (
            <button
              key={i}
              className={`qian-cal-day ${d === selected ? 'cal-selected' : ''} ${d === today ? 'cal-today' : ''}`}
              disabled={disabled}
              onClick={() => onPick(d)}
            >{Number(d.slice(8))}</button>
          )
        })}
      </div>
      {!allowPast && <div className="field-hint" style={{ marginTop: 8 }}>在设置里开启「翻看往日」后，可回看过去的签。</div>}
    </div>
  )
}

export function Qian() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const setGameSettings = useStore((s) => s.setGameSettings)
  const setHandoff = useStore((s) => s.setHandoff)
  const toast = useStore((s) => s.toast)
  const qs = settings.qian
  const reduced = settings.reducedMotion

  const today = todayStr()
  const [selectedDate, setSelectedDate] = useState(today)
  const [phase, setPhase] = useState<Phase>('idle')
  const [calOpen, setCalOpen] = useState(false)
  const timer = useRef<number>()

  const result = useMemo(() => qianForDate(selectedDate, qs.style), [selectedDate, qs.style])
  const isToday = selectedDate === today

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const draw = () => {
    if (phase === 'shaking') return
    playSound('draw')
    if (reduced) { setPhase('revealed'); return }
    setPhase('shaking')
    timer.current = window.setTimeout(() => { setPhase('revealed'); playSound('reveal') }, 950)
  }

  // shake the phone to draw
  useEffect(() => {
    if (!qs.shake || phase !== 'idle') return
    let last = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0)
      if (mag > 26 && Date.now() - last > 1400) { last = Date.now(); draw() }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [qs.shake, phase, selectedDate, qs.style])

  const pickDate = (d: string) => {
    setSelectedDate(d)
    setCalOpen(false)
    if (d === today) { setPhase('idle') }
    else { setPhase('revealed'); playSound('flip') }
  }

  const makeCard = () => {
    const poem = makePoem({
      source: 'qian',
      title: result.numberLabel,
      lines: [{ text: result.poem }],
      theme: [result.theme],
      origin: `一签 · 宜${result.yi} · 忌${result.ji}`,
      date: result.date,
    })
    setHandoff({ poem, templateHint: 'qiantiao' })
    playSound('click')
    navigate('/')
  }

  const sendTheme = () => {
    setHandoff({ theme: [result.theme], target: 'blind' })
    toast(`把「${result.theme}」送去了双盲`, 'success')
    navigate('/blind')
  }

  const toneLabel = result.tone === 'serious' ? '正经签' : '打趣签'

  return (
    <div className="game-room qian-room">
      <div className="game-main">
        <RoomTag name="今日一签" />

        <div className="game-scroll qian-scroll">
          {phase !== 'revealed' ? (
            <div className="qian-stage">
              <button className={`qian-tube-wrap ${phase === 'shaking' ? 'shaking' : ''}`} onClick={draw} aria-label="摇签求签" aria-busy={phase === 'shaking'}>
                <div className="qian-tube">
                  <div className="qian-sticks">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={`qian-stick stick-${i}`}><span className="stick-tip" /></span>
                    ))}
                  </div>
                  <div className="qian-tube-body">
                    <div className="qian-tube-band" />
                    <span className="qian-tube-label font-display">一笺</span>
                  </div>
                  <div className="qian-tube-mouth" />
                </div>
                <div className="qian-tube-shadow" />
              </button>
              <div className={`qian-tap-hint font-poem ${phase === 'shaking' ? 'hint-busy' : ''}`}>
                {phase === 'shaking' ? '签筒摇动中…' : isToday ? '轻点签筒，摇一支' : '轻点签筒，翻看此日'}
              </div>
              <div className="qian-date-hint font-num soft">{selectedDate}{isToday && <span className="qian-today-badge">今天</span>}</div>
              {qs.shake && <div className="field-hint">也可以摇一摇手机。</div>}
            </div>
          ) : (
            <div className="qian-result">
              <div className="qian-slip paper-surface on-paper" key={selectedDate + qs.style}>
                <div className="qian-slip-perf" />
                <div className="qian-slip-top">
                  <span className="qian-no font-display">{result.numberLabel}</span>
                  <span className="qian-tone-tag">{toneLabel}</span>
                </div>
                <div className="qian-slip-rule" />
                <p className="qian-poem font-poem">{result.poem}</p>
                <div className="qian-yiji">
                  <div className="qian-yiji-row"><span className="qian-tag tag-yi font-display">宜</span><span className="qian-yiji-text">{result.yi}</span></div>
                  <div className="qian-yiji-row"><span className="qian-tag tag-ji font-display">忌</span><span className="qian-yiji-text">{result.ji}</span></div>
                </div>
                <div className="qian-theme-line">
                  <span className="faint">今日主题</span>
                  <span className="qian-theme-word font-display">{result.theme}</span>
                </div>
                <div className="qian-slip-date font-num">{result.date}</div>
              </div>

              <div className="qian-actions rise-in">
                <button className="btn btn-seal btn-lg" onClick={makeCard}><Icon name="workshop" size={17} /> 做成卡</button>
                <button className="btn btn-line" onClick={sendTheme}><Icon name="send" size={15} /> 把「{result.theme}」送去双盲</button>
                <button className="btn btn-ghost" onClick={() => { setPhase('idle'); playSound('flip') }}><Icon name="refresh" size={15} /> 重新求签</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsSlip label="签的设置">
        <div className="qian-date-card">
          <div className="spread">
            <span className="field-label">签的日期</span>
            {isToday ? <span className="qian-today-badge">今天</span> : <button className="reset-link" onClick={() => pickDate(today)}>回到今天</button>}
          </div>
          <div className="qian-date-big font-num">{selectedDate}</div>
          <button className="btn btn-line btn-block btn-sm" onClick={() => setCalOpen((o) => !o)}>
            <Icon name="calendar" size={15} /> {calOpen ? '收起日历' : '翻看往日'}
          </button>
          {calOpen && <MiniCalendar selected={selectedDate} allowPast={qs.allowPast} onPick={pickDate} />}
        </div>

        <div className="game-aside-block">
          <div className="field-label" style={{ marginBottom: 8 }}>签的语气</div>
          <Segmented block value={qs.style} onChange={(v) => setGameSettings('qian', { style: v as any })}
            options={[{ value: 'mixed', label: '混合' }, { value: 'serious', label: '正经' }, { value: 'playful', label: '打趣' }]} />
          <div className="field-hint" style={{ marginTop: 8 }}>同一天、同一种语气，签文始终不变。</div>
        </div>

        <div className="game-aside-block">
          <ToggleRow label="摇动求签" hint="在手机上摇一摇即可求签。" checked={qs.shake} onChange={(v) => setGameSettings('qian', { shake: v })} />
          <ToggleRow label="翻看往日" hint="允许回看过去日期的签。" checked={qs.allowPast} onChange={(v) => setGameSettings('qian', { allowPast: v })} />
        </div>

        <p className="game-aside-note field-hint">
          签文由日期决定，离线生成，每天来都有新的一支。求得的签可在工坊做成一张签条卡。
        </p>
      </SettingsSlip>
    </div>
  )
}