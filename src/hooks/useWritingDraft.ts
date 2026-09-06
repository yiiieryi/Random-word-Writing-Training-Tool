import { useCallback, useEffect, useRef, useState } from 'react'
import { db, type Writing } from '../db/db'
import { formatDate } from '../utils/format'

/** 自动生成标题：词 A 与 词 B；无词对时用日期兜底 */
function autoTitle(pair: string): string {
  const parts = pair.split('×').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 2) return `${parts[0]}与${parts[1]}`
  if (parts.length === 1) return parts[0]
  return `${formatDate(Date.now())} · 随笔`
}

export interface WritingDraft {
  title: string
  setTitle: (v: string) => void
  content: string
  setContent: (v: string) => void
  wordPair: string
  setWordPair: (v: string) => void
  editingId: number | null
  setEditingId: (v: number | null) => void
  loaded: boolean
  /** 载入一篇已有作品继续编辑 */
  open: (w: Writing) => void
  /** 保存作品（新增或更新），返回最终标题 */
  save: () => Promise<string>
}

/**
 * 写作编辑器状态 + 草稿自动保存。
 * - 停止输入约 650ms 后自动写入 IndexedDB 草稿
 * - 切页 / 刷新前尽力落盘
 * - 用脏标记避免「空状态」覆盖已保存草稿（含 StrictMode 双挂载场景）
 */
export function useWritingDraft(): WritingDraft {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [wordPair, setWordPair] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const latest = useRef({ title, content, wordPair, editingId, loaded })
  latest.current = { title, content, wordPair, editingId, loaded }

  const dirtyRef = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const markDirty = useCallback(() => {
    dirtyRef.current = true
  }, [])

  const setTitleSafe = useCallback(
    (v: string) => {
      markDirty()
      setTitle(v)
    },
    [markDirty],
  )
  const setContentSafe = useCallback(
    (v: string) => {
      markDirty()
      setContent(v)
    },
    [markDirty],
  )
  const setWordPairSafe = useCallback(
    (v: string) => {
      markDirty()
      setWordPair(v)
    },
    [markDirty],
  )
  const setEditingIdSafe = useCallback(
    (v: number | null) => {
      markDirty()
      setEditingId(v)
    },
    [markDirty],
  )

  const flushDraft = useCallback(async () => {
    const s = latest.current
    if (!dirtyRef.current) return // 无改动时不覆盖草稿
    await db.drafts.put({
      id: 1,
      title: s.title,
      content: s.content,
      wordPair: s.wordPair,
      editingId: s.editingId ?? undefined,
      updatedAt: Date.now(),
    })
  }, [])

  const scheduleDraft = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void flushDraft()
    }, 650)
  }, [flushDraft])

  // 首次载入草稿
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await db.drafts.get(1)
        if (!cancelled && d) {
          setTitle(d.title ?? '')
          setContent(d.content ?? '')
          setWordPair(d.wordPair ?? '')
          setEditingId(d.editingId ?? null)
        }
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 变化后防抖保存草稿
  useEffect(() => {
    if (!loaded) return
    scheduleDraft()
    return () => window.clearTimeout(timer.current)
  }, [title, content, wordPair, editingId, loaded, scheduleDraft])

  // 页面隐藏 / 卸载前尽力落盘
  useEffect(() => {
    const onHide = () => {
      void flushDraft()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      window.clearTimeout(timer.current)
      void flushDraft()
    }
  }, [flushDraft])

  const open = useCallback(
    (w: Writing) => {
      markDirty()
      setTitle(w.title)
      setContent(w.content)
      setWordPair(w.wordPair)
      setEditingId(w.id ?? null)
    },
    [markDirty],
  )

  const save = useCallback(async () => {
    const s = latest.current
    const now = Date.now()
    const finalTitle = s.title.trim() || autoTitle(s.wordPair)
    if (s.editingId != null) {
      await db.writings.update(s.editingId, {
        title: finalTitle,
        content: s.content,
        wordPair: s.wordPair,
        updatedAt: now,
      })
    } else {
      await db.writings.add({
        title: finalTitle,
        content: s.content,
        wordPair: s.wordPair,
        createdAt: now,
        updatedAt: now,
      })
    }
    await db.drafts.delete(1)
    dirtyRef.current = false
    setTitle('')
    setContent('')
    setEditingId(null)
    return finalTitle
  }, [])

  return {
    title,
    setTitle: setTitleSafe,
    content,
    setContent: setContentSafe,
    wordPair,
    setWordPair: setWordPairSafe,
    editingId,
    setEditingId: setEditingIdSafe,
    loaded,
    open,
    save,
  }
}
