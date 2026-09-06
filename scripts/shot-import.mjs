import puppeteer from 'puppeteer-core'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'screenshots')
mkdirSync(shots, { recursive: true })

const chrome =
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  userDataDir: join(root, '.test-profile'),
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 1000 })
await page.goto('http://localhost:5173/#/word-library', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 1200))

// 打开批量导入面板，展开示范与提示词
await page.click('[data-testid="import-open"]')
await new Promise((r) => setTimeout(r, 500))
const clickByText = async (t) => {
  await page.evaluate((text) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text))
    if (btn) btn.click()
  }, t)
  await new Promise((r) => setTimeout(r, 350))
}
await clickByText('查看示范')
await clickByText('AI 生成提示词')
await page.screenshot({ path: join(shots, '08-import-panel.png') })

await browser.close()
console.log('done')
