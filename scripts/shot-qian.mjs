import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const out = process.argv[2] || '.shots/q-reveal.png'
const wait = parseInt(process.argv[3] || '2200', 10)
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await p.goto('http://localhost:5173/#/qian', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 600))
await p.click('.qian-tube-wrap')
await new Promise(r => setTimeout(r, wait))
await p.screenshot({ path: out })
console.log('SHOT_OK ' + out)
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_CONSOLE_ERRORS')
await b.close()