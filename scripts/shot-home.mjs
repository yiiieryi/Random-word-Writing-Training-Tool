import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const shots = join(root, 'screenshots')
mkdirSync(shots, { recursive: true })

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:5173'
const PROFILE = join(root, '.test-profile')
rmSync(PROFILE, { recursive: true, force: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: PROFILE,
  args: ['--no-sandbox', '--window-size=1280,960', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1280, height: 920 },
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`))

await page.goto(`${BASE}/#/write`, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForSelector('[data-testid="word-左"]', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 900))

// 大按钮与主操作区检查
const btnTexts = await page.$$eval('button', (btns) => btns.map((b) => b.textContent.trim()).filter(Boolean))
console.log('含「重新随机」按钮:', btnTexts.some((t) => t.includes('重新随机')))
console.log('含「开始写作」按钮:', btnTexts.some((t) => t.includes('开始写作')))

await page.screenshot({ path: join(shots, '06-home-focus.png'), fullPage: true })

// 点击「开始写作」→ 应滚动到写作区并聚焦编辑器
await page.click('[data-testid="start-writing"]')
await new Promise((r) => setTimeout(r, 1200))
const editorFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
console.log('点击后聚焦的元素:', editorFocused)
const scrollY = await page.evaluate(() => window.scrollY)
console.log('滚动位置 scrollY:', scrollY)

await page.screenshot({ path: join(shots, '07-home-after-start.png') })

await browser.close()
console.log('done')
