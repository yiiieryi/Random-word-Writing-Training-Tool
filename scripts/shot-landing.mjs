import puppeteer from 'puppeteer-core'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

/**
 * 词雾首页截图：先在本地写入一篇示例文稿，再进入首页，
 * 验证「已保存文稿的文字 → 随机变幻词雾 → 鼠标滑动/点击抽取词组」。
 * 用法：先跑 scripts/verify.mjs（生成文稿数据），再跑本脚本。
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'screenshots')
mkdirSync(shots, { recursive: true })

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  userDataDir: join(root, '.test-profile'),
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 880 })
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`))

// 先保证词库已初始化，并写入一篇示例文稿（供词雾取字）
await page.goto('http://localhost:5173/#/write', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('[data-testid="editor"]', { timeout: 15000 })
await page.evaluate(async () => {
  const hasWriting = await window.indexedDB
  void hasWriting
  const req = indexedDB.open('wordspark')
  const writingCount = await new Promise((resolve) => {
    req.onsuccess = () => {
      const d = req.result
      const tx = d.transaction('writings', 'readonly')
      const countReq = tx.objectStore('writings').count()
      countReq.onsuccess = () => resolve(countReq.result)
      countReq.onerror = () => resolve(0)
    }
    req.onerror = () => resolve(0)
  })
  if (writingCount === 0) {
    // 通过 Dexie 全局不可达，直接用 IndexedDB 写入一条示例文稿
    const open = indexedDB.open('wordspark')
    await new Promise((resolve, reject) => {
      open.onsuccess = () => {
        const d = open.result
        const tx = d.transaction('writings', 'readwrite')
        tx.objectStore('writings').add({
          title: '晨雾里的城市',
          content:
            '晨雾沿着街道缓缓流淌，路灯在雾气里融成柔软的光团。早起的摊贩掀开蒸笼，白汽与雾混在一起，分不清哪一缕是人间烟火。',
          wordPair: '晨雾 × 街灯',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        tx.oncomplete = () => resolve(undefined)
        tx.onerror = (e) => reject(e)
      }
      open.onerror = (e) => reject(e)
    })
  }
})
await new Promise((r) => setTimeout(r, 600))

// 进入词雾首页
await page.goto('http://localhost:5173/#/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('[data-testid="mist-canvas"]', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 1500))

// 鼠标滑动搅动词雾（触发附近词变幻 + 拖尾微光）
await page.mouse.move(260, 280, { steps: 10 })
await page.mouse.move(620, 460, { steps: 16 })
await page.mouse.move(900, 300, { steps: 14 })
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: join(shots, '13-landing-mist.png') })

// 点击触发随机选取词组流程（轮换中）
await page.click('[data-testid="mist-pick"]')
await new Promise((r) => setTimeout(r, 620))
await page.screenshot({ path: join(shots, '14-landing-picking.png') })

// 双词锁定
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: join(shots, '15-landing-locked.png') })

await browser.close()
console.log('done')
