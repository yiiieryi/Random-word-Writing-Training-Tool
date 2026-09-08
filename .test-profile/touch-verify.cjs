// 移动端触摸拖尾验证脚本：模拟手指滑动，对比滑动前后截图
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

  // 静止状态截图（对照）
  await page.screenshot({ path: 'E:\\vibecoding\\词雾\\.test-profile\\touch-before.png' })

  // 模拟手指按下并滑动（CDP 触摸事件）
  const client = await page.createCDPSession()
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y: 500 }] })
  await sleep(80)
  for (let i = 1; i <= 32; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 80 + i * 7, y: 500 + i * 5 }],
    })
    await sleep(16)
  }
  await sleep(120)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(400)

  // 滑动后截图（应能看到橙黄拖尾 + 粒子扰动）
  await page.screenshot({ path: 'E:\\vibecoding\\词雾\\.test-profile\\touch-after.png' })
  await browser.close()
  console.log('TOUCH-VERIFY-DONE')
})().catch((e) => {
  console.error('TOUCH-VERIFY-FAIL:', e.message)
  process.exit(1)
})
