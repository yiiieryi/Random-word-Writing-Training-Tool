import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { db, type Collection, type Writing } from '../db/db'
import { useWritingDraft } from '../hooks/useWritingDraft'
import { useToast } from '../hooks/useToast'
import WordCards, { type WordPair } from '../components/WordCards'
import Collections from '../components/Collections'
import WritingSection from '../components/WritingSection'
import HistorySection from '../components/HistorySection'
import EmptyState from '../components/EmptyState'

export default function Home() {
  const writing = useWritingDraft()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [])
  const allWords = useLiveQuery(() => db.words.toArray(), [])
  const ready = !!categories && !!allWords

  const [pair, setPair] = useState<WordPair | null>(null)
  // 标记已从路由状态设定词组（首页点击词/空白自动抽词），阻止首屏自动抽词覆盖
  const appliedFromState = useRef(false)
  // 左右卡片的抽取分类（null = 全部）
  const [leftFilter, setLeftFilter] = useState<string | null>(null)
  const [rightFilter, setRightFilter] = useState<string | null>(null)
  // 最近出现过的词汇池：随机时优先避开，避免重复
  const recentWords = useRef<string[]>([])
  // 最近生成过的词组（无序组合 key）：避免左右颠倒的重复搭配
  const recentPairs = useRef<string[]>([])

  const categoryNames = useMemo(
    () => (categories ?? []).map((c) => c.name),
    [categories],
  )

  /** 主事件：滚动到写作区并聚焦编辑器 */
  const startWriting = useCallback(() => {
    document.getElementById('writing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('[data-testid="editor"]')?.focus()
    }, 550)
  }, [])

  const pickOne = useCallback(
    (opts: { exclude?: string; category?: string | null } = {}): { word: string; category: string } | null => {
      const { exclude, category } = opts
      if (!categories || !allWords || allWords.length === 0) return null
      const catName = new Map(categories.map((c) => [c.id!, c.name]))
      let entries = allWords
        .map((w) => ({ word: w.text, category: catName.get(w.categoryId) ?? '' }))
        .filter((e) => e.category)
      if (category) entries = entries.filter((e) => e.category === category)
      if (entries.length === 0) return null // 所选分类暂无词汇
      const recentSet = new Set(recentWords.current)
      // 优先：避开最近出现过的词与对侧词
      let pool = entries.filter((e) => e.word !== exclude && !recentSet.has(e.word))
      if (pool.length === 0) pool = entries.filter((e) => e.word !== exclude)
      if (pool.length === 0) pool = entries
      const picked = pool[Math.floor(Math.random() * pool.length)]
      recentWords.current = [
        ...recentWords.current.filter((w) => w !== picked.word),
        picked.word,
      ].slice(-20)
      return picked
    },
    [categories, allWords],
  )

  const applyPair = useCallback(
    (p: WordPair) => {
      setPair(p)
      writing.setWordPair(`${p.left.word} × ${p.right.word}`)
    },
    [writing],
  )

  const randomPair = useCallback(() => {
    const left = pickOne({ category: leftFilter })
    if (!left) {
      if (leftFilter) {
        toast(`「${leftFilter}」暂无词汇，已改为全部`, 'info')
        setLeftFilter(null)
      }
      const l = pickOne()
      if (!l) {
        setPair(null)
        return
      }
      const r = pickOne({ exclude: l.word }) ?? l
      applyPair({ left: l, right: r })
      return
    }
    // 组合去重：避免近期出现过的无序搭配（含左右颠倒）
    let right =
      pickOne({ exclude: left.word, category: rightFilter }) ??
      pickOne({ category: rightFilter }) ??
      left
    let guard = 0
    while (guard++ < 6 && right.word !== left.word) {
      const key = [left.word, right.word].sort().join('|')
      if (!recentPairs.current.includes(key)) break
      right =
        pickOne({ exclude: left.word, category: rightFilter }) ??
        pickOne({ category: rightFilter }) ??
        left
    }
    if (right.word !== left.word) {
      const key = [left.word, right.word].sort().join('|')
      recentPairs.current = [
        ...recentPairs.current.filter((k) => k !== key),
        key,
      ].slice(-16)
    }
    applyPair({ left, right })
  }, [pickOne, leftFilter, rightFilter, applyPair, toast])

  const randomLeft = useCallback(() => {
    if (!pair) {
      randomPair()
      return
    }
    const left = pickOne({ category: leftFilter })
    if (left) applyPair({ left, right: pair.right })
  }, [pair, pickOne, leftFilter, applyPair, randomPair])

  const randomRight = useCallback(() => {
    if (!pair) {
      randomPair()
      return
    }
    const right =
      pickOne({ exclude: pair.left.word, category: rightFilter }) ??
      pickOne({ category: rightFilter }) ??
      pair.left
    applyPair({ left: pair.left, right })
  }, [pair, pickOne, rightFilter, applyPair, randomPair])

  const changeFilter = useCallback(
    (side: '左' | '右', cat: string | null) => {
      if (side === '左') {
        setLeftFilter(cat)
        if (!pair) return
        const left = pickOne({ category: cat })
        if (left) {
          applyPair({ left, right: pair.right })
        } else if (cat) {
          toast(`「${cat}」暂无词汇`, 'info')
        }
      } else {
        setRightFilter(cat)
        if (!pair) return
        const right =
          pickOne({ exclude: pair.left.word, category: cat }) ??
          pickOne({ category: cat }) ??
          pair.left
        if (right.word !== pair.left.word) {
          applyPair({ left: pair.left, right })
        } else if (cat) {
          toast(`「${cat}」暂无词汇`, 'info')
        }
      }
    },
    [pair, pickOne, applyPair, toast],
  )

  // 首次进入：若没有草稿语境，且未从路由状态设定词组，则自动随机一对
  useEffect(() => {
    if (writing.loaded && ready && !writing.wordPair && !appliedFromState.current) {
      randomPair()
    }
  }, [writing.loaded, ready, writing.wordPair, randomPair])

  // 来自词雾首页抽取的词组：直接应用为当前灵感，滚动到写作区并聚焦编辑器
  useEffect(() => {
    if (!ready) return
    const sp = (location.state as { wordPair?: string } | null)?.wordPair
    if (!sp) return
    const [a, b] = sp.split('×').map((s: string) => s.trim())
    if (a && b) {
      applyPair({ left: { word: a, category: '' }, right: { word: b, category: '' } })
      appliedFromState.current = true
      navigate('/write', { replace: true, state: null })
      window.setTimeout(() => startWriting(), 350)
    }
  }, [ready, location.state, applyPair, navigate, startWriting])

  // 来自首页空白点击：进入写作页顶部词组抽取区，自动随机一对词，停留在顶部供用户确认/重抽后手动点开始写作
  useEffect(() => {
    if (!ready) return
    const auto = (location.state as { autoPick?: boolean } | null)?.autoPick
    if (!auto) return
    appliedFromState.current = true
    randomPair()
    navigate('/write', { replace: true, state: null })
    window.scrollTo({ top: 0 })
  }, [ready, location.state, randomPair, navigate])

  // 刷新后从草稿词组恢复卡片显示，保持视觉一致
  useEffect(() => {
    if (!writing.loaded || !ready || pair || !writing.wordPair) return
    const [a, b] = writing.wordPair.split('×').map((s: string) => s.trim())
    if (a && b) setPair({ left: { word: a, category: '' }, right: { word: b, category: '' } })
  }, [writing.loaded, ready, pair, writing.wordPair])

  const favorite = async () => {
    if (!pair) return
    const key = [pair.left.word, pair.right.word].sort().join('|')
    // 无序去重：左右顺序不同的相同词组视为同一词组
    const existing = await db.collections.toArray()
    if (existing.some((c) => [c.wordA, c.wordB].sort().join('|') === key)) {
      toast('该词组已收藏', 'info')
      return
    }
    await db.collections.add({
      wordA: pair.left.word,
      categoryA: pair.left.category,
      wordB: pair.right.word,
      categoryB: pair.right.category,
      createdAt: Date.now(),
    })
    toast(`已加入收藏「${pair.left.word} × ${pair.right.word}」`)
  }

  const pickCollection = (c: Collection) => {
    const p: WordPair = {
      left: { word: c.wordA, category: c.categoryA },
      right: { word: c.wordB, category: c.categoryB },
    }
    applyPair(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast(`今日灵感「${c.wordA} × ${c.wordB}」`, 'info')
  }

  const openWriting = (w: Writing) => {
    writing.open(w)
    if (w.wordPair) {
      const [a, b] = w.wordPair.split('×').map((s: string) => s.trim())
      if (a && b) {
        setPair({ left: { word: a, category: '' }, right: { word: b, category: '' } })
      }
    }
    window.scrollTo({ top: document.getElementById('writing')?.offsetTop ?? 0, behavior: 'smooth' })
  }

  const onDeleted = (id: number) => {
    if (writing.editingId === id) {
      writing.setEditingId(null)
      toast('已删除，编辑器已重置', 'info')
    }
  }

  const libraryEmpty = ready && allWords.length === 0

  return (
    <div className="space-y-14">
      {/* 双词灵感 */}
      <section aria-label="双词灵感">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={15} className="text-accent" />
          <span className="section-label">双词灵感 · 随机碰撞</span>
        </div>
        {libraryEmpty ? (
          <EmptyState
            icon={<Sparkles size={22} />}
            title="词库还是空的"
            desc="先到「词组管理」添加词汇，就能开始随机碰撞了。"
            action={
              <Link to="/word-library" className="btn btn-primary">
                去添加词汇
              </Link>
            }
          />
        ) : (
          <WordCards
            pair={pair}
            categories={categoryNames}
            leftFilter={leftFilter}
            rightFilter={rightFilter}
            onFilterChange={changeFilter}
            onRandomAll={randomPair}
            onRandomLeft={randomLeft}
            onRandomRight={randomRight}
            onFavorite={favorite}
            onStartWriting={startWriting}
          />
        )}
      </section>

      {/* 我的词组 */}
      <section aria-label="我的词组">
        <div className="mb-4 flex items-center gap-2">
          <span className="section-label">我的词组</span>
        </div>
        <Collections onPick={pickCollection} />
      </section>

      {/* 长篇写作 */}
      <section id="writing" aria-label="开始写作" className="scroll-mt-24">
        <WritingSection w={writing} />
      </section>

      {/* 历史写作 */}
      <section aria-label="历史写作">
        <HistorySection onOpen={openWriting} onDeleted={onDeleted} />
      </section>
    </div>
  )
}
