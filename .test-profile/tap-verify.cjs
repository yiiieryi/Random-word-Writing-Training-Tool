// 移动端点击验证：模拟手指 tap 空白处，应跳转到 /write
const puppeteer = require('puppeteer-core')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' })
  await sleep(1500)

  const client = await page.createCDPSession()
  // tap 屏幕中间（避开文字和导航的空白处概率较高，若命中词则进写作区也符合预期）
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420 }] })
  await sleep(60)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(900)

  console.log('URL-AFTER-TAP:', page.url())
  await browser.close()
})().catch((e) => {
  console.error('TAP-VERIFY-FAIL:', e.message)
  process.exit(1)
})
