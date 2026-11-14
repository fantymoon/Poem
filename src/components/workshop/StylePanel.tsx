import { useRef } from 'react'
import { Icon } from '../Icon'
import { Field, Section, More, Slider, Segmented, Swatches, Select, Toggle, ToggleRow } from '../ui'
import type { CardStyle, Poem, Sticker } from '../../lib/types'
import { FONTS, fontStack } from '../../lib/fonts'
import { defaultCardStyle, cloneStyle, uid } from '../../lib/cardStyle'

export type StyleTab = 'type' | 'paper' | 'decor' | 'export'

const PAPER_COLORS = [
  { value: '#f3ede1', name: '米白' }, { value: '#efe4c4', name: '竹黄' },
  { value: '#f0dcd2', name: '浅绯' }, { value: '#d6dbd4', name: '青灰' }, { value: '#23201c', name: '墨底' },
]

interface Props {
  style: CardStyle
  setStyle: (u: (s: CardStyle) => CardStyle, key?: string) => void
  poem: Poem
  tab: StyleTab
  setTab: (t: StyleTab) => void
  onSaveFolio: () => void
  onSaveTemplate: () => void
  onExport: (scale: number) => void
  onPrint: () => void
  exporting: boolean
  pngScale: number
  setPngScale: (n: number) => void
  filename: string
}

export function StylePanel(props: Props) {
  const { tab, setTab } = props
  const tabs: { id: StyleTab; label: string; icon: string }[] = [
    { id: 'type', label: '排版', icon: 'blackout' },
    { id: 'paper', label: '纸张', icon: 'image' },
    { id: 'decor', label: '装饰', icon: 'seal' },
    { id: 'export', label: '导出', icon: 'download' },
  ]
  return (
    <div className="style-panel">
      <div className="style-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`style-tab ${tab === t.id ? 'style-tab-active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>
      <div className="style-body on-desk-scroll">
        {tab === 'type' && <TypesettingTab {...props} />}
        {tab === 'paper' && <PaperTab {...props} />}
        {tab === 'decor' && <DecorTab {...props} />}
        {tab === 'export' && <ExportTab {...props} />}
      </div>
    </div>
  )
}

/* ---------------- 排版 ---------------- */
function TypesettingTab({ style, setStyle, poem }: Props) {
  const vertical = style.direction === 'vertical'
  const fontOptions = FONTS.map((f) => ({ value: f.id, label: f.name, preview: <span className="font-preview" style={{ fontFamily: f.stack }}>一笺</span> }))
  const alignOpts = vertical
    ? [{ value: 'left', label: '顶' }, { value: 'center', label: '中' }, { value: 'right', label: '底' }]
    : [{ value: 'left', label: '左' }, { value: 'center', label: '中' }, { value: 'right', label: '右' }, { value: 'justify', label: '两端' }]
  return (
    <>
      <Section title="方向与字体" onReset={() => setStyle((s) => ({ ...s, direction: 'horizontal', font: 'song' }))}>
        <Field label="方向">
          <Segmented block value={style.direction} onChange={(v) => setStyle((s) => ({ ...s, direction: v as any, align: v === 'vertical' && s.align === 'justify' ? 'center' : s.align }))}
            options={[{ value: 'horizontal', label: '横排' }, { value: 'vertical', label: '竖排 · 右起' }]} />
        </Field>
        <Field label="字体">
          <Select options={fontOptions} value={style.font} onChange={(v) => setStyle((s) => ({ ...s, font: v }))} ariaLabel="正文字体" />
        </Field>
      </Section>

      <Section title="字号与间距" onReset={() => setStyle((s) => ({ ...s, size: 46, tracking: 4, leading: 1.8, stanzaGap: 0.9 }))}>
        <Slider label="字号" value={style.size} min={20} max={110} onChange={(v) => setStyle((s) => ({ ...s, size: v }), 'size')} defaultValue={46} />
        <Slider label="字距" value={style.tracking} min={0} max={40} onChange={(v) => setStyle((s) => ({ ...s, tracking: v }), 'tracking')} defaultValue={4} />
        <Slider label="行距" value={style.leading} min={1.1} max={3.2} step={0.05} onChange={(v) => setStyle((s) => ({ ...s, leading: v }), 'leading')} defaultValue={1.8} format={(v) => v.toFixed(2)} />
        <Slider label="节距" value={style.stanzaGap} min={0} max={3} step={0.1} onChange={(v) => setStyle((s) => ({ ...s, stanzaGap: v }), 'stanza')} defaultValue={0.9} format={(v) => v.toFixed(1)} />
        <Field label="对齐">
          <Segmented block size="sm" value={style.align} onChange={(v) => setStyle((s) => ({ ...s, align: v as any }))} options={alignOpts} />
        </Field>
      </Section>

      <Section title="标题" defaultOpen={false} onReset={() => setStyle((s) => ({ ...s, title: cloneStyle(defaultCardStyle).title }))}>
        <Field label="位置">
          <Segmented block size="sm" value={style.title.position} onChange={(v) => setStyle((s) => ({ ...s, title: { ...s.title, position: v as any } }))}
            options={[{ value: 'top', label: vertical ? '右' : '上' }, { value: 'bottom', label: vertical ? '左' : '下' }, { value: 'hidden', label: '不显示' }]} />
        </Field>
        <Slider label="字号倍率" value={style.title.scale} min={0.8} max={2.6} step={0.05} onChange={(v) => setStyle((s) => ({ ...s, title: { ...s.title, scale: v } }), 'tscale')} defaultValue={1.5} format={(v) => v.toFixed(2) + '×'} />
        <Field label="标题字体">
          <Select options={[{ value: '', label: '同正文', preview: <span className="font-preview" style={{ fontFamily: fontStack(style.font) }}>一笺</span> }, ...fontOptions]}
            value={style.title.font || ''} onChange={(v) => setStyle((s) => ({ ...s, title: { ...s.title, font: v || null } }))} ariaLabel="标题字体" />
        </Field>
      </Section>

      <Section title="署名与日期" defaultOpen={false} onReset={() => setStyle((s) => ({ ...s, signature: cloneStyle(defaultCardStyle).signature }))}>
        <Field label="位置">
          <Segmented block size="sm" value={style.signature.position} onChange={(v) => setStyle((s) => ({ ...s, signature: { ...s.signature, position: v as any } }))}
            options={[{ value: 'bottom', label: vertical ? '左' : '下' }, { value: 'top', label: vertical ? '右' : '上' }, { value: 'hidden', label: '不显示' }]} />
        </Field>
        <Slider label="字号" value={style.signature.scale} min={0.35} max={1} step={0.02} onChange={(v) => setStyle((s) => ({ ...s, signature: { ...s.signature, scale: v } }), 'sscale')} defaultValue={0.6} format={(v) => v.toFixed(2) + '×'} />
        <ToggleRow label="显示署名" checked={style.signature.show} onChange={(v) => setStyle((s) => ({ ...s, signature: { ...s.signature, show: v } }))} />
        <ToggleRow label="显示日期" checked={style.signature.showDate} onChange={(v) => setStyle((s) => ({ ...s, signature: { ...s.signature, showDate: v } }))} />
        <ToggleRow label="显示出处" checked={style.signature.showOrigin} onChange={(v) => setStyle((s) => ({ ...s, signature: { ...s.signature, showOrigin: v } }))} />
      </Section>

      {poem.authors.length > 1 && (
        <Section title="多作者区分" defaultOpen={false}>
          <Segmented block size="sm" value={style.authorDistinction} onChange={(v) => setStyle((s) => ({ ...s, authorDistinction: v as any }))}
            options={[{ value: 'none', label: '无' }, { value: 'color', label: '字色' }, { value: 'indent', label: '缩进' }, { value: 'endmark', label: '行尾' }]} />
          <div className="field-hint">字色微差按作者色点着色；行尾在每行末加一个小字标。</div>
        </Section>
      )}
    </>
  )
}

/* ---------------- 纸张 ---------------- */
function PaperTab({ style, setStyle }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const texOptions = [
    { value: 'none', label: '无', preview: <span className="tex-thumb" style={{ background: '#f3ede1' }} /> },
    { value: 'xuan', label: '宣纸', preview: <span className="tex-thumb" style={{ background: 'linear-gradient(135deg,#f3ede1,#e6ddcb)' }} /> },
    { value: 'kraft', label: '牛皮', preview: <span className="tex-thumb" style={{ background: 'linear-gradient(135deg,#cdb488,#b89b6e)' }} /> },
    { value: 'water', label: '水纹', preview: <span className="tex-thumb" style={{ background: 'repeating-linear-gradient(0deg,#dfe6ea,#dfe6ea 3px,#cdd8de 4px)' }} /> },
    { value: 'image', label: '自传图片', preview: <span className="tex-thumb center" style={{ background: '#353029', color: '#a89e8e' }}><Icon name="image" size={12} /></span> },
  ]
  const onImage = (file: File) => {
    const r = new FileReader()
    r.onload = () => setStyle((s) => ({ ...s, texture: { ...s.texture, type: 'image', image: r.result as string } }))
    r.readAsDataURL(file)
  }
  const m = style.margin
  const setMargin = (side: keyof typeof m, v: number) => setStyle((s) => {
    if (s.margin.linked) return { ...s, margin: { ...s.margin, top: v, right: v, bottom: v, left: v } }
    return { ...s, margin: { ...s.margin, [side]: v } }
  }, 'margin')
  return (
    <>
      <Section title="比例" onReset={() => setStyle((s) => ({ ...s, paper: { ...s.paper, ratio: 'portrait' } }))}>
        <Select value={style.paper.ratio} onChange={(v) => setStyle((s) => ({ ...s, paper: { ...s.paper, ratio: v as any } }))} ariaLabel="纸张比例"
          options={[
            { value: 'square', label: '方形 1:1' }, { value: 'portrait', label: '竖幅 3:4' },
            { value: 'postcard', label: '明信片 3:2' }, { value: 'bookmark', label: '书签 1:3' },
            { value: 'wallpaper', label: '手机壁纸 9:19.5' }, { value: 'custom', label: '自定义' },
          ]} />
        {style.paper.ratio === 'custom' && (
          <div className="row gap8" style={{ marginTop: 10 }}>
            <Field label="宽"><input type="number" className="text-input font-num" min={1} max={40} value={style.paper.customW} onChange={(e) => setStyle((s) => ({ ...s, paper: { ...s.paper, customW: Math.max(1, +e.target.value) } }))} /></Field>
            <Field label="高"><input type="number" className="text-input font-num" min={1} max={40} value={style.paper.customH} onChange={(e) => setStyle((s) => ({ ...s, paper: { ...s.paper, customH: Math.max(1, +e.target.value) } }))} /></Field>
          </div>
        )}
      </Section>

      <Section title="底色">
        <Swatches colors={PAPER_COLORS} value={style.paper.color} onChange={(v) => setStyle((s) => ({ ...s, paper: { ...s.paper, color: v } }))} />
      </Section>

      <Section title="纸纹" onReset={() => setStyle((s) => ({ ...s, texture: cloneStyle(defaultCardStyle).texture }))}>
        <Select options={texOptions} value={style.texture.type} onChange={(v) => setStyle((s) => ({ ...s, texture: { ...s.texture, type: v as any } }))} ariaLabel="纸纹" />
        {style.texture.type === 'image' && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-line btn-sm btn-block" onClick={() => fileRef.current?.click()}><Icon name="image" size={15} /> 选择图片</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
            <Field label="铺法"><Segmented block size="sm" value={style.texture.fit} onChange={(v) => setStyle((s) => ({ ...s, texture: { ...s.texture, fit: v as any } }))} options={[{ value: 'cover', label: '铺满' }, { value: 'center', label: '居中' }]} /></Field>
          </div>
        )}
        {style.texture.type !== 'none' && <Slider label="透明度" value={style.texture.opacity} min={0} max={1} step={0.05} onChange={(v) => setStyle((s) => ({ ...s, texture: { ...s.texture, opacity: v } }), 'texop')} defaultValue={0.5} format={(v) => Math.round(v * 100) + '%'} />}
      </Section>

      <Section title="格线" defaultOpen={false} onReset={() => setStyle((s) => ({ ...s, grid: cloneStyle(defaultCardStyle).grid }))}>
        <Select value={style.grid.type} onChange={(v) => setStyle((s) => ({ ...s, grid: { ...s.grid, type: v as any } }))} ariaLabel="格线"
          options={[{ value: 'none', label: '无' }, { value: 'letter', label: '信笺线' }, { value: 'manuscript', label: '稿纸格' }, { value: 'wusi', label: '乌丝栏' }]} />
        {style.grid.type !== 'none' && (
          <>
            <Field label="颜色"><Swatches colors={[{ value: '#b2382a', name: '朱' }, { value: '#6d7a3a', name: '绿' }, { value: '#8a8172', name: '墨' }, { value: '#3f6b7d', name: '青' }]} value={style.grid.color} onChange={(v) => setStyle((s) => ({ ...s, grid: { ...s.grid, color: v } }))} /></Field>
            <Slider label="间距" value={style.grid.spacing} min={40} max={160} onChange={(v) => setStyle((s) => ({ ...s, grid: { ...s.grid, spacing: v } }), 'gridsp')} defaultValue={82} />
          </>
        )}
      </Section>

      <Section title="边距" defaultOpen={false} onReset={() => setStyle((s) => ({ ...s, margin: cloneStyle(defaultCardStyle).margin }))}>
        <ToggleRow label="四边联动" checked={m.linked} onChange={(v) => setStyle((s) => ({ ...s, margin: { ...s.margin, linked: v } }))} />
        {m.linked ? (
          <Slider label="留白" value={m.top} min={40} max={360} onChange={(v) => setMargin('top', v)} defaultValue={140} />
        ) : (
          <>
            <Slider label="上" value={m.top} min={20} max={400} onChange={(v) => setMargin('top', v)} defaultValue={140} />
            <Slider label="下" value={m.bottom} min={20} max={400} onChange={(v) => setMargin('bottom', v)} defaultValue={140} />
            <Slider label="左" value={m.left} min={20} max={400} onChange={(v) => setMargin('left', v)} defaultValue={120} />
            <Slider label="右" value={m.right} min={20} max={400} onChange={(v) => setMargin('right', v)} defaultValue={120} />
          </>
        )}
      </Section>
    </>
  )
}

/* ---------------- 装饰 ---------------- */
const STICKER_KINDS: { type: Sticker['type']; label: string }[] = [
  { type: 'flower', label: '干花' }, { type: 'ticket', label: '票根' }, { type: 'clip', label: '回形针' },
  { type: 'leaf', label: '落叶' }, { type: 'stamp', label: '邮票' },
]
function DecorTab({ style, setStyle }: Props) {
  const seal = style.seal
  const setSeal = (patch: Partial<typeof seal>, key?: string) => setStyle((s) => ({ ...s, seal: { ...s.seal, ...patch } }), key)
  const addSticker = (type: Sticker['type']) => setStyle((s) => ({ ...s, stickers: [...s.stickers, { id: uid('st_'), type, x: 0.5, y: 0.4, scale: 1, rotation: Math.random() * 20 - 10 }] }))
  return (
    <>
      <Section title="印章" onReset={() => setStyle((s) => ({ ...s, seal: cloneStyle(defaultCardStyle).seal }))}>
        <ToggleRow label="盖章" checked={seal.on} onChange={(v) => setSeal({ on: v })} hint="在画布上拖动印章可调整位置" />
        {seal.on && (
          <>
            <Field label="章文（1–4 字）">
              <input className="text-input font-display" maxLength={4} value={seal.text} onChange={(e) => setSeal({ text: e.target.value.slice(0, 4) }, 'sealtext')} placeholder="一笺" />
            </Field>
            <div className="row gap8">
              <Field label="刻法"><Segmented size="sm" value={seal.mode} onChange={(v) => setSeal({ mode: v as any })} options={[{ value: 'zhu', label: '朱文' }, { value: 'bai', label: '白文' }]} /></Field>
              <Field label="形状"><Segmented size="sm" value={seal.shape} onChange={(v) => setSeal({ shape: v as any })} options={[{ value: 'square', label: '方' }, { value: 'round', label: '圆' }]} /></Field>
            </div>
            <Slider label="大小" value={seal.size} min={50} max={200} onChange={(v) => setSeal({ size: v }, 'sealsize')} defaultValue={96} />
            <Slider label="旋转" value={seal.rotation} min={-20} max={20} onChange={(v) => setSeal({ rotation: v }, 'sealrot')} defaultValue={-3} unit="°" />
            <Slider label="印泥斑驳" value={seal.distress} min={0} max={1} step={0.05} onChange={(v) => setSeal({ distress: v }, 'sealdist')} defaultValue={0.35} format={(v) => Math.round(v * 100) + '%'} />
            <ToggleRow label="双章并排（合著）" checked={seal.pair} onChange={(v) => setSeal({ pair: v })} hint="用两位作者名字末字各成一章" />
          </>
        )}
      </Section>

      <Section title="边框" onReset={() => setStyle((s) => ({ ...s, border: cloneStyle(defaultCardStyle).border }))}>
        <Segmented block size="sm" value={style.border.type} onChange={(v) => setStyle((s) => ({ ...s, border: { ...s.border, type: v as any } }))}
          options={[{ value: 'none', label: '无' }, { value: 'thin', label: '细线' }, { value: 'double', label: '双线' }, { value: 'torn', label: '决边' }]} />
        {style.border.type !== 'none' && <Field label="颜色"><Swatches colors={[{ value: '#1f1c19', name: '墨' }, { value: '#b2382a', name: '朱' }, { value: '#8a8172', name: '灰' }]} value={style.border.color} onChange={(v) => setStyle((s) => ({ ...s, border: { ...s.border, color: v } }))} /></Field>}
      </Section>

      <Section title="小物件" defaultOpen={false}>
        <div className="field-hint" style={{ marginBottom: 8 }}>拼贴素材，加到画布后可拖动、缩放。</div>
        <div className="sticker-add">
          {STICKER_KINDS.map((k) => (
            <button key={k.type} className="btn btn-line btn-sm" onClick={() => addSticker(k.type)}><Icon name="plus" size={13} /> {k.label}</button>
          ))}
        </div>
        {style.stickers.map((st, i) => (
          <div key={st.id} className="sticker-item">
            <div className="spread">
              <span className="field-label">{STICKER_KINDS.find((k) => k.type === st.type)?.label} {i + 1}</span>
              <button className="icon-btn-sm" onClick={() => setStyle((s) => ({ ...s, stickers: s.stickers.filter((x) => x.id !== st.id) }))}><Icon name="trash" size={14} /></button>
            </div>
            <Slider label="缩放" value={st.scale} min={0.4} max={3} step={0.05} onChange={(v) => setStyle((s) => ({ ...s, stickers: s.stickers.map((x) => x.id === st.id ? { ...x, scale: v } : x) }), 'st' + st.id)} defaultValue={1} format={(v) => v.toFixed(2) + '×'} />
            <Slider label="旋转" value={st.rotation} min={-180} max={180} onChange={(v) => setStyle((s) => ({ ...s, stickers: s.stickers.map((x) => x.id === st.id ? { ...x, rotation: v } : x) }), 'str' + st.id)} defaultValue={0} unit="°" />
          </div>
        ))}
      </Section>
    </>
  )
}

/* ---------------- 导出 ---------------- */
function ExportTab({ onSaveFolio, onSaveTemplate, onExport, onPrint, exporting, pngScale, setPngScale, filename }: Props) {
  return (
    <>
      <Section title="导出 PNG">
        <Field label="倍率">
          <Segmented block value={String(pngScale)} onChange={(v) => setPngScale(+v)} options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }, { value: '3', label: '3×' }]} />
        </Field>
        <div className="export-filename font-num">{filename}</div>
        <button className="btn btn-seal btn-block btn-lg" disabled={exporting} onClick={() => onExport(pngScale)}>
          <Icon name="download" size={17} /> {exporting ? '正在导出…' : '导出 PNG'}
        </button>
        <button className="btn btn-line btn-block" style={{ marginTop: 10 }} disabled={exporting} onClick={onPrint}>
          <Icon name="print" size={16} /> 打印版 · A4 一拼四
        </button>
      </Section>
      <Section title="留存">
        <button className="btn btn-line btn-block" onClick={onSaveFolio}><Icon name="save" size={16} /> 保存到作品夹</button>
        <button className="btn btn-line btn-block" style={{ marginTop: 10 }} onClick={onSaveTemplate}><Icon name="layers" size={16} /> 存为模板（只存样式）</button>
        <div className="field-hint" style={{ marginTop: 12 }}>作品与模板都留在本机（IndexedDB），不上传、不联网。可在作品夹整夹导出 JSON 备份。</div>
      </Section>
    </>
  )
}