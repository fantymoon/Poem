import { Icon } from '../Icon'
import { Field, Toggle } from '../ui'
import type { Poem } from '../../lib/types'
import { parseBody, bodyFromPoem, AUTHOR_COLORS, uid } from '../../lib/cardStyle'

export function ContentPanel({ poem, setPoem, bodyRef }: { poem: Poem; setPoem: (u: (p: Poem) => Poem, key?: string) => void; bodyRef?: React.RefObject<HTMLTextAreaElement> }) {
  const multiAuthor = poem.authors.length > 1

  const onBody = (text: string) => {
    const { lines, stanzaBreaks } = parseBody(text)
    setPoem((p) => ({
      ...p,
      lines: lines.map((l, i) => ({ text: l.text, authorId: p.lines[i]?.authorId })),
      stanzaBreaks,
    }), 'body')
  }

  const addAuthor = () => {
    if (poem.authors.length >= 4) return
    const idx = poem.authors.length
    setPoem((p) => ({
      ...p,
      authors: [...p.authors, { id: uid('a_'), name: idx === 0 ? '甲' : idx === 1 ? '乙' : `作者${idx + 1}`, color: AUTHOR_COLORS[idx] }],
    }))
  }

  const cycleLineAuthor = (lineIdx: number) => {
    setPoem((p) => {
      const ids = [undefined, ...p.authors.map((a) => a.id)]
      const cur = p.lines[lineIdx]?.authorId
      const next = ids[(ids.indexOf(cur) + 1) % ids.length]
      const lines = p.lines.map((l, i) => (i === lineIdx ? { ...l, authorId: next } : l))
      return { ...p, lines }
    })
  }

  return (
    <div className="content-panel">
      <Field label="标题">
        <input
          className="text-input title-input font-poem"
          value={poem.title}
          placeholder="给这首诗起个名字"
          onChange={(e) => setPoem((p) => ({ ...p, title: e.target.value }), 'title')}
        />
      </Field>

      <Field label="正文" hint="一行即诗的一行，空行分节">
        <textarea
          ref={bodyRef}
          className="text-input body-input font-poem"
          value={bodyFromPoem(poem)}
          placeholder={'写一首，\n或者从桌上拿一首。\n\n空一行，就是下一节。'}
          rows={8}
          onChange={(e) => onBody(e.target.value)}
        />
      </Field>

      <Field label="作者" right={<button className="reset-link" onClick={addAuthor} disabled={poem.authors.length >= 4}>＋ 加一位</button>}>
        {poem.authors.length === 0 && <div className="field-hint">不署名也可以。加一位作者后，可按行标记归属。</div>}
        <div className="author-list">
          {poem.authors.map((a) => (
            <div key={a.id} className="author-row">
              <span className="author-dot" style={{ background: a.color }} />
              <input
                className="text-input author-name"
                value={a.name}
                onChange={(e) => setPoem((p) => ({ ...p, authors: p.authors.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x) }), 'author')}
              />
              <button className="icon-btn-sm" title="移除" onClick={() => setPoem((p) => ({ ...p, authors: p.authors.filter((x) => x.id !== a.id), lines: p.lines.map((l) => l.authorId === a.id ? { ...l, authorId: undefined } : l) }))}>
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      </Field>

      {multiAuthor && (
        <Field label="行归属" hint="点色点切换这一行属于谁">
          <div className="line-attr">
            {poem.lines.map((l, i) => {
              if (!l.text) return null
              const a = poem.authors.find((x) => x.id === l.authorId)
              return (
                <button key={i} className="line-attr-row" onClick={() => cycleLineAuthor(i)} title="点击切换作者">
                  <span className="author-dot" style={{ background: a?.color || 'var(--on-desk-faint)' }} />
                  <span className="line-attr-text font-poem">{l.text}</span>
                  <span className="line-attr-name">{a?.name || '未定'}</span>
                </button>
              )
            })}
          </div>
        </Field>
      )}

      <div className="content-meta">
        <Field label="日期" right={<Toggle checked={poem.showDate ?? true} onChange={(v) => setPoem((p) => ({ ...p, showDate: v }))} />}>
          <input type="date" className="text-input font-num" value={poem.date || ''} onChange={(e) => setPoem((p) => ({ ...p, date: e.target.value }), 'date')} />
        </Field>
        <Field label="出处" right={<Toggle checked={poem.showOrigin ?? true} onChange={(v) => setPoem((p) => ({ ...p, showOrigin: v }))} />}>
          <input className="text-input" value={poem.origin || ''} placeholder="如：双盲 · 主题词：塔" onChange={(e) => setPoem((p) => ({ ...p, origin: e.target.value }), 'origin')} />
        </Field>
      </div>
    </div>
  )
}