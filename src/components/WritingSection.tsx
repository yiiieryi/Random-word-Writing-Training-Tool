import { useEffect, useRef } from 'react'
import { Feather, Save } from 'lucide-react'
import { countChars, formatClock } from '../utils/format'
import { useToast } from '../hooks/useToast'
import type { WritingDraft } from '../hooks/useWritingDraft'

function AutoTextarea({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 900)}px`
  }, [value])

  // Tab 键缩进：单行插入缩进；多行选区逐行加/减缩进；Shift+Tab 取消缩进
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const v = el.value
    const selected = v.slice(start, end)
    const multiline = /[\r\n]/.test(selected)

    if (multiline) {
      const rawLines = selected.split(/\r?\n/)
      const out = e.shiftKey
        ? rawLines.map((l) => (l.startsWith('\t') ? l.slice(1) : l))
        : rawLines.map((l) => `\t${l}`)
      const joined = out.join('\n')
      const next = v.slice(0, start) + joined + v.slice(end)
      el.value = next
      el.setSelectionRange(start, start + joined.length)
      onChange(next)
      return
    }

    if (e.shiftKey) {
      // 单行 Shift+Tab：不做变更（避免误删内容）
      return
    }
    const next = v.slice(0, start) + '\t' + v.slice(end)
    el.value = next
    el.setSelectionRange(start + 1, start + 1)
    onChange(next)
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="写下第一个字……"
      data-testid="editor"
      style={{ lineHeight: 1.75, fontSize: '16px', tabSize: 4 }}
      className="w-full min-h-[320px] resize-none rounded-2xl border border-line bg-card p-5 text-ink shadow-soft outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40"
    />
  )
}

export default function WritingSection({ w }: { w: WritingDraft }) {
  const toast = useToast()
  const { title, setTitle, content, setContent, wordPair, editingId, save } = w

  const handleSave = async () => {
    if (!content.trim()) {
      toast('写点什么再保存吧', 'info')
      return
    }
    const t = await save()
    toast(`已保存「${t}」 · ${formatClock(Date.now())}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">开始写作</h2>
        {wordPair ? (
          <span className="chip border-accent/30 bg-accent-soft/60 text-accent-deep">
            今日灵感 · 「{wordPair}」
          </span>
        ) : (
          <span className="text-xs text-muted">先随机两个词，或点击收藏中的词组</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可留空，自动生成）"
          data-testid="title"
          className="field flex-1 text-base"
          maxLength={60}
        />
        {editingId != null && (
          <span className="rounded-full border border-pine/30 bg-pine/10 px-3 py-1 text-xs text-pine">
            正在续写
          </span>
        )}
      </div>

      <AutoTextarea value={content} onChange={setContent} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted" data-testid="char-count">{countChars(content)} 字</span>
        <button className="btn btn-primary" onClick={handleSave} data-testid="save-btn" disabled={!content.trim()}>
          <Save size={15} />
          保存作品
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted/80">
        <Feather size={12} />
        文字会随输入自动保存在本机，切换页面也不会丢失。
      </p>
    </div>
  )
}
