import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-color-profile=srgb'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 400))
  const out = await page.evaluate(async () => {
    const ex = await import('/src/lib/export.ts')
    const cs = await import('/src/lib/cardStyle.ts')
    const tpl = await import('/src/lib/templates.ts')
    const poem = cs.makePoem({ source: 'qian', title: '山居', lines: [{ text: '空山新雨后' }, { text: '天气晚来秋' }, { text: '明月松间照' }, { text: '清泉石上流' }] })
    const style = cs.cloneStyle(tpl.templateById('shufu').style)
    style.seal.on = true
    const card = { id: 'x', poem, style, updatedAt: Date.now() }
    return await ex.cardToDataURL(card, 1.4)
  })
  const b64 = out.split(',')[1]
  fs.writeFileSync('D:/CodeProject/Poem/.shots/export-verify.png', Buffer.from(b64, 'base64'))
  console.log('SAVED export-verify.png bytes=', Buffer.from(b64, 'base64').length)
} finally { await browser.close() }