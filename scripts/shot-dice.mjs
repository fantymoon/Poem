import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await p.goto('http://localhost:5173/#/dice', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 600))
await p.screenshot({ path: '.shots/d-idle.png' })
// hover first die to reveal controls, lock it
const die = await p.$('.die-col')
const box = await die.boundingBox()
await p.mouse.move(box.x + box.width / 2, box.y + 40)
await new Promise(r => setTimeout(r, 400))
await p.screenshot({ path: '.shots/d-hover.png' })
await p.click('.die-col .die-lock')
await new Promise(r => setTimeout(r, 300))
// move mouse away then roll
await p.mouse.move(720, 800)
await p.click('.dice-roll-btn')
await new Promise(r => setTimeout(r, 1400))
await p.screenshot({ path: '.shots/d-rolled.png' })
console.log('SHOTS_OK')
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_CONSOLE_ERRORS')
await b.close()