import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const url = process.argv[2] || 'http://localhost:5173/'
const out = process.argv[3] || '.shots/shot-day.png'
const width = parseInt(process.argv[4] || '1440', 10)
const height = parseInt(process.argv[5] || '900', 10)
const theme = process.argv[6] || 'day'
const touch = process.argv[7] === 'touch'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  if (touch) {
    const cdp = await page.createCDPSession()
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' })
  }
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t === 'day' ? '#E9E3D6' : '#2B2724')
  }, theme)
  await new Promise((r) => setTimeout(r, 1000))
  await page.screenshot({ path: out })
  console.log('SHOT_OK ' + out + ` (${width}x${height} ${theme}${touch ? ' touch' : ''})`)
  if (errors.length) console.log('CONSOLE_ERRORS:\n' + errors.join('\n'))
  else console.log('NO_CONSOLE_ERRORS')
} finally {
  await browser.close()
}