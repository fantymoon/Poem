import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const url = process.argv[2] || 'http://localhost:5173/'
const out = process.argv[3] || '.shots/shot.png'
const width = parseInt(process.argv[4] || '1440', 10)
const height = parseInt(process.argv[5] || '900', 10)
const waitArg = process.argv[6] || '900'
const fullPage = process.argv[7] === 'full'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  if (/^\d+$/.test(waitArg)) await new Promise((r) => setTimeout(r, parseInt(waitArg, 10)))
  else await page.waitForSelector(waitArg, { timeout: 8000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 350))
  await page.screenshot({ path: out, fullPage })
  console.log('SHOT_OK ' + out + ` (${width}x${height})`)
  if (errors.length) console.log('CONSOLE_ERRORS:\n' + errors.join('\n'))
  else console.log('NO_CONSOLE_ERRORS')
} finally {
  await browser.close()
}