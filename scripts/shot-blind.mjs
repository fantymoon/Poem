import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const prefix = process.argv[2] || '.shots/blind'
const width = parseInt(process.argv[3] || '1440', 10)
const height = parseInt(process.argv[4] || '900', 10)
const theme = process.argv[5] || 'night'
const touch = process.argv[6] === 'touch'
const withTheme = process.argv[7] === 'theme'
const steps = process.argv[8] || 'all'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
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
  const setTheme = async () => page.evaluate((t) => {
    document.documentElement.dataset.theme = t
  }, theme)

  if (withTheme) {
    await page.goto('http://localhost:5173/#/dice', { waitUntil: 'networkidle0', timeout: 30000 })
    await setTheme(); await sleep(500)
    await page.evaluate(() => document.querySelector('.dice-roll-btn')?.click())
    await sleep(1700)
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.includes('送去双盲'))
      b?.click()
    })
    await sleep(900)
  } else {
    await page.goto('http://localhost:5173/#/blind', { waitUntil: 'networkidle0', timeout: 30000 })
    await sleep(700)
  }
  await setTheme(); await sleep(500)
  await page.screenshot({ path: `${prefix}-front.png` })
  console.log('SHOT ' + prefix + '-front.png')

  if (steps === 'all') {
    await page.evaluate(() => document.querySelector('.blind-front .blind-rules-btn')?.click())
    await sleep(850)
    await page.screenshot({ path: `${prefix}-back.png` })
    console.log('SHOT ' + prefix + '-back.png')

    await page.evaluate(() => document.querySelector('.blind-back .blind-rules-btn')?.click())
    await sleep(850)
    await page.evaluate(() => document.querySelector('.blind-front .btn-seal')?.click())
    await sleep(400)
    await page.screenshot({ path: `${prefix}-folding.png` })
    console.log('SHOT ' + prefix + '-folding.png')
    await sleep(750)
    await page.screenshot({ path: `${prefix}-handoff.png` })
    console.log('SHOT ' + prefix + '-handoff.png')
  }

  if (errors.length) console.log('CONSOLE_ERRORS:\n' + errors.join('\n'))
  else console.log('NO_CONSOLE_ERRORS')
} finally {
  await browser.close()
}