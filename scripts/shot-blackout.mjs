import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const prefix = process.argv[2] || '.shots/bo'
const width = parseInt(process.argv[3] || '1440', 10)
const height = parseInt(process.argv[4] || '900', 10)
const theme = process.argv[5] || 'night'
const touch = process.argv[6] === 'touch'

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
  await page.goto('http://localhost:5173/#/blackout', { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluate((t) => { document.documentElement.dataset.theme = t }, theme)
  await sleep(900)
  await page.screenshot({ path: `${prefix}-idle.png` })
  console.log('SHOT ' + prefix + '-idle.png')

  // paint across the first row of tokens
  const pts = await page.evaluate(() => Array.from(document.querySelectorAll('.bo-token')).slice(0, 16).map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  const drag = async (list) => {
    if (touch) {
      await page.touchscreen.touchStart(list[0].x, list[0].y)
      for (const p of list) await page.touchscreen.touchMove(p.x, p.y)
      await page.touchscreen.touchEnd()
    } else {
      await page.mouse.move(list[0].x, list[0].y)
      await page.mouse.down()
      for (const p of list) await page.mouse.move(p.x, p.y, { steps: 2 })
      await page.mouse.up()
    }
  }
  if (pts.length) { await drag(pts); await sleep(400) }
  await page.screenshot({ path: `${prefix}-painted.png` })
  console.log('SHOT ' + prefix + '-painted.png')

  // pick up the eraser and rub a couple of marks back off
  await page.evaluate(() => document.querySelector('.bo-obj-eraser')?.click())
  await sleep(200)
  if (pts.length > 6) { await drag(pts.slice(2, 7)); await sleep(300) }
  await page.screenshot({ path: `${prefix}-erased.png` })
  console.log('SHOT ' + prefix + '-erased.png')

  // open the settings slip (brush + clear now live here)
  await page.evaluate(() => document.querySelector('.slip-tag')?.click())
  await sleep(600)
  await page.screenshot({ path: `${prefix}-slip.png` })
  console.log('SHOT ' + prefix + '-slip.png')

  if (errors.length) console.log('CONSOLE_ERRORS:\n' + errors.join('\n'))
  else console.log('NO_CONSOLE_ERRORS')
} finally {
  await browser.close()
}