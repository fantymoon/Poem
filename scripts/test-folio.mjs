import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const SHOTS = 'D:/CodeProject/Poem/.shots/'
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  await page.goto('http://localhost:5173/#/folio', { waitUntil: 'networkidle0' })
  await sleep(500)

  // empty state first
  await page.screenshot({ path: SHOTS + 'folio-empty.png' })
  const emptyLine = await page.evaluate(() => document.querySelector('.folio-empty-line')?.textContent)
  console.log('EMPTY_LINE=', emptyLine)

  // seed varied cards through the real store
  await page.evaluate(async () => {
    const { useStore } = await import('/src/store/useStore.ts')
    const { makePoem, cloneStyle } = await import('/src/lib/cardStyle.ts')
    const { templateById } = await import('/src/lib/templates.ts')
    const st = useStore.getState()
    const A = [{ id: 'a', name: '杏', color: '#b2382a' }, { id: 'b', name: '薙', color: '#3f6b7d' }]
    const samples = [
      { source: 'free', tpl: 'sujian', title: '山居', lines: ['空山新雨后', '天气晚来秋', '明月松间照', '清泉石上流'] },
      { source: 'free', tpl: 'yejian', title: '夜航', lines: ['灯把海面烫出一个洞', '船走过去', '又合上'] },
      { source: 'blind', tpl: 'hezhu', title: '站台', lines: ['旧站台的灯还亮着', '我把黄昏折进口袋', '铁轨记得每一双鞋', '风替我说完了再见'], authors: A },
      { source: 'qian', tpl: 'qiantiao', title: '第七签', lines: ['行到水穷处，坐看云起时'] },
      { source: 'dice', tpl: 'sujian', title: '意象', lines: ['塔', '渡口', '初雪', '把三样东西', '摆成一句'] },
      { source: 'blackout', tpl: 'jiubao', title: '城南', lines: ['清晨', '白塔在薄雾里', '渡口', '灯笼', '暖'] },
      { source: 'free', tpl: 'shufu', title: '辋川', lines: ['大漠孤烟直', '长河落日圆'] },
      { source: 'free', tpl: 'gaozhi', title: '种菜', lines: ['一行一行地写', '像种一行行的菜'] },
    ]
    let k = 0
    for (const s of samples) {
      const tpl = templateById(s.tpl)
      const poem = makePoem({ source: s.source, title: s.title, lines: s.lines.map((t, i) => ({ text: t, authorId: s.authors ? s.authors[i % 2].id : undefined })), authors: s.authors || [], origin: '测试' })
      const card = { id: 'card_seed_' + (k++), poem, style: cloneStyle(tpl.style), updatedAt: Date.now() - k * 60000 }
      await st.saveCard(card)
    }
  })
  await sleep(600)
  await page.screenshot({ path: SHOTS + 'folio-grid.png' })
  const cardCount = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  console.log('CARD_COUNT=', cardCount)

  // filter: blind
  await page.evaluate(() => { [...document.querySelectorAll('.folio-pill')].find(b => b.textContent.includes('双盲'))?.click() })
  await sleep(300)
  const blindCount = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  console.log('BLIND_FILTER_COUNT=', blindCount)
  await page.screenshot({ path: SHOTS + 'folio-filter.png' })
  await page.evaluate(() => { [...document.querySelectorAll('.folio-pill')].find(b => b.textContent.includes('全部'))?.click() })
  await sleep(200)

  // hover first card -> actions
  await page.hover('.folio-card')
  await sleep(300)
  await page.screenshot({ path: SHOTS + 'folio-hover.png' })
  const actionsVisible = await page.evaluate(() => { const a = document.querySelector('.folio-card .folio-card-actions'); return getComputedStyle(a).opacity })
  console.log('HOVER_ACTIONS_OPACITY=', actionsVisible)

  // duplicate the first card
  const before = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  await page.evaluate(() => { document.querySelector('.folio-card .folio-act[title="复制一份"]')?.click() })
  await sleep(400)
  const afterDup = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  const dupToast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(e => e.textContent).join('|'))
  console.log('DUPLICATE=', before, '->', afterDup, 'TOAST=', dupToast)

  // delete a card -> confirm dialog
  await page.evaluate(() => { document.querySelector('.folio-card .folio-act[title="删除"]')?.click() })
  await sleep(300)
  const confirmOpen = await page.evaluate(() => !!document.querySelector('.modal'))
  await page.screenshot({ path: SHOTS + 'folio-delete-confirm.png' })
  console.log('CONFIRM_OPEN=', confirmOpen)
  await page.evaluate(() => { [...document.querySelectorAll('.modal button')].find(b => b.textContent.trim() === '删除')?.click() })
  await sleep(400)
  const afterDel = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  console.log('AFTER_DELETE=', afterDup, '->', afterDel)

  // edit a card -> workshop loads it
  const editTitle = await page.evaluate(() => document.querySelector('.folio-card .folio-card-title')?.textContent)
  await page.evaluate(() => { document.querySelector('.folio-card .folio-act[title="编辑"]')?.click() })
  await sleep(700)
  const editUrl = page.url()
  const wsTitle = await page.evaluate(() => document.querySelector('.title-input')?.value)
  console.log('EDIT url=', editUrl, 'folioTitle=', editTitle, 'wsTitle=', wsTitle)
  await page.screenshot({ path: SHOTS + 'folio-edit.png' })
  await page.goto('http://localhost:5173/#/folio', { waitUntil: 'networkidle0' })
  await sleep(500)

  // scatter toggle changes rotation
  const rotBefore = await page.evaluate(() => document.querySelector('.folio-card')?.style.getPropertyValue('--rot'))
  await page.evaluate(() => { document.querySelector('.folio-scatter .toggle')?.click() })
  await sleep(300)
  const rotAfter = await page.evaluate(() => document.querySelector('.folio-card')?.style.getPropertyValue('--rot'))
  console.log('SCATTER rot', rotBefore, '->', rotAfter)
  await page.evaluate(() => { document.querySelector('.folio-scatter .toggle')?.click() })
  await sleep(200)

  // export JSON (toast)
  await page.evaluate(() => { [...document.querySelectorAll('.folio-head-actions button')].find(b => b.textContent.includes('导出'))?.click() })
  await sleep(400)
  const expToast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(e => e.textContent).join('|'))
  console.log('EXPORT_TOAST=', expToast)

  // import JSON via file upload
  const importData = { app: 'yijian', version: 1, exportedAt: Date.now(), cards: [{ id: 'card_imported_1', poem: { id: 'p_imp', title: '远方', lines: [{ text: '远方除了遥远' }, { text: '一无所有' }], stanzaBreaks: [], authors: [], source: 'free', date: '2026-11-13', showDate: true, showOrigin: true, createdAt: Date.now() }, style: null, updatedAt: Date.now() }], templates: [] }
  // build the import file in-page to reuse a valid style, then read it back out
  const importJson = await page.evaluate(async (data) => { const { templateById } = await import('/src/lib/templates.ts'); data.cards[0].style = templateById('sujian').style; data.cards[0].poem.title = '远方'; return JSON.stringify(data) }, importData)
  fs.writeFileSync('D:/CodeProject/Poem/.shots/import-test.json', importJson)
  const input = await page.$('input[type="file"]')
  await input.uploadFile('D:/CodeProject/Poem/.shots/import-test.json')
  await sleep(600)
  const impToast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(e => e.textContent).join('|'))
  const impCount = await page.evaluate(() => document.querySelectorAll('.folio-card').length)
  console.log('IMPORT_TOAST=', impToast, 'COUNT=', impCount)
  await page.screenshot({ path: SHOTS + 'folio-imported.png' })

  // mobile viewport
  await page.setViewport({ width: 375, height: 780 })
  await sleep(400)
  await page.screenshot({ path: SHOTS + 'folio-mobile.png' })

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }