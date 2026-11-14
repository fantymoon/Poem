import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useHistory } from '../hooks/useHistory'
import { useLayoutMode } from '../hooks/useMediaQuery'
import type { Card, CardStyle, Poem, Template } from '../lib/types'
import { defaultCardStyle, cloneStyle, makePoem, uid } from '../lib/cardStyle'
import { PRESET_TEMPLATES, templateById, SOURCE_TEMPLATE } from '../lib/templates'
import { exportCardPNG, exportPrintSheet, cardFilename } from '../lib/export'
import { playSound } from '../lib/sound'
import { ContentPanel } from '../components/workshop/ContentPanel'
import { StylePanel, type StyleTab } from '../components/workshop/StylePanel'
import { CanvasArea } from '../components/workshop/CanvasArea'
import { Icon } from '../components/Icon'
import { Prompt, Confirm } from '../components/ui'

interface EditState { poem: Poem; style: CardStyle }

function buildInitial(handoff: ReturnType<typeof useStore.getState>['handoff']): { state: EditState; cardId: string; tpl: string | null } {
  if (handoff?.card) {
    return { state: { poem: JSON.parse(JSON.stringify(handoff.card.poem)), style: cloneStyle(handoff.card.style) }, cardId: handoff.card.id, tpl: null }
  }
  if (handoff?.poem) {
    const poem = JSON.parse(JSON.stringify(handoff.poem)) as Poem
    const tplId = handoff.templateHint || SOURCE_TEMPLATE[poem.source] || 'sujian'
    const style = cloneStyle(templateById(tplId)?.style || defaultCardStyle)
    if (poem.blackoutImage && style.hideBody) style.texture.image = poem.blackoutImage
    return { state: { poem, style }, cardId: uid('card_'), tpl: tplId }
  }
  return { state: { poem: makePoem({ source: 'free' }), style: cloneStyle(defaultCardStyle) }, cardId: uid('card_'), tpl: 'sujian' }
}

export function Workshop() {
  const handoff = useStore((s) => s.handoff)
  const setHandoff = useStore((s) => s.setHandoff)
  const userTemplates = useStore((s) => s.userTemplates)
  const saveCard = useStore((s) => s.saveCard)
  const addTemplate = useStore((s) => s.addTemplate)
  const deleteTemplate = useStore((s) => s.deleteTemplate)
  const toast = useStore((s) => s.toast)
  const mode = useLayoutMode()

  const initial = useMemo(() => buildInitial(handoff), [])
  const hist = useHistory<EditState>(initial.state)
  const [cardId, setCardId] = useState(initial.cardId)
  const [activeTpl, setActiveTpl] = useState<string | null>(initial.tpl)
  const [previewTpl, setPreviewTpl] = useState<Template | null>(null)
  const [tab, setTab] = useState<StyleTab>('type')
  const [mobileTab, setMobileTab] = useState<'content' | StyleTab>('content')
  const [twoTab, setTwoTab] = useState<'content' | 'style'>('content')
  const [pngScale, setPngScale] = useState(2)
  const [exporting, setExporting] = useState(false)
  const [drawerFull, setDrawerFull] = useState(false)
  const [tplPrompt, setTplPrompt] = useState(false)
  const [delTpl, setDelTpl] = useState<Template | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (handoff) setHandoff(null) }, [])

  const { poem, style } = hist.present
  const setPoem = (u: (p: Poem) => Poem, key?: string) => hist.set((s) => ({ ...s, poem: u(s.poem) }), key)
  const setStyle = (u: (s: CardStyle) => CardStyle, key?: string) => { hist.set((s) => ({ ...s, style: u(s.style) }), key); setActiveTpl(null) }
  const displayStyle = previewTpl ? previewTpl.style : style
  const isEmpty = !poem.title.trim() && poem.lines.every((l) => !l.text.trim())
  const templates = [...PRESET_TEMPLATES, ...userTemplates]

  const applyTemplate = (t: Template) => {
    const st = cloneStyle(t.style)
    if (st.hideBody && poem.blackoutImage) st.texture.image = poem.blackoutImage
    hist.set((s) => ({ ...s, style: st }))
    setActiveTpl(t.id)
    setPreviewTpl(null)
    playSound('flip')
  }

  const currentCard = (): Card => ({ id: cardId, poem, style, updatedAt: Date.now() })

  const doSaveFolio = async () => {
    if (isEmpty) { toast('先写一首诗，再存入作品夹', 'info'); return }
    await saveCard(currentCard())
    toast('已存入作品夹', 'success')
    playSound('seal')
  }

  const doExport = async (scale: number) => {
    if (isEmpty) { toast('画布还是空的', 'info'); return }
    setExporting(true)
    try {
      await exportCardPNG(currentCard(), scale)
      toast('已导出 PNG', 'success')
      playSound('seal')
    } catch (e) {
      toast('导出失败，请重试', 'danger')
    } finally { setExporting(false) }
  }

  const doPrint = async () => {
    if (isEmpty) { toast('画布还是空的', 'info'); return }
    setExporting(true)
    try { await exportPrintSheet(currentCard()); toast('已导出打印版', 'success') }
    catch { toast('导出失败，请重试', 'danger') }
    finally { setExporting(false) }
  }

  const doSaveTemplate = async (name: string) => {
    const t: Template = { id: uid('tpl_'), name: name || '我的模板', style: cloneStyle(style), builtIn: false }
    await addTemplate(t)
    setActiveTpl(t.id)
    toast(`已存为模板「${t.name}」`, 'success')
    setTplPrompt(false)
  }

  // shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); doSaveFolio(); return }
      if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); doExport(pngScale); return }
      if (mod && e.key.toLowerCase() === 'z' && !editable) { e.preventDefault(); e.shiftKey ? hist.redo() : hist.undo(); return }
      if (mod && e.key.toLowerCase() === 'y' && !editable) { e.preventDefault(); hist.redo(); return }
      if (!mod && e.key.toLowerCase() === 'v' && !editable) { setStyle((s) => ({ ...s, direction: s.direction === 'vertical' ? 'horizontal' : 'vertical', align: s.direction === 'horizontal' && s.align === 'justify' ? 'center' : s.align })) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [poem, style, pngScale, cardId])

  const focusWrite = () => {
    setMobileTab('content'); setTwoTab('content')
    setTimeout(() => bodyRef.current?.focus(), 60)
  }

  const stylePanel = (
    <StylePanel
      style={style} setStyle={setStyle} poem={poem} tab={tab} setTab={setTab}
      onSaveFolio={doSaveFolio} onSaveTemplate={() => setTplPrompt(true)}
      onExport={doExport} onPrint={doPrint} exporting={exporting}
      pngScale={pngScale} setPngScale={setPngScale} filename={cardFilename(poem)}
    />
  )

  const canvas = (
    <CanvasArea
      poem={poem} style={style} setStyle={setStyle} displayStyle={displayStyle} isEmpty={isEmpty}
      templates={templates} activeTemplateId={activeTpl}
      onApplyTemplate={applyTemplate} onPreviewTemplate={setPreviewTpl}
      onDeleteTemplate={(t) => setDelTpl(t)}
      onUndo={hist.undo} onRedo={hist.redo} canUndo={hist.canUndo} canRedo={hist.canRedo}
      onWrite={focusWrite}
    />
  )

  return (
    <div className={`workshop workshop-${mode}`}>
      {mode === 'three' && (
        <>
          <aside className="ws-left panel">
            <div className="ws-panel-head"><Icon name="edit" size={15} /> 内容</div>
            <div className="ws-panel-scroll"><ContentPanel poem={poem} setPoem={setPoem} bodyRef={bodyRef} /></div>
          </aside>
          <section className="ws-center">{canvas}</section>
          <aside className="ws-right panel">{stylePanel}</aside>
        </>
      )}

      {mode === 'two' && (
        <>
          <section className="ws-center">{canvas}</section>
          <aside className="ws-right panel">
            <div className="two-toggle">
              <button className={twoTab === 'content' ? 'two-active' : ''} onClick={() => setTwoTab('content')}>内容</button>
              <button className={twoTab === 'style' ? 'two-active' : ''} onClick={() => setTwoTab('style')}>样式</button>
            </div>
            {twoTab === 'content'
              ? <div className="ws-panel-scroll"><ContentPanel poem={poem} setPoem={setPoem} bodyRef={bodyRef} /></div>
              : stylePanel}
          </aside>
        </>
      )}

      {mode === 'mobile' && (
        <>
          <section className="ws-center-mobile">{canvas}</section>
          <div className={`ws-drawer ${drawerFull ? 'ws-drawer-full' : ''}`}>
            <button className="drawer-handle" onClick={() => setDrawerFull((f) => !f)} aria-label="展开/收起控制">
              <span className="drawer-grip" />
            </button>
            <div className="drawer-tabs">
              {([['content', '内容'], ['type', '排版'], ['paper', '纸张'], ['decor', '装饰'], ['export', '导出']] as const).map(([id, label]) => (
                <button key={id} className={mobileTab === id ? 'drawer-tab-active' : ''} onClick={() => { setMobileTab(id as any); setDrawerFull(true) }}>{label}</button>
              ))}
            </div>
            <div className="drawer-body">
              {mobileTab === 'content'
                ? <ContentPanel poem={poem} setPoem={setPoem} bodyRef={bodyRef} />
                : <StylePanel style={style} setStyle={setStyle} poem={poem} tab={mobileTab as StyleTab} setTab={(t) => setMobileTab(t)}
                    onSaveFolio={doSaveFolio} onSaveTemplate={() => setTplPrompt(true)} onExport={doExport} onPrint={doPrint}
                    exporting={exporting} pngScale={pngScale} setPngScale={setPngScale} filename={cardFilename(poem)} />}
            </div>
          </div>
        </>
      )}

      <Prompt open={tplPrompt} title="存为模板" label="模板名字" defaultValue={poem.title || '我的模板'} placeholder="给这套样式起个名字"
        confirmLabel="存下来" onConfirm={doSaveTemplate} onCancel={() => setTplPrompt(false)} />
      <Confirm open={!!delTpl} title={`删除模板「${delTpl?.name}」？`} body="只删除这套样式，不影响已做的卡。" danger confirmLabel="删除"
        onConfirm={() => { if (delTpl) { deleteTemplate(delTpl.id); toast('已删除模板', 'info') } setDelTpl(null) }} onCancel={() => setDelTpl(null)} />
    </div>
  )
}