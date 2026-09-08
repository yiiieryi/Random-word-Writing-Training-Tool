import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpen,
  Check,
  Copy,
  Eye,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { db, type Category, type Word } from '../db/db'
import { useToast } from '../hooks/useToast'
import {
  exportLibraryData,
  importLibraryData,
  parseLibraryCsv,
  parseLibraryJson,
  type ImportResult,
} from '../lib/library'
import ConfirmDialog from '../components/ConfirmDialog'
import { downloadJson } from '../utils/download'
import { formatDate } from '../utils/format'

const JSON_TEMPLATE = `{
  "分类A": ["词1", "词2", "词3"],
  "分类B": ["词1", "词2"]
}`

const CSV_TEMPLATE = `分类,词汇
田园,麦田
田园,雾气`

const AI_PROMPT = `请以文学创作者的视角，生成一份用于写作灵感训练的词汇库 JSON。

格式要求（严格遵循，只输出 JSON）：
{
  "分类名": ["词1", "词2", "词3", ...],
  ...
}

内容要求：
1. 每个分类 30~50 个词汇；
2. 词汇要有画面感、文学联想能力（名词、天气、器物、情绪、生灵等均可）；
3. 分类内不得重复；
4. 分类名建议 2 字，如：自然、声音、时间、灯火、旅途、梦境；
5. 生成后可直接粘贴到「词雾」工具的文本导入框中使用。`

interface CategoryBlockProps {
  cat: Category
  words: Word[]
  editMode: boolean
  onAddWord: (catId: number, text: string) => Promise<boolean>
  onRename: (cat: Category, name: string) => Promise<boolean>
  onRequestDelete: (cat: Category) => void
  onWordPointerDown: (e: React.PointerEvent, w: Word) => void
  onResizeStart: (e: React.PointerEvent, cat: Category) => void
}

function CategoryBlock({
  cat,
  words,
  editMode,
  onAddWord,
  onRename,
  onRequestDelete,
  onWordPointerDown,
  onResizeStart,
}: CategoryBlockProps) {
  const [adding, setAdding] = useState(false)
  const [wordInput, setWordInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const commitRef = useRef(false)
  const wordCommitRef = useRef(false)

  const startEditName = () => {
    setEditing(true)
    setNameInput(cat.name)
    commitRef.current = false
  }
  const commitName = async () => {
    if (commitRef.current) return
    commitRef.current = true
    const ok = await onRename(cat, nameInput)
    if (ok) setEditing(false)
    else commitRef.current = false
  }
  const cancelName = () => {
    commitRef.current = true
    setEditing(false)
  }

  const commitWord = async () => {
    if (wordCommitRef.current) return
    wordCommitRef.current = true
    const t = wordInput.trim()
    if (!t) {
      setAdding(false)
      setWordInput('')
      wordCommitRef.current = false
      return
    }
    const ok = await onAddWord(cat.id!, t)
    if (ok) {
      setAdding(false)
      setWordInput('')
    } else {
      wordCommitRef.current = false // 失败时保留输入框以便重试
    }
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition-shadow hover:shadow-lift"
      style={{ gridColumn: `span ${cat.colSpan}`, gridRow: `span ${cat.rowSpan}` }}
    >
      {/* 头部：分类名 + 操作 */}
      <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-3">
        {editing ? (
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commitName()
              if (e.key === 'Escape') cancelName()
            }}
            onBlur={() => void commitName()}
            className="field min-w-0 flex-1 px-2 py-1 text-base"
            maxLength={12}
          />
        ) : (
          <div
            className="flex min-w-0 items-center gap-1.5"
            onDoubleClick={() => editMode && startEditName()}
            title={editMode ? '双击修改分类名称' : undefined}
          >
            {editMode && <Pencil size={12} className="shrink-0 text-muted/60" />}
            <span className="truncate font-display text-lg leading-snug text-ink">{cat.name}</span>
            <span className="shrink-0 text-[11px] text-muted/70">{words.length}</span>
          </div>
        )}

        {editMode && !editing && (
          <button
            onClick={() => onRequestDelete(cat)}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
            title="删除分类（需先清空词汇）"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* 词汇条：多行排布 + 上下滚动，尽量展示全部词汇 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="scroll-thin flex min-h-0 flex-1 flex-wrap content-start items-start gap-1.5 overflow-y-auto pb-1 pr-0.5">
          {words.length === 0 ? (
            <p className="mt-1 px-1 text-sm text-muted">这个分类还没有词汇</p>
          ) : (
            words.map((w) => (
              <span
                key={w.id}
                onPointerDown={(e) => editMode && onWordPointerDown(e, w)}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] transition-colors ${
                  editMode
                    ? 'cursor-grab border-line bg-white/70 text-ink hover:border-accent/40 hover:bg-accent-soft/40 active:cursor-grabbing'
                    : 'border-line bg-white/70 text-ink'
                }`}
                title={editMode ? '按住拖到下方可删除' : undefined}
              >
                {editMode && <GripVertical size={11} className="text-muted/60" />}
                {w.text}
              </span>
            ))
          )}
        </div>

        {editMode && (
          <div className="mt-auto">
            {adding ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitWord()
                    if (e.key === 'Escape') {
                      setAdding(false)
                      setWordInput('')
                    }
                  }}
                  onBlur={() => void commitWord()}
                  placeholder="输入新的词汇……"
                  className="field min-w-0 flex-1 px-2.5 py-1.5 text-sm"
                  maxLength={20}
                />
                <button className="btn btn-primary px-3 py-1.5" onClick={() => void commitWord()}>
                  <Check size={13} />
                </button>
                <button
                  className="btn btn-soft p-1.5"
                  onClick={() => {
                    setAdding(false)
                    setWordInput('')
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAdding(true)
                  setWordInput('')
                  wordCommitRef.current = false
                }}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                <Plus size={12} />
                添加词汇
              </button>
            )}
          </div>
        )}
      </div>

      {/* 缩放角标 */}
      {editMode && (
        <div
          onPointerDown={(e) => onResizeStart(e, cat)}
          className="absolute bottom-1 right-1 flex h-6 w-6 cursor-nwse-resize items-end justify-end p-1 text-muted/50 transition-colors hover:text-accent"
          title="拖动调整板块大小"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M11 1v7a3 3 0 0 1-3 3H1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default function WordLibrary() {
  const toast = useToast()
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [])
  const words = useLiveQuery(() => db.words.toArray(), [])

  const wordsByCat = useMemo(() => {
    const m = new Map<number, Word[]>()
    for (const w of words ?? []) {
      const arr = m.get(w.categoryId) ?? []
      arr.push(w)
      m.set(w.categoryId, arr)
    }
    return m
  }, [words])

  const [editMode, setEditMode] = useState(false)

  // 新建分类
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // 删除分类确认
  const [confirmCat, setConfirmCat] = useState<Category | null>(null)

  // 拖拽删除词汇
  const dragData = useRef<{ word: Word; sx: number; sy: number; active: boolean } | null>(null)
  const overDropRef = useRef(false)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ word: Word } | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [overDrop, setOverDrop] = useState(false)

  // 板块缩放
  const gridRef = useRef<HTMLDivElement>(null)
  const resizing = useRef<{
    id: number
    startX: number
    startY: number
    startCol: number
    startRow: number
    cols: number
    cellW: number
    cellH: number
  } | null>(null)

  // 导入
  const fileRef = useRef<HTMLInputElement>(null)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const onWordPointerDown = (e: React.PointerEvent, w: Word) => {
    if (!editMode) return
    dragData.current = { word: w, sx: e.clientX, sy: e.clientY, active: false }
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragData.current
      if (!d) return
      if (!d.active) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return
        d.active = true
        setDrag({ word: d.word })
      }
      setPos({ x: e.clientX, y: e.clientY })
      const el = dropZoneRef.current
      let over = false
      if (el) {
        const r = el.getBoundingClientRect()
        over =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
      }
      overDropRef.current = over
      setOverDrop(over)
    }
    const up = () => {
      const d = dragData.current
      dragData.current = null
      const wasActive = d?.active
      const word = d?.word
      const wasOver = overDropRef.current
      overDropRef.current = false
      setDrag(null)
      setOverDrop(false)
      if (wasActive && wasOver && word) {
        void (async () => {
          await db.words.delete(word.id!)
          toast(`已删除「${word.text}」`)
        })()
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [editMode, toast])

  const onResizeStart = (e: React.PointerEvent, cat: Category) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const gap = 16
    const min = 240
    const cols = Math.max(1, Math.floor((rect.width + gap) / (min + gap)))
    const cellW = (rect.width - gap * (cols - 1)) / cols
    const cellH = 240
    resizing.current = {
      id: cat.id!,
      startX: e.clientX,
      startY: e.clientY,
      startCol: cat.colSpan,
      startRow: cat.rowSpan,
      cols,
      cellW,
      cellH,
    }
  }

  useEffect(() => {
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = resizing.current
      if (!r) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY
        const colSpan = Math.max(1, Math.min(r.cols, r.startCol + Math.round(dx / r.cellW)))
        const rowSpan = Math.max(1, Math.min(4, r.startRow + Math.round(dy / r.cellH)))
        void db.categories.update(r.id, { colSpan, rowSpan })
      })
    }
    const up = () => {
      resizing.current = null
      cancelAnimationFrame(raf)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  // 新增词汇（查重）
  const addWord = async (catId: number, text: string): Promise<boolean> => {
    const t = text.trim()
    if (!t) return false
    const existing = wordsByCat.get(catId) ?? []
    if (existing.some((w) => w.text === t)) {
      toast('这个词已经存在', 'error')
      return false
    }
    await db.words.add({ categoryId: catId, text: t })
    toast(`已添加「${t}」`)
    return true
  }

  // 修改分类名称（查重）
  const rename = async (cat: Category, name: string): Promise<boolean> => {
    const n = name.trim()
    if (!n) {
      toast('分类名称不能为空', 'error')
      return false
    }
    if (n !== cat.name && categories?.some((c) => c.name === n)) {
      toast('该分类名称已存在', 'error')
      return false
    }
    if (n !== cat.name) {
      await db.categories.update(cat.id!, { name: n })
      toast(`已重命名「${n}」`)
    }
    return true
  }

  // 删除分类：非空禁止
  const requestDeleteCategory = (cat: Category) => {
    const hasWords = (wordsByCat.get(cat.id!) ?? []).length > 0
    if (hasWords) {
      toast('该分类仍包含词汇，请先清空词汇后再删除', 'error')
      return
    }
    setConfirmCat(cat)
  }
  const doDeleteCategory = async () => {
    if (!confirmCat) return
    await db.categories.delete(confirmCat.id!)
    toast(`已删除「${confirmCat.name}」`)
    setConfirmCat(null)
  }

  // 新建分类
  const addCategory = async () => {
    const name = newCatName.trim()
    if (!name) {
      toast('分类名称不能为空', 'error')
      return
    }
    if (categories?.some((c) => c.name === name)) {
      toast('该分类名称已存在', 'error')
      return
    }
    const maxOrder = categories?.length ? Math.max(...categories.map((c) => c.order)) : -1
    await db.categories.add({ name, order: maxOrder + 1, colSpan: 1, rowSpan: 1 })
    setNewCatName('')
    setShowNewCat(false)
    toast(`已创建「${name}」`)
  }

  // 批量导入（文本 / 文件共用解析）
  const importEntries = (text: string, fileName?: string): Record<string, string[]> => {
    const trimmed = text.trim()
    if (fileName && /\.csv$/i.test(fileName)) return parseLibraryCsv(trimmed)
    if (fileName && /\.json$/i.test(fileName)) return parseLibraryJson(trimmed)
    return trimmed.startsWith('{') ? parseLibraryJson(trimmed) : parseLibraryCsv(trimmed)
  }

  const applyImport = async (entries: Record<string, string[]>) => {
    const result: ImportResult = await importLibraryData(entries)
    toast(
      `导入完成\n新增分类：${result.cats}\n新增词汇：${result.words}\n重复词汇：${result.dups}`,
      'success',
    )
  }

  const importFromText = async () => {
    if (!importText.trim()) return
    try {
      await applyImport(importEntries(importText))
      setShowImport(false)
      setImportText('')
    } catch {
      toast('导入失败，请检查文本格式', 'error')
    }
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      await applyImport(importEntries(text, file.name))
      setShowImport(false)
    } catch {
      toast('导入失败，请检查文件格式', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT)
      toast('提示词已复制')
    } catch {
      toast('复制失败，请手动选中复制', 'error')
    }
  }

  const doExportLibrary = async () => {
    const data = await exportLibraryData()
    const count = Object.values(data).reduce((s, arr) => s + arr.length, 0)
    if (count === 0) {
      toast('词库还是空的，暂时没有可导出的内容', 'info')
      return
    }
    downloadJson(`library-backup-${formatDate(Date.now())}.json`, data)
    toast(`已导出 ${Object.keys(data).length} 个分类、${count} 个词汇`)
  }

  const noCategories = !categories || categories.length === 0

  return (
    <div className="space-y-6">
      {/* 顶部工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">词库</h1>
          <p className="mt-1 text-sm text-muted">
            {noCategories
              ? '词库还是空的，创建你的第一个分类吧。'
              : `共 ${categories.length} 个分类 · ${words?.length ?? 0} 个词汇`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost" onClick={doExportLibrary}>
            <BookOpen size={15} />
            导出词库
          </button>
          <button
            className="btn btn-ghost"
            data-testid="import-open"
            onClick={() => setShowImport(true)}
          >
            <Upload size={15} />
            批量导入
          </button>
          <button className="btn btn-ghost" onClick={() => setShowNewCat(true)}>
            <FolderPlus size={15} />
            新建分类
          </button>
          <button
            data-testid="edit-toggle"
            className={editMode ? 'btn btn-primary' : 'btn btn-soft border border-line'}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? <Check size={15} /> : <Pencil size={15} />}
            {editMode ? '完成' : '编辑词库'}
          </button>
        </div>
      </div>

      {editMode && (
        <p className="rounded-xl border border-dashed border-line bg-card/50 px-4 py-2.5 text-xs leading-relaxed text-muted">
          编辑模式：双击分类名可改名 · 词汇可拖到下方删除 · 拖动板块右下角调整大小 · 拖动后其他板块会自动重新排列。
        </p>
      )}

      {/* 新建分类输入 */}
      {showNewCat && (
        <div className="animate-pop-in flex items-center gap-2 rounded-2xl border border-line bg-card p-3">
          <input
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addCategory()
              if (e.key === 'Escape') {
                setShowNewCat(false)
                setNewCatName('')
              }
            }}
            placeholder="新分类名称……"
            className="field flex-1"
            maxLength={12}
          />
          <button className="btn btn-primary" onClick={() => void addCategory()}>
            <Check size={14} />
            创建
          </button>
          <button
            className="btn btn-soft"
            onClick={() => {
              setShowNewCat(false)
              setNewCatName('')
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 词库墙 */}
      {noCategories ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
          <p className="font-display text-lg text-ink">这个分类还没有词汇</p>
          <p className="mt-1.5 text-sm text-muted">创建第一个分类，或通过「批量导入」直接导入词库。</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowNewCat(true)}>
            <Plus size={15} />
            新建分类
          </button>
        </div>
      ) : (
        <div
          ref={gridRef}
          data-testid="word-wall"
          className="grid grid-flow-dense gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gridAutoRows: '240px',
          }}
        >
          {categories.map((cat) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              words={wordsByCat.get(cat.id!) ?? []}
              editMode={editMode}
              onAddWord={addWord}
              onRename={rename}
              onRequestDelete={requestDeleteCategory}
              onWordPointerDown={onWordPointerDown}
              onResizeStart={onResizeStart}
            />
          ))}
        </div>
      )}

      {/* 拖拽删除 Drop Zone */}
      {drag && (
        <div
          ref={dropZoneRef}
          className={`fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-10 py-4 transition-all duration-150 ${
            overDrop
              ? 'scale-105 border-accent bg-accent-soft/80'
              : 'border-line bg-card/95 shadow-lift'
          }`}
        >
          <Trash2 size={20} className={overDrop ? 'text-accent' : 'text-muted'} />
          <span className={`text-xs ${overDrop ? 'text-accent-deep' : 'text-muted'}`}>
            {overDrop ? '松开删除' : '拖到这里删除'}
          </span>
        </div>
      )}

      {/* 拖拽幽灵词汇 */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <span className="chip border-transparent bg-ink text-paper shadow-lift">
            {drag.word.text}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={confirmCat != null}
        title={`删除分类「${confirmCat?.name ?? ''}」？`}
        message="该分类为空，删除后无法恢复。"
        confirmText="删除"
        onConfirm={doDeleteCategory}
        onCancel={() => setConfirmCat(null)}
      />

      {/* 重置布局（编辑模式辅助） */}
      {editMode && categories && categories.length > 0 && (
        <div className="flex justify-center">
          <button
            className="btn btn-soft"
            onClick={async () => {
              for (const c of categories) await db.categories.update(c.id!, { colSpan: 1, rowSpan: 1 })
              toast('已重置板块尺寸', 'info')
            }}
          >
            <RotateCcw size={13} />
            重置板块尺寸
          </button>
        </div>
      )}

      {/* 批量导入面板：文本粘贴 + 文件 */}
      {showImport && (
        <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto p-4 pt-[6vh] sm:items-center sm:pt-4">
          <div
            className="animate-fade-in fixed inset-0 bg-ink/25"
            onClick={() => setShowImport(false)}
          />
          <div className="animate-pop-in relative max-h-[86vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-line bg-card p-6 shadow-lift scroll-thin">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-ink">批量导入词库</h3>
              <button className="btn btn-soft p-2" onClick={() => setShowImport(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              支持 JSON 与 CSV，新分类自动创建，重复词汇自动跳过，不会中断。
            </p>

            <textarea
              data-testid="import-text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'粘贴 JSON 或 CSV 文本…\n\nJSON：{"分类":["词1","词2"]}\nCSV：分类,词汇'}
              className="field mt-4 h-44 resize-none scroll-mt-4 font-mono text-xs leading-relaxed"
              spellCheck={false}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="btn btn-primary"
                data-testid="import-submit"
                disabled={!importText.trim()}
                onClick={() => void importFromText()}
              >
                <Upload size={15} />
                导入文本
              </button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                <FolderOpen size={15} />
                从文件导入
              </button>
              <button
                className="btn btn-soft"
                onClick={() => setShowTemplate((v) => !v)}
              >
                <Eye size={14} />
                {showTemplate ? '收起示范' : '查看示范'}
              </button>
              <button className="btn btn-soft" onClick={() => setShowPrompt((v) => !v)}>
                <Sparkles size={14} />
                {showPrompt ? '收起提示词' : 'AI 生成提示词'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleImport(f)
                }}
              />
            </div>

            {showTemplate && (
              <div className="mt-3 space-y-2.5 rounded-xl border border-line bg-paper/60 p-3.5">
                <p className="text-xs font-medium text-muted">JSON 格式</p>
                <pre className="scroll-thin overflow-x-auto rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-ink">
                  {JSON_TEMPLATE}
                </pre>
                <p className="text-xs font-medium text-muted">CSV 格式</p>
                <pre className="scroll-thin overflow-x-auto rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-ink">
                  {CSV_TEMPLATE}
                </pre>
              </div>
            )}

            {showPrompt && (
              <div className="mt-3 rounded-xl border border-line bg-paper/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted">
                    把提示词发给 AI，生成结果后粘贴到上方即可导入
                  </p>
                  <button className="btn btn-soft shrink-0 px-2.5 py-1 text-xs" onClick={copyPrompt}>
                    <Copy size={12} />
                    复制
                  </button>
                </div>
                <pre className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-ink scroll-thin">
                  {AI_PROMPT}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
