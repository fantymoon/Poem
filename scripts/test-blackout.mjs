import puppeteer from 'puppeteer-core'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const SHOTS = 'D:/CodeProject/Poem/.shots/'
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })
  await page.goto('http://localhost:5173/#/blackout', { waitUntil: 'networkidle0' })
  await sleep(700)
  await page.screenshot({ path: SHOTS + 'blackout-idle.png' })

  // dump tokens with viewport centers
  const tokens = await page.evaluate(() => {
    return [...document.querySelectorAll('.bo-token[data-i]')].map(sp => {
      const r = sp.getBoundingClientRect()
      return { i: +sp.dataset.i, text: sp.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
  })
  console.log('TOKEN_COUNT=', tokens.length)
  console.log('TOKENS=', JSON.stringify(tokens.map(t => t.text)))

  // choose words to KEEP that form a poem; blacken the rest
  const keepWords = ['清晨', '白塔', '薄雾', '渡口', '芦苇', '初雪', '灯笼', '暖', '声音', '黄昏']
  const keepIdx = new Set(tokens.filter(t => keepWords.some(w => t.text.includes(w))).map(t => t.i))
  console.log('KEEP=', JSON.stringify([...keepIdx].map(i => tokens.find(t => t.i === i)?.text)))
  const toBlack = tokens.filter(t => !keepIdx.has(t.i))
  // blacken via real mouse clicks (real active pointer for setPointerCapture)
  for (const t of toBlack) { await page.mouse.click(t.x, t.y); await sleep(12) }
  await sleep(300)
  await page.screenshot({ path: SHOTS + 'blackout-painted.png' })

  const poem1 = await page.evaluate(() => [...document.querySelectorAll('.bo-remaining-line')].map(e => e.textContent))
  const kept1 = await page.evaluate(() => document.querySelector('.bo-remaining-block .faint')?.textContent)
  console.log('POEM_AFTER_PAINT=', JSON.stringify(poem1), 'KEPT=', kept1)

  // eraser: erase one blackened token, kept count should rise
  await page.evaluate(() => { [...document.querySelectorAll('.bo-tool')].find(b => b.textContent.includes('擦除'))?.click() })
  await sleep(120)
  const eraseTarget = toBlack[0]
  await page.mouse.click(eraseTarget.x, eraseTarget.y)
  await sleep(200)
  const kept2 = await page.evaluate(() => document.querySelector('.bo-remaining-block .faint')?.textContent)
  console.log('KEPT_AFTER_ERASE=', kept2, '(was', kept1 + ')')

  // circle tool: circle a kept token
  await page.evaluate(() => { [...document.querySelectorAll('.bo-tool')].find(b => b.textContent.includes('圈选'))?.click() })
  await sleep(120)
  const circleTarget = tokens.find(t => keepIdx.has(t.i)) || tokens[0]
  await page.mouse.click(circleTarget.x, circleTarget.y)
  await sleep(200)
  await page.screenshot({ path: SHOTS + 'blackout-circle.png' })

  // back to paint, test ink texture + color
  await page.evaluate(() => { [...document.querySelectorAll('.bo-tool')].find(b => b.textContent.includes('涂黑'))?.click() })
  await sleep(100)
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '墨')?.click() })
  await sleep(100)
  await page.evaluate(() => { const sw = document.querySelector('.swatches .swatch[title="朱"]'); sw?.click() })
  await sleep(200)
  await page.screenshot({ path: SHOTS + 'blackout-ink-red.png' })

  // char mode: marks reset, re-segment
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '字')?.click() })
  await sleep(300)
  const charCount = await page.evaluate(() => document.querySelectorAll('.bo-token[data-i]').length)
  console.log('CHAR_TOKEN_COUNT=', charCount, '(word was', tokens.length + ')')
  await page.screenshot({ path: SHOTS + 'blackout-char.png' })

  // free mode: draw a stroke via drag, coverage computes
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '自由')?.click() })
  await sleep(300)
  const box = await page.evaluate(() => { const r = document.querySelector('.bo-page').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })
  await page.mouse.move(box.x + 40, box.y + 80)
  await page.mouse.down()
  for (let k = 0; k <= 20; k++) { await page.mouse.move(box.x + 40 + k * 14, box.y + 80 + Math.sin(k / 3) * 10); await sleep(8) }
  await page.mouse.up()
  await sleep(300)
  const freeKept = await page.evaluate(() => document.querySelector('.bo-remaining-block .faint')?.textContent)
  console.log('FREE_KEPT_AFTER_STROKE=', freeKept)
  await page.screenshot({ path: SHOTS + 'blackout-free.png' })

  // back to word mode, repaint a clean poem for make-card
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '词')?.click() })
  await sleep(200)
  await page.evaluate(() => { [...document.querySelectorAll('.seg-item')].find(b => b.textContent === '马克')?.click() })
  await sleep(100)
  await page.evaluate(() => { const sw = document.querySelector('.swatches .swatch[title="墨"]'); sw?.click() })
  await sleep(200)
  const tokens2 = await page.evaluate(() => [...document.querySelectorAll('.bo-token[data-i]')].map(sp => { const r = sp.getBoundingClientRect(); return { i: +sp.dataset.i, text: sp.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  const keep2 = new Set(tokens2.filter(t => keepWords.some(w => t.text.includes(w))).map(t => t.i))
  for (const t of tokens2.filter(t => !keep2.has(t.i))) { await page.mouse.click(t.x, t.y); await sleep(10) }
  await sleep(200)
  // set a title
  await page.evaluate(() => { const el = document.querySelector('.game-aside .text-input'); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, '城南'); el.dispatchEvent(new Event('input', { bubbles: true })) })
  await sleep(150)
  const poemFinal = await page.evaluate(() => [...document.querySelectorAll('.bo-remaining-line')].map(e => e.textContent))
  console.log('POEM_FINAL=', JSON.stringify(poemFinal))
  await page.screenshot({ path: SHOTS + 'blackout-final.png' })

  // export PNG (verify toast)
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.includes('导出这一页 PNG'))?.click() })
  await sleep(500)
  const toastExport = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(e => e.textContent).join('|'))
  console.log('TOAST_EXPORT=', toastExport)

  // make card
  await page.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '做成卡')?.click() })
  await sleep(800)
  const url = page.url()
  console.log('AFTER_MAKECARD_URL=', url)
  await page.screenshot({ path: SHOTS + 'blackout-card.png' })
  // verify blackoutImage carried into workshop card + jiubao template
  const cardInfo = await page.evaluate(() => {
    const svg = document.querySelector('.card-svg, svg')
    const img = document.querySelector('image')
    return { hasSvg: !!svg, hasImage: !!img, imageHrefLen: img ? (img.getAttribute('href') || img.getAttribute('xlink:href') || '').length : 0 }
  })
  console.log('CARD_INFO=', JSON.stringify(cardInfo))

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO_ERRORS')
} finally { await browser.close() }