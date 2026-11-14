import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const SHOTS = 'D:/CodeProject/Poem/.shots/'
const ROUTES = [['home', '/'], ['qian', '/qian'], ['dice', '/dice'], ['blind', '/blind'], ['blackout', '/blackout'], ['folio', '/folio']]
const errors = []
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  const cdp = await page.createCDPSession()

  // ---- MOBILE (touch, hover:none), night ----
  await page.setViewport({ width: 375, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0' })
  console.log('MOBILE hover:none =', await page.evaluate(() => matchMedia('(hover: none)').matches), 'pointer:coarse =', await page.evaluate(() => matchMedia('(pointer: coarse)').matches))
  for (const [name, route] of ROUTES) {
    await page.goto('http://localhost:5173/#' + route, { waitUntil: 'networkidle0' })
    await sleep(600)
    await page.screenshot({ path: SHOTS + 'm-' + name + '.png' })
    // detect horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log('MOBILE', name, 'hOverflow=', overflow)
  }

  // ---- Blackout pan scroll on mobile ----
  await page.goto('http://localhost:5173/#/blackout', { waitUntil: 'networkidle0' })
  await sleep(600)
  const stageSel = '.bo-stage'
  const scrollBefore = await page.evaluate((s) => document.querySelector(s)?.scrollTop, stageSel)
  // paint mode: a touch drag should NOT scroll (it paints)
  const pageBox = await page.evaluate(() => { const r = document.querySelector('.bo-page').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 60 } })
  await page.touchscreen.touchStart(pageBox.x, pageBox.y)
  await page.touchscreen.touchMove(pageBox.x, pageBox.y - 120)
  await page.touchscreen.touchEnd()
  await sleep(200)
  const scrollPaint = await page.evaluate((s) => document.querySelector(s)?.scrollTop, stageSel)
  // switch to pan tool
  await page.evaluate(() => { [...document.querySelectorAll('.bo-obj')].find(b => b.title.includes('移动'))?.click() })
  await sleep(200)
  await page.touchscreen.touchStart(pageBox.x, pageBox.y)
  await page.touchscreen.touchMove(pageBox.x, pageBox.y - 160)
  await page.touchscreen.touchMove(pageBox.x, pageBox.y - 220)
  await page.touchscreen.touchEnd()
  await sleep(300)
  const scrollPan = await page.evaluate((s) => document.querySelector(s)?.scrollTop, stageSel)
  console.log('BLACKOUT scroll before=', scrollBefore, 'afterPaintDrag=', scrollPaint, 'afterPanDrag=', scrollPan)
  await page.screenshot({ path: SHOTS + 'm-blackout-pan.png' })

  // ---- TABLET two-column (900px), night ----
  await page.setViewport({ width: 900, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  for (const [name, route] of ROUTES) {
    await page.goto('http://localhost:5173/#' + route, { waitUntil: 'networkidle0' })
    await sleep(500)
    await page.screenshot({ path: SHOTS + 't-' + name + '.png' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log('TABLET', name, 'hOverflow=', overflow)
  }

  // ---- DAY theme, desktop ----
  await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0' })
  await page.evaluate(async () => { const { useStore } = await import('/src/store/useStore.ts'); useStore.getState().setSettings({ theme: 'day' }) })
  await sleep(400)
  for (const [name, route] of ROUTES) {
    await page.goto('http://localhost:5173/#' + route, { waitUntil: 'networkidle0' })
    await sleep(500)
    await page.screenshot({ path: SHOTS + 'day-' + name + '.png' })
  }

  // ---- reduced motion sanity (no crash, renders) ----
  await page.evaluate(async () => { const { useStore } = await import('/src/store/useStore.ts'); useStore.getState().setSettings({ theme: 'night', reducedMotion: true }) })
  await page.goto('http://localhost:5173/#/qian', { waitUntil: 'networkidle0' })
  await sleep(400)
  const motionAttr = await page.evaluate(() => document.documentElement.dataset.motion)
  console.log('REDUCED_MOTION attr=', motionAttr)
  await page.screenshot({ path: SHOTS + 'reduced-qian.png' })

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }