import puppeteer from 'puppeteer-core'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'screenshots')
mkdirSync(shots, { recursive: true })

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  userDataDir: join(root, '.test-profile'),
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 1100 })

// —— 词库页：导入丰富词库后验证卡片垂直滚动 ——
await page.goto('http://localhost:5173/#/word-library', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 1000))
await page.click('[data-testid="import-open"]')
await new Promise((r) => setTimeout(r, 400))
const fileInput = await page.$('input[type="file"]')
await fileInput.uploadFile(join(root, 'word-library-rich.json'))
// 轮询等待「灯火」分类出现（导入完成）
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 500))
  const hasLamp = (await page.content()).includes('灯火')
  if (hasLamp) break
}
await new Promise((r) => setTimeout(r, 600))

// 找到「田园」分类卡片内词汇区，检查是否可上下滚动
const scrollInfo = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-testid="word-wall"] > div')]
  const info = []
  for (const c of cards.slice(0, 4)) {
    const name = c.querySelector('.font-display')?.textContent ?? ''
    const scroller = [...c.querySelectorAll('div')].find(
      (d) => d.scrollHeight > d.clientHeight && getComputedStyle(d).overflowY === 'auto',
    )
    info.push({
      cat: name.trim(),
      scrollable: !!scroller,
      scrollHeight: scroller ? scroller.scrollHeight : 0,
      clientHeight: scroller ? scroller.clientHeight : 0,
    })
  }
  return info
})
for (const s of scrollInfo) {
  console.log(`${s.cat}: scrollable=${s.scrollable} (${s.clientHeight}/${s.scrollHeight})`)
}
await page.screenshot({ path: join(shots, '09-library-scroll.png'), fullPage: false })
// 实际滚动一次，确认能滚动
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-testid="word-wall"] > div')]
  const c = cards[0]
  const scroller = [...c.querySelectorAll('div')].find(
    (d) => d.scrollHeight > d.clientHeight && getComputedStyle(d).overflowY === 'auto',
  )
  if (scroller) scroller.scrollTop = 300
})
await new Promise((r) => setTimeout(r, 300))
await page.screenshot({ path: join(shots, '10-library-scrolled.png') })

// —— 写作台：写作格式工具栏 ——
await page.goto('http://localhost:5173/#/write', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 1000))
await page.click('[data-testid="start-writing"]')
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: join(shots, '11-writing-toolbar.png') })

await browser.close()
console.log('done')
