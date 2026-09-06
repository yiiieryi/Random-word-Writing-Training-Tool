import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Feather } from 'lucide-react'
import { db } from '../db/db'
import Logo from '../components/Logo'
import { useToast } from '../hooks/useToast'
import { buildSources, type MistSources, type MistWord } from '../lib/mist'

/** 雾中的一粒词：静止直到被鼠标扰动 */
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  depth: number
  alphaBase: number
  alpha: number
  fading: boolean
  word: string
  meta: MistWord | null
  morphAt: number
  rotate: number
}

/** 从词雾来源中随机取一粒词 */
function pickWord(sources: MistSources, exclude?: string): { text: string; meta: MistWord | null } {
  const fromW = sources.writingWords
  const lib = sources.library
  if (fromW.length > 0 && Math.random() < 0.55) {
    const pool = exclude ? fromW.filter((x) => x.text !== exclude) : fromW
    const src = pool.length > 0 ? pool : fromW
    const m = src[Math.floor(Math.random() * src.length)]
    return { text: m.text, meta: m }
  }
  const valid = exclude ? lib.filter((x) => x !== exclude) : lib
  const src = valid.length > 0 ? valid : lib
  const word = src[Math.floor(Math.random() * src.length)] ?? fromW[0]?.text ?? '雾'
  return { text: word, meta: null }
}

/** 词雾首页：浅白灰底 + 黑灰字；默认静止，鼠标移动才扰动；点击文字直接选定进入写作区，点击空白进入写作区自动抽词 */
export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const writings = useLiveQuery(() => db.writings.toArray(), [])
  const words = useLiveQuery(() => db.words.toArray(), [])
  const sources = useMemo(() => buildSources(writings, words), [writings, words])

  const poolsRef = useRef<MistSources | null>(null)
  const refreshRef = useRef<((initial: boolean) => void) | null>(null)

  // 词池实时更新
  useEffect(() => {
    if (!sources) return
    const first = poolsRef.current === null
    poolsRef.current = sources
    refreshRef.current?.(first)
  }, [sources])

  /** 随机词生成器：只从词库取词（用于点击词库单词时搭配第二个词） */
  const pickLibWordRef = useRef<(exclude?: string) => string>(() => '')
  useEffect(() => {
    pickLibWordRef.current = (exclude?: string) => {
      const lib = poolsRef.current?.library ?? []
      const valid = exclude ? lib.filter((x) => x !== exclude) : lib
      const src = valid.length > 0 ? valid : lib
      return src[Math.floor(Math.random() * src.length)] ?? ''
    }
  }, [sources])

  /** 把词组写入草稿，供写作台刷新后恢复 */
  const persistPair = useCallback(async (a: string, b: string) => {
    const pair = `${a} × ${b}`
    const d = await db.drafts.get(1)
    if (d) {
      await db.drafts.update(1, { wordPair: pair })
    } else {
      await db.drafts.put({ id: 1, title: '', content: '', wordPair: pair, updatedAt: Date.now() })
    }
  }, [])

  /** 点击文稿短语：沿用其练习词组进入写作区 */
  const useWritingDefault = useCallback(
    (m: MistWord) => {
      const parts = (m.pair || '').split('×').map((s) => s.trim())
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        toast('这篇文稿还没有练习词组', 'info')
        return
      }
      const pair = `${parts[0]} × ${parts[1]}`
      void persistPair(parts[0], parts[1])
      toast(`沿用《${m.title}》的练习词组「${pair}」`, 'info')
      navigate('/write', { state: { wordPair: pair } })
    },
    [navigate, persistPair, toast],
  )

  /** 点击词库单词：直接选定该词，搭配另一个词库词进入写作区 */
  const useSingleWord = useCallback(
    (word: string) => {
      let second = pickLibWordRef.current(word)
      if (!second) second = word
      const pair = `${word} × ${second}`
      void persistPair(word, second)
      toast(`已选定「${word}」`, 'info')
      navigate('/write', { state: { wordPair: pair } })
    },
    [navigate, persistPair, toast],
  )

  // Canvas 回调通过 ref 暴露
  const useWritingDefaultRef = useRef(useWritingDefault)
  useWritingDefaultRef.current = useWritingDefault
  const useSingleWordRef = useRef(useSingleWord)
  useSingleWordRef.current = useSingleWord

  // ============ 词雾 Canvas 动效 ============
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const particles: Particle[] = []
    const mouse = { x: -9999, y: -9999, px: -9999, py: -9999 }
    const trail: { x: number; y: number; a: number }[] = []
    let hovered: Particle | null = null
    let hoverKey = ''
    let lastMoveTime = -999999
    const ACTIVE_WINDOW = 1800

    const randWord = (exclude?: string): { text: string; meta: MistWord | null } => {
      const s = poolsRef.current
      if (!s) return { text: '雾', meta: null }
      return pickWord(s, exclude)
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const count = Math.max(44, Math.min(110, Math.round((w * h) / 15000)))
    for (let i = 0; i < count; i++) {
      const depth = Math.random()
      const r = randWord()
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        size: 13 + depth * 25 + Math.random() * 4,
        depth,
        alphaBase: 0.12 + depth * 0.3 + Math.random() * 0.08,
        alpha: Math.random() * 0.3,
        fading: false,
        word: r.text,
        meta: r.meta,
        morphAt: performance.now() + Math.random() * 2400,
        rotate: (Math.random() - 0.5) * 0.6,
      })
    }

    const frame = (now: number) => {
      const active = now - lastMoveTime < ACTIVE_WINDOW
      ctx.clearRect(0, 0, w, h)

      // 鼠标光晕：橙黄渐变（暖橘橙中心→落日熔金边缘），高透
      if (active && mouse.x > -1000) {
        ctx.globalCompositeOperation = 'multiply'
        const cg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 40)
        cg.addColorStop(0, 'rgba(255,155,84,0.18)') // 暖橘橙
        cg.addColorStop(1, 'rgba(255,208,127,0)') // 落日熔金透明
        ctx.fillStyle = cg
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 40, 0, Math.PI * 2)
        ctx.fill()
        // 拖尾：橙黄渐变
        const TRAIL = [
          [255, 155, 84], // 暖橘橙（最新）
          [255, 184, 102], // 橙金
          [255, 208, 127], // 落日熔金（最旧）
        ]
        for (let i = 0; i < trail.length; i++) {
          const t = trail[i]
          t.a *= 0.9
          const ratio = trail.length > 1 ? i / (trail.length - 1) : 1
          const ci = Math.min(TRAIL.length - 1, Math.max(0, Math.floor((1 - ratio) * (TRAIL.length - 1))))
          const [sr, sg, sb] = TRAIL[ci]
          const rad = 6 + i * 1.2
          const tg = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rad)
          tg.addColorStop(0, `rgba(${sr},${sg},${sb},${Math.min(0.14, t.a)})`)
          tg.addColorStop(1, `rgba(${sr},${sg},${sb},0)`)
          ctx.fillStyle = tg
          ctx.beginPath()
          ctx.arc(t.x, t.y, rad, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      for (const p of particles) {
        const isHovered = p === hovered

        if (active) {
          p.x += p.vx
          p.y += p.vy
          if (!isHovered) {
            const dx = p.x - mouse.x
            const dy = p.y - mouse.y
            const dist = Math.hypot(dx, dy)
            const R = 150
            if (dist < R && dist > 0.001) {
              const f = (1 - dist / R) * 0.45
              p.vx += (dx / dist) * f * 0.4
              p.vy += (dy / dist) * f * 0.4
              p.vx += (-dy / dist) * f * 0.35
              p.vy += (dx / dist) * f * 0.35
            }
          }
          p.vx *= 0.955
          p.vy *= 0.955
          const sp = Math.hypot(p.vx, p.vy)
          if (sp > 0.5) {
            p.vx = (p.vx / sp) * 0.5
            p.vy = (p.vy / sp) * 0.5
          }
          const m = 60
          if (p.x < -m) p.x = w + m
          else if (p.x > w + m) p.x = -m
          if (p.y < -m) p.y = h + m
          else if (p.y > h + m) p.y = -m

          if (!isHovered) {
            if (now >= p.morphAt && !p.fading) p.fading = true
            if (p.fading) {
              p.alpha -= 0.025
              if (p.alpha <= 0.02) {
                const r = randWord(p.word)
                p.word = r.text
                p.meta = r.meta
                p.morphAt = now + 2500 + Math.random() * 4000
                p.fading = false
              }
            } else {
              p.alpha += (p.alphaBase - p.alpha) * 0.055
            }
          } else {
            const target = p.meta ? Math.min(0.95, p.alphaBase + 0.25) : p.alphaBase
            p.alpha += (target - p.alpha) * 0.15
          }
        } else {
          p.vx *= 0.9
          p.vy *= 0.9
          if (now >= p.morphAt) p.morphAt = now + 1500 + Math.random() * 3500
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotate)
        ctx.font = `${p.size}px "Songti SC","STSong","SimSun","Georgia",serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const brightness = p.meta
          ? Math.min(0.92, p.alpha + 0.25)
          : Math.max(0.06, Math.min(0.55, p.alpha))
        ctx.shadowColor = `rgba(0,0,0,${p.meta ? 0.12 : 0.06})`
        ctx.shadowBlur = p.depth * 6 + (p.meta ? 3 : 0)
        ctx.fillStyle = `rgba(35,35,35,${brightness})`
        ctx.fillText(p.word, 0, 0)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const updateTooltip = () => {
      const tip = tooltipRef.current
      if (!hovered?.meta) {
        if (tip) tip.style.opacity = '0'
        canvas.style.cursor = hovered ? 'pointer' : 'default'
        hoverKey = ''
        return
      }
      canvas.style.cursor = 'pointer'
      const key = `${hovered.meta.writingId}|${hovered.word}`
      if (tip) {
        if (key !== hoverKey) {
          hoverKey = key
          tip.replaceChildren()
          const t1 = document.createElement('div')
          t1.className = 'truncate max-w-[220px] text-xs text-black/80'
          t1.textContent = `《${hovered.meta.title}》`
          const t2 = document.createElement('div')
          t2.className = 'mt-0.5 text-[11px] tracking-[0.08em] text-black/45'
          t2.textContent = hovered.meta.pair || '（无练习词组）'
          tip.append(t1, t2)
        }
        tip.style.opacity = '1'
        tip.style.transform = `translate(${mouse.x + 16}px, ${mouse.y + 16}px)`
      }
    }

    const onMove = (e: MouseEvent) => {
      mouse.px = mouse.x
      mouse.py = mouse.y
      mouse.x = e.clientX
      mouse.y = e.clientY
      lastMoveTime = performance.now()
      trail.push({ x: mouse.x, y: mouse.y, a: 0.4 })
      if (trail.length > 24) trail.shift()

      let best: Particle | null = null
      let bestD = Infinity
      for (const p of particles) {
        const dd = Math.hypot(p.x - mouse.x, p.y - mouse.y)
        const thr = Math.max(p.size * 0.72, 26)
        if (dd < thr && dd < bestD) {
          best = p
          bestD = dd
        }
      }
      if (hovered) {
        const dd = Math.hypot(hovered.x - mouse.x, hovered.y - mouse.y)
        const keepThr = Math.max(hovered.size * 1.4, 48)
        if (dd < keepThr) best = hovered
      }
      hovered = best
      updateTooltip()
    }
    window.addEventListener('mousemove', onMove)

    /**
     * 点击逻辑：
     * - 点击文稿短语 → 沿用其练习词组进入写作区
     * - 点击词库单词 → 直接选定该词进入写作区
     * - 点击空白区 → 进入写作区并自动随机抽词
     */
    const onClick = () => {
      if (hovered?.meta) {
        useWritingDefaultRef.current(hovered.meta)
      } else if (hovered) {
        useSingleWordRef.current(hovered.word)
      } else {
        navigate('/write', { state: { autoPick: true } })
      }
    }
    canvas.addEventListener('click', onClick)

    refreshRef.current = (initial: boolean) => {
      for (const p of particles) {
        if (initial) {
          const r = randWord()
          p.word = r.text
          p.meta = r.meta
          p.alpha = p.alphaBase
        } else {
          p.morphAt = performance.now() + Math.random() * 1200
        }
      }
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      refreshRef.current = null
    }
  }, [navigate])

  return (
    <div
      data-testid="mist-page"
      className="relative h-screen w-screen select-none overflow-hidden bg-[#f1f1ee] text-black"
    >
      <canvas
        ref={canvasRef}
        data-testid="mist-canvas"
        className="absolute inset-0 cursor-default"
        aria-label="词雾首页：移动鼠标拨动词雾，点击文字直接选定进入写作区，点击空白区进入写作区自动抽词"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.05) 100%)',
        }}
      />

      {/* 顶部：品牌 + 写作台入口 */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/write" className="flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100">
          <Logo size={24} />
          <span className="font-display text-lg tracking-[0.16em] text-black/75">词雾</span>
        </Link>
        <Link
          to="/write"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-black/[0.04] px-4 py-1.5 text-sm text-black/55 backdrop-blur-sm transition-colors hover:border-black/35 hover:text-black"
        >
          <Feather size={14} />
          写作台
        </Link>
      </div>

      {/* 文稿词悬停提示 */}
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed left-0 top-0 z-40 rounded-xl border border-black/10 bg-white/85 px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-opacity duration-150"
        style={{ opacity: 0 }}
      />
    </div>
  )
}
