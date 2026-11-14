import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  await page.goto('http://localhost:5173/#/dice', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/dice-initial.png' })
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('掷骰子'))?.click() })
  await new Promise(r => setTimeout(r, 1300))
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/dice-rolled.png' })
  const words = await page.evaluate(() => [...document.querySelectorAll('.dice-word-big')].map(e => e.textContent))
  console.log('WORDS:', JSON.stringify(words))
  // lock first die, roll again, verify it stays
  await page.evaluate(() => document.querySelector('.die-lock')?.click())
  const before = await page.evaluate(() => document.querySelector('.dice-word-big')?.textContent)
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('再掷一次'))?.click() })
  await new Promise(r => setTimeout(r, 1300))
  const after = await page.evaluate(() => document.querySelector('.dice-word-big')?.textContent)
  console.log('LOCK_TEST before=', before, 'after=', after, 'stayed=', before === after)
  const recent = await page.evaluate(() => [...document.querySelectorAll('.dice-recent-words')].map(e => e.textContent))
  console.log('RECENT:', JSON.stringify(recent))
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }