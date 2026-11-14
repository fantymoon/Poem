import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  const dl = 'D:/CodeProject/Poem/.shots/dl'
  fs.mkdirSync(dl, { recursive: true })
  const client = await page.createCDPSession()
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, eventsEnabled: true }).catch(() => {})
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl }).catch(() => {})

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  await page.evaluate(() => {
    const set = (s, v) => { const el = document.querySelector(s); const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
    set('.title-input', '山居'); set('.body-input', '空山新雨后\n天气晚来秋')
  })
  await new Promise(r => setTimeout(r, 500))

  // direct rasterize test against the live SVG
  const result = await page.evaluate(async () => {
    try {
      const svg = document.querySelector('.card-holder svg')
      if (!svg) return { ok: false, error: 'no svg' }
      const clone = svg.cloneNode(true)
      clone.setAttribute('width', '2000'); clone.setAttribute('height', '2666')
      const str = new XMLSerializer().serializeToString(clone)
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str)
      const img = new Image()
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img load fail')); img.src = url })
      const c = document.createElement('canvas'); c.width = 2000; c.height = 2666
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 2000, 2666)
      const data = c.toDataURL('image/png')
      return { ok: true, len: data.length, head: data.slice(0, 40) }
    } catch (e) { return { ok: false, error: String(e) } }
  })
  console.log('RASTERIZE:', JSON.stringify(result))

  // test the actual export module path (server-render + rasterize)
  const modTest = await page.evaluate(async () => {
    try {
      const ex = await import('/src/lib/export.ts')
      const cs = await import('/src/lib/cardStyle.ts')
      const poem = cs.makePoem({ source: 'free', title: '山居', lines: [{ text: '空山新雨后' }, { text: '天气晚来秋' }] })
      const card = { id: 'x', poem, style: cs.defaultCardStyle, updatedAt: Date.now() }
      const svg = ex.cardSVGString(card)
      const blob = await ex.rasterize(svg, 1000, 1333, 2)
      return { ok: true, svgLen: svg.length, blobSize: blob.size }
    } catch (e) { return { ok: false, error: String(e), stack: (e && e.stack || '').slice(0, 400) } }
  })
  console.log('MODULE_EXPORT:', JSON.stringify(modTest))

  // test full exportCardPNG (paperDims + downloadBlob) directly
  const fullTest = await page.evaluate(async () => {
    try {
      const ex = await import('/src/lib/export.ts')
      const cs = await import('/src/lib/cardStyle.ts')
      const poem = cs.makePoem({ source: 'free', title: '山居', lines: [{ text: '空山新雨后' }, { text: '天气晚来秋' }] })
      const card = { id: 'x', poem, style: cs.defaultCardStyle, updatedAt: Date.now() }
      const t0 = performance.now()
      await ex.exportCardPNG(card, 2)
      return { ok: true, ms: Math.round(performance.now() - t0) }
    } catch (e) { return { ok: false, error: String(e), stack: (e && e.stack || '').slice(0, 400) } }
  })
  console.log('FULL_EXPORT:', JSON.stringify(fullTest))

  // now the real export button
  const downloads = []
  client.on('Browser.downloadWillBegin', (e) => downloads.push(e.suggestedFilename))
  client.on('Browser.downloadProgress', (e) => { if (e.state === 'completed') downloads.push('COMPLETED:' + e.guid) })
  await page.evaluate(() => { [...document.querySelectorAll('.style-tab')].find(e => e.textContent.includes('导出'))?.click() })
  await new Promise(r => setTimeout(r, 300))
  downloads.length = 0
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button.btn-seal')].find(e => e.textContent.includes('导出 PNG')); if (b) { b.click(); return b.textContent.trim() } return 'NOT FOUND' })
  console.log('CLICKED BUTTON:', clicked)
  await new Promise(r => setTimeout(r, 700))
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/export-after-click.png' })
  const toast1 = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '))
  console.log('TOAST@700ms:', toast1)
  await new Promise(r => setTimeout(r, 2500))
  console.log('CDP DOWNLOADS:', JSON.stringify(downloads))
  console.log('FILES:', JSON.stringify(fs.readdirSync(dl)))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_PAGE_ERRORS')
} finally { await browser.close() }