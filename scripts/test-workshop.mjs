import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const base = 'http://localhost:5173/'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] })
const errors = []
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  const dl = 'D:/CodeProject/Poem/.shots/dl'
  fs.mkdirSync(dl, { recursive: true })
  // Headless Chrome cancels blob downloads to disk; assert via CDP events + toast + blob size instead.
  const client = await browser.target().createCDPSession()
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, eventsEnabled: true }).catch(() => {})
  const dlEvents = []
  client.on('Browser.downloadWillBegin', (e) => dlEvents.push(e.suggestedFilename))

  const setVal = async (sel, val) => page.evaluate((s, v) => {
    const el = document.querySelector(s)
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, sel, val)
  const clickText = async (text, sel = 'button') => page.evaluate((t, s) => {
    const els = [...document.querySelectorAll(s)]
    const el = els.find((e) => e.textContent.trim().includes(t))
    if (el) { el.click(); return true } return false
  }, text, sel)
  const shot = async (name) => { await new Promise(r => setTimeout(r, 500)); await page.screenshot({ path: '.shots/' + name }) }

  await page.goto(base, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))

  // type a poem
  await setVal('.title-input', '山居')
  await setVal('.body-input', '空山新雨后\n天气晚来秋\n\n明月松间照\n清泉石上流')
  await shot('ws-poem.png')

  // vertical
  await clickText('竖排')
  await shot('ws-vertical.png')

  // apply 竖幅 template
  await page.evaluate(() => { const t = [...document.querySelectorAll('.template-thumb')].find(e => e.textContent.includes('竖幅')); t?.click() })
  await shot('ws-shufu.png')

  // back to horizontal, apply 夜笺
  await clickText('横排')
  await page.evaluate(() => { const t = [...document.querySelectorAll('.template-thumb')].find(e => e.textContent.includes('夜笺')); t?.click() })
  await shot('ws-yejian.png')

  // decor tab: enable seal
  await page.evaluate(() => { const t = [...document.querySelectorAll('.style-tab')].find(e => e.textContent.includes('装饰')); t?.click() })
  await new Promise(r => setTimeout(r, 200))
  await page.evaluate(() => { const sw = document.querySelector('.toggle-row .toggle'); sw?.click() })
  await shot('ws-seal.png')

  // export PNG 2x
  await page.evaluate(() => { const t = [...document.querySelectorAll('.style-tab')].find(e => e.textContent.includes('导出')); t?.click() })
  await new Promise(r => setTimeout(r, 200))
  await clickText('导出 PNG', '.btn')
  let toastText = ''
  for (let i = 0; i < 10 && !toastText; i++) {
    await new Promise(r => setTimeout(r, 400))
    toastText = await page.evaluate(() => document.querySelector('.toast')?.textContent || '')
  }
  console.log('TOAST:', JSON.stringify(toastText))
  console.log('DOWNLOAD_EVENTS:', JSON.stringify(dlEvents))
  const blobCheck = await page.evaluate(async () => {
    const ex = await import('/src/lib/export.ts')
    const cs = await import('/src/lib/cardStyle.ts')
    const poem = cs.makePoem({ source: 'free', title: '山居', lines: [{ text: '空山新雨后' }] })
    const blob = await ex.rasterize(ex.cardSVGString({ id: 'x', poem, style: cs.defaultCardStyle, updatedAt: 0 }), 1000, 1333, 2)
    return blob.size
  })
  console.log('PNG_BLOB_BYTES:', blobCheck)
  const files = fs.readdirSync(dl)
  console.log('DISK_FILES(headless may cancel):', JSON.stringify(files))

  console.log(errors.length ? 'CONSOLE_ERRORS:\n' + errors.join('\n') : 'NO_CONSOLE_ERRORS')
} finally { await browser.close() }