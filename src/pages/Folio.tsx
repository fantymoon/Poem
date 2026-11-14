import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CardSVG } from '../components/CardSVG'
import { Icon } from '../components/Icon'
import { Confirm, Toggle } from '../components/ui'
import { exportCardPNG, downloadText } from '../lib/export'
import { buildExport } from '../lib/db'
import { SOURCE_LABEL, todayStr } from '../lib/cardStyle'
import { playSound } from '../lib/sound'
import type { Card, Source } from '../lib/types'

const FILTERS: { key: 'all' | Source; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '自己写' },
  { key: 'blind', label: '双盲' },
  { key: 'blackout', label: '遮字' },
  { key: 'qian', label: '一签' },
  { key: 'dice', label: '骰子' },
]

// deterministic per-card tilt so a card never jumps between renders
function tilt(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return (((h % 1000) / 1000) * 2 - 1) * 1.5
}

export function Folio() {
  const navigate = useNavigate()
  const cards = useStore((s) => s.cards)
  const userTemplates = useStore((s) => s.userTemplates)
  const scatter = useStore((s) => s.settings.scatter)
  const setSettings = useStore((s) => s.setSettings)
  const setHandoff = useStore((s) => s.setHandoff)
  const deleteCard = useStore((s) => s.deleteCard)
  const duplicateCard = useStore((s) => s.duplicateCard)
  const importFolio = useStore((s) => s.importFolio)
  const toast = useStore((s) => s.toast)

  const [filter, setFilter] = useState<'all' | Source>('all')
  const [confirmDel, setConfirmDel] = useState<Card | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = useMemo(() => [...cards].sort((a, b) => b.updatedAt - a.updatedAt), [cards])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: cards.length }
    for (const card of cards) c[card.poem.source] = (c[card.poem.source] || 0) + 1
    return c
  }, [cards])
  const shown = useMemo(() => (filter === 'all' ? sorted : sorted.filter((c) => c.poem.source === filter)), [sorted, filter])

  const onEdit = (card: Card) => { playSound('click'); setHandoff({ card }); navigate('/') }
  const onExport = async (card: Card) => {
    setBusyId(card.id)
    try { await exportCardPNG(card, 2); toast('已导出 PNG', 'success'); playSound('seal') }
    catch { toast('导出失败', 'danger') }
    finally { setBusyId(null) }
  }
  const onDuplicate = async (card: Card) => { await duplicateCard(card.id); toast('已复制一份', 'success'); playSound('flip') }
  const onDelete = async () => {
    if (!confirmDel) return
    const t = confirmDel.poem.title || '无题'
    await deleteCard(confirmDel.id); setConfirmDel(null); toast(`已删除《${t}》`, 'info')
  }
  const onExportAll = () => {
    if (cards.length === 0) { toast('作品夹还是空的', 'info'); return }
    const json = JSON.stringify(buildExport(cards, userTemplates), null, 2)
    downloadText(json, `一笺作品夹_${todayStr()}.json`)
    toast(`已导出 ${cards.length} 张笺`, 'success'); playSound('seal')
  }
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try { const added = await importFolio(await f.text()); toast(added > 0 ? `已导入 ${added} 张笺` : '作品夹已是最新', 'success'); playSound('reveal') }
    catch { toast('不是一笺的作品夹文件', 'danger') }
    finally { e.target.value = '' }
  }

  return (
    <div className="folio-room">
      <header className="folio-head">
        <div className="folio-head-left">
          <h1 className="folio-title font-display">作品夹</h1>
          <span className="folio-count faint font-num">{cards.length} 张笺</span>
        </div>
        <div className="folio-head-actions">
          <label className="folio-scatter" title="散放：轻微随机旋转">
            <Toggle checked={scatter} onChange={(v) => { setSettings({ scatter: v }); playSound('click') }} />
            <span className="field-label">散放</span>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="download" size={15} style={{ transform: 'rotate(180deg)' }} /> 导入
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onExportAll}>
            <Icon name="download" size={15} /> 导出
          </button>
          <button className="btn btn-seal btn-sm" onClick={() => { playSound('click'); navigate('/') }}>
            <Icon name="plus" size={15} /> 写一张
          </button>
        </div>
      </header>

      <div className="folio-filters" role="tablist" aria-label="按来源筛选">
        {FILTERS.map((f) => (
          <button
            key={f.key} role="tab" aria-selected={filter === f.key}
            className={`folio-pill ${filter === f.key ? 'folio-pill-active' : ''}`}
            onClick={() => { setFilter(f.key); playSound('click') }}
          >
            {f.label}<span className="folio-pill-n font-num">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="folio-scroll on-desk-scroll">
        {cards.length === 0 ? (
          <div className="folio-empty">
            <div className="folio-empty-frame" aria-hidden="true">
              <span className="folio-empty-hook" />
              <span className="folio-empty-ghost font-display">笺</span>
            </div>
            <p className="folio-empty-line font-display">还没有一张笺</p>
            <p className="folio-empty-sub soft">去工坊写一首，或从一签、骰子、双盲、遮字里得到一首。</p>
            <button className="btn btn-seal" onClick={() => { playSound('click'); navigate('/') }}>
              <Icon name="workshop" size={16} /> 去工坊写一张
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="folio-empty folio-empty-filter">
            <p className="folio-empty-line font-display">这一类还没有笺</p>
            <button className="btn btn-line" onClick={() => setFilter('all')}>看全部</button>
          </div>
        ) : (
          <div className="folio-grid">
            {shown.map((card) => (
              <figure
                key={card.id}
                className={`folio-card ${busyId === card.id ? 'folio-card-busy' : ''}`}
                style={{ ['--rot' as any]: (scatter ? tilt(card.id) : 0) + 'deg' }}
              >
                <div className="folio-card-paper" onClick={() => onEdit(card)}>
                  <CardSVG poem={card.poem} style={card.style} className="folio-card-svg" />
                  <div className="folio-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="folio-act" onClick={() => onEdit(card)} title="编辑" aria-label="编辑"><Icon name="edit" size={15} /><span>编辑</span></button>
                    <button className="folio-act" onClick={() => onExport(card)} disabled={busyId === card.id} title="导出 PNG" aria-label="导出 PNG"><Icon name="download" size={15} /><span>导出</span></button>
                    <button className="folio-act" onClick={() => onDuplicate(card)} title="复制一份" aria-label="复制一份"><Icon name="copy" size={15} /><span>复制</span></button>
                    <button className="folio-act folio-act-danger" onClick={() => { setConfirmDel(card); playSound('click') }} title="删除" aria-label="删除"><Icon name="trash" size={15} /><span>删除</span></button>
                  </div>
                </div>
                <figcaption className="folio-card-meta">
                  <span className={`folio-src folio-src-${card.poem.source}`}>{SOURCE_LABEL[card.poem.source]}</span>
                  <span className="folio-card-title font-poem">{card.poem.title || '无题'}</span>
                  <span className="folio-date font-num">{card.poem.date}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      <Confirm
        open={!!confirmDel}
        title="删除这张笺？"
        body={confirmDel ? `《${confirmDel.poem.title || '无题'}》将从作品夹移除，此操作不可撤销。` : ''}
        confirmLabel="删除" danger
        onConfirm={onDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}