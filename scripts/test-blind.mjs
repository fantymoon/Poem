import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  await page.goto('http://localhost:5173/#/blind', { waitUntil: 'networkidle0' })
  await sleep(500)
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/blind-setup.png' })
  // reveal=fast (keep default 6 lines)
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '快')?.click() })
  await sleep(200)
  const linesVal = await page.evaluate(() => document.querySelector('.stepper-val')?.textContent)
  console.log('LINES=', linesVal)
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('折好纸'))?.click() })
  await sleep(400)
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/blind-handoff.png' })
  const poems = ['旧站台的灯还亮着', '我把黄昏折进口袋', '铁轨记得每一双鞋', '风替我说完了再见', '渡口的船翻扣着', '像一句说完的话']
  const n = parseInt(linesVal, 10) || 6
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('开始写'))?.click() })
    await sleep(250)
    if (i === 0) await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/blind-writing.png' })
    await page.evaluate((txt) => {
      const el = document.querySelector('.blind-input')
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(el, txt); el.dispatchEvent(new Event('input', { bubbles: true }))
    }, poems[i])
    await sleep(150)
    await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '落笔')?.click() })
    await sleep(300)
  }
  await sleep(1200)
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/blind-reveal.png' })
  const revealed = await page.evaluate(() => [...document.querySelectorAll('.blind-reveal-text')].map(e => e.textContent))
  console.log('REVEALED:', JSON.stringify(revealed))
  // set a title then make card
  await page.evaluate(() => { const el = document.querySelector('.blind-title-edit .text-input'); if (el) { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, '站台'); el.dispatchEvent(new Event('input', { bubbles: true })) } })
  await sleep(150)
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('做成合著卡'))?.click() })
  await sleep(700)
  const url = page.url()
  const authors = await page.evaluate(() => [...document.querySelectorAll('.author-name, .author-row input')].map(e => e.value || e.textContent))
  console.log('AFTER_MAKECARD url=', url)
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/blind-card.png' })
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }