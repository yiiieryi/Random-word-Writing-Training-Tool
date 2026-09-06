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

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name} ${extra}`)
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function launch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--window-size=1280,960', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 920 },
  })
  const page = await browser.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`  [console.error] ${m.text()}`)
  })
  page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`))
  return { browser, page }
}

const wordsText = (card) =>
  page.$eval(`[data-testid="word-${card}"] .animate-word-swap`, (el) => el.textContent.trim())

let page, browser
let logs = ''

// ============ 会话 A：核心流程 ============
{
  const l = await launch()
  browser = l.browser
  page = l.page
  console.log('\n[会话 A] 写作台核心流程')

  await page.goto(`${BASE}/#/write`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('[data-testid="word-左"]', { timeout: 15000 })
  await sleep(600)

  // 1. 双词随机卡片有词
  const wl1 = await wordsText('左')
  const wr1 = await wordsText('右')
  check('随机卡片左右均有词汇', wl1.length > 0 && wr1.length > 0, `[${wl1} × ${wr1}]`)
  check('初始左右不同词', wl1 !== wr1, `[${wl1} vs ${wr1}]`)

  // 2. 收藏
  await page.click('[data-testid="fav-btn"]')
  await sleep(400)
  let collCount = await page.$$eval('[data-testid="collections"] > *', (e) => e.length)
  check('收藏后「我的词组」出现 1 条', collCount === 1, `count=${collCount}`)

  // 3. 单独随机左侧
  const lword0 = wl1
  await page.click('[data-testid="random-左"]')
  await sleep(450)
  const wl2 = await wordsText('左')
  check('单独随机后左侧词汇变化', wl2 !== lword0, `[${lword0} -> ${wl2}]`)

  // 3.5 分类选择：左侧选「田园」后随机只从该分类抽取
  await page.click('[data-testid="filter-左"]')
  await sleep(350)
  await page.click('[data-testid="filter-opt-左-田园"]')
  await sleep(500)
  const filterL = await page.$eval('[data-testid="filter-左"]', (el) => el.textContent.trim())
  check('左侧分类选择器显示「田园」', filterL.includes('田园'), `[${filterL}]`)
  const catBefore = await page.$eval('[data-testid="word-cat-左"]', (el) => el.textContent.trim())
  check('切换分类后立即从该分类抽取', catBefore === '田园', `[${catBefore}]`)
  await page.click('[data-testid="random-左"]')
  await sleep(450)
  const catAfter = await page.$eval('[data-testid="word-cat-左"]', (el) => el.textContent.trim())
  check('指定分类后重新随机仍在田园分类', catAfter === '田园', `[${catAfter}]`)
  // 恢复全部，避免影响后续断言
  await page.click('[data-testid="filter-左"]')
  await sleep(300)
  await page.click('[data-testid="filter-opt-左-all"]')
  await sleep(400)

  // 4. 全部重新随机
  await page.click('[data-testid="random-all"]')
  await sleep(450)
  const wl3 = await wordsText('左')
  const wr3 = await wordsText('右')
  check('全部重新随机后左右仍有词', wl3.length > 0 && wr3.length > 0)

  // 5. 写作：输入 + 字数
  const testContent = '今天的雾比往常更浓，街道在灯影里慢慢溶解。'
  await page.type('[data-testid="editor"]', testContent, { delay: 8 })
  await sleep(400)
  const cc = await page.$eval('[data-testid="char-count"]', (el) => el.textContent)
  const ccNum = parseInt(cc, 10)
  check('字数统计正确', ccNum === Array.from(testContent).length, `[${cc}] 期望 ${Array.from(testContent).length}`)

  // 6. 草稿自动保存 + 刷新恢复（防抖 650ms 后落盘）
  await sleep(1400)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="editor"]', { timeout: 15000 })
  await sleep(900)
  const restored = await page.$eval('[data-testid="editor"]', (el) => el.value)
  check('刷新后草稿自动恢复', restored === testContent, `[${restored.slice(0, 20)}...]`)
  const cardL = await wordsText('左')
  check('刷新后随机卡片从草稿词组恢复显示', cardL !== '·', `[${cardL}]`)

  // 6.5 Tab 键缩进
  await page.focus('[data-testid="editor"]')
  await page.keyboard.press('Tab')
  await sleep(300)
  const tabVal = await page.$eval('[data-testid="editor"]', (el) => el.value)
  check('Tab 键在文本区插入缩进', tabVal.includes('\t'), `[${JSON.stringify(tabVal.slice(0, 14))}]`)

  // 7. 保存作品（自动生成标题）+ 历史出现
  const pairL = await wordsText('左')
  const pairR = await wordsText('右')
  const pair = `${pairL} × ${pairR}`
  await page.click('[data-testid="save-btn"]')
  await sleep(600)
  const histCount = await page.$$eval('[data-testid="history"] > *', (e) => e.length)
  check('保存后历史写作出现 1 篇', histCount === 1, `count=${histCount}`)
  const firstTitle = await page.$eval('[data-testid="history"] article h3', (el) => el.textContent.trim())
  const autoTitle = pair.replace(/\s+/g, '').replace('×', '与')
  check('自动生成标题（雾气与惆怅）', firstTitle.includes('与'), `[${firstTitle}] pair=[${pair}]`)

  await page.screenshot({ path: join(shots, '01-home.png'), fullPage: true })
  await page.screenshot({ path: join(shots, '02-home-viewport.png') })

  // 8. 导航到词库
  await page.goto(`${BASE}/#/word-library`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="word-wall"]', { timeout: 15000 })
  await sleep(500)
  const catCount = await page.$$eval('[data-testid="word-wall"] > *', (e) => e.length)
  check('词库墙显示 8 个原生分类', catCount === 8, `count=${catCount}`)
  await page.screenshot({ path: join(shots, '03-word-library.png'), fullPage: true })

  // 9. 编辑模式 + 新增词汇 + 查重
  await page.click('[data-testid="edit-toggle"]')
  await sleep(400)
  await page.evaluate(() => {
    const first = document.querySelector('[data-testid="word-wall"] > *')
    const addBtn = [...first.querySelectorAll('button')].find((b) => b.textContent.includes('添加词汇'))
    addBtn.click()
  })
  await sleep(300)
  const newWord = '测试词'
  await page.keyboard.type(newWord)
  await page.keyboard.press('Enter')
  await sleep(700)
  const toasts1 = await page.$$eval('.animate-toast-in', (els) => els.map((e) => e.textContent))
  check('新增词汇成功提示', toasts1.some((t) => t.includes('已添加')), `[${toasts1.join(' | ')}]`)

  // 查重（读取最新 toast 集合）
  await page.evaluate(() => {
    const first = document.querySelector('[data-testid="word-wall"] > *')
    const addBtn = [...first.querySelectorAll('button')].find((b) => b.textContent.includes('添加词汇'))
    addBtn.click()
  })
  await sleep(300)
  await page.keyboard.type(newWord)
  await page.keyboard.press('Enter')
  await sleep(700)
  const toasts2 = await page.$$eval('.animate-toast-in', (els) => els.map((e) => e.textContent))
  check('重复词汇被拒绝（这个词已经存在）', toasts2.some((t) => t.includes('已经存在')), `[${toasts2.join(' | ')}]`)

  await page.screenshot({ path: join(shots, '04-library-edit.png'), fullPage: true })

  // 9.5 文本粘贴导入新分类
  await page.click('[data-testid="import-open"]')
  await sleep(350)
  await page.type('[data-testid="import-text"]', '{"测试导入分类":["甲","乙","丙"]}', { delay: 5 })
  await page.click('[data-testid="import-submit"]')
  await sleep(800)
  const bodyHasCat = (await page.content()).includes('测试导入分类')
  check('文本粘贴导入新分类成功', bodyHasCat)

  // 10. 系统设置
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.body.textContent.includes('文稿备份'),
    { timeout: 10000 },
  ).catch(() => {})
  await sleep(500)
  await page.screenshot({ path: join(shots, '05-settings.png'), fullPage: true })
  const hasSettings = (await page.content()).includes('文稿备份')
  check('系统设置页面渲染', hasSettings)

  logs = ''
  await browser.close()
}

// ============ 会话 B：重新打开浏览器（同一 profile）验证持久化 ============
{
  console.log('\n[会话 B] 关闭并重新打开浏览器，验证数据持久化')
  const l = await launch()
  browser = l.browser
  page = l.page

  await page.goto(`${BASE}/#/write`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('[data-testid="collections"]', { timeout: 15000 })
  await sleep(800)

  // 收藏仍在
  const collCount = await page.$$eval('[data-testid="collections"] > *', (e) => e.length)
  check('收藏词组在重启后仍存在', collCount >= 1, `count=${collCount}`)

  // 历史文章仍在
  const histCount = await page.$$eval('[data-testid="history"] > *', (e) => e.length)
  check('历史文章在重启后仍存在', histCount >= 1, `count=${histCount}`)

  // 历史可打开继续编辑
  await page.click('[data-testid="history"] article')
  await sleep(700)
  const editorVal = await page.$eval('[data-testid="editor"]', (el) => el.value)
  check('点击历史文章可继续编辑', editorVal.includes('雾比往常更浓'), `[${editorVal.slice(0, 16)}...]`)

  // 词库持久化：自定义新增词仍在
  await page.goto(`${BASE}/#/word-library`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="word-wall"]', { timeout: 15000 })
  const bodyHasTest = (await page.content()).includes('测试词')
  check('自定义新增词汇在重启后仍存在', bodyHasTest)

  await browser.close()
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
