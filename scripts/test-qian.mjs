import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  await page.goto('http://localhost:5173/#/qian', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  // click draw
  await page.evaluate(() => document.querySelector('.qian-tube-wrap')?.click())
  await new Promise(r => setTimeout(r, 1300))
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/qian-revealed.png' })
  const slip = await page.evaluate(() => {
    const no = document.querySelector('.qian-no')?.textContent
    const poem = document.querySelector('.qian-poem')?.textContent
    const yi = document.querySelectorAll('.qian-yiji-text')[0]?.textContent
    const ji = document.querySelectorAll('.qian-yiji-text')[1]?.textContent
    const theme = document.querySelector('.qian-theme-word')?.textContent
    return { no, poem, yi, ji, theme }
  })
  console.log('SLIP:', JSON.stringify(slip))
  // make card handoff
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('做成卡'))?.click() })
  await new Promise(r => setTimeout(r, 700))
  const url = page.url()
  const cardTitle = await page.evaluate(() => document.querySelector('.title-input')?.value)
  const cardBody = await page.evaluate(() => document.querySelector('.body-input')?.value)
  console.log('AFTER_MAKECARD url=', url, 'title=', JSON.stringify(cardTitle), 'body=', JSON.stringify(cardBody))
  await page.screenshot({ path: 'D:/CodeProject/Poem/.shots/qian-makecard.png' })
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }