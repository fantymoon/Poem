import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const url = process.argv[2]
const out = process.argv[3]
const width = parseInt(process.argv[4] || '1440', 10)
const height = parseInt(process.argv[5] || '900', 10)
const selector = process.argv[6] || ''
const theme = process.argv[7] || ''

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t }, theme)
  await new Promise((r) => setTimeout(r, 700))
  if (selector) {
    await page.waitForSelector(selector, { timeout: 8000 })
    await page.click(selector)
    await new Promise((r) => setTimeout(r, 700))
  }
  await page.screenshot({ path: out })
  console.log('SHOT_OK ' + out + ` (${width}x${height})`)
  if (errors.length) console.log('CONSOLE_ERRORS:\n' + errors.join('\n'))
  else console.log('NO_CONSOLE_ERRORS')
} finally {
  await browser.close()
}