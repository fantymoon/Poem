import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const url = process.argv[2] || 'http://localhost:5173/#/'
const out = process.argv[3] || '.shots/w-pop.png'
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
await p.goto(url, { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 500))
await p.click('.title-input')
await p.type('.title-input', '山居')
await p.click('.body-input')
const lines = ['空山新雨后', '天气晚来秋', '明月松间照', '清泉石上流']
for (let i = 0; i < lines.length; i++) {
  if (i) await p.keyboard.press('Enter')
  await p.type('.body-input', lines[i])
}
await new Promise(r => setTimeout(r, 500))
await p.screenshot({ path: out })
console.log('SHOT_OK ' + out)
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_CONSOLE_ERRORS')
await b.close()