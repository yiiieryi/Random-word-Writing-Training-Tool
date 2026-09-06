import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, Trash2 } from 'lucide-react'
import { db, type Writing } from '../db/db'
import { formatTime } from '../utils/format'
import { useToast } from '../hooks/useToast'
import EmptyState from './EmptyState'
import ConfirmDialog from './ConfirmDialog'

const PAGE_SIZE = 4

interface Props {
  onOpen: (w: Writing) => void
  onDeleted: (id: number) => void
}

function preview(content: string, max = 90): string {
  const t = content.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export default function HistorySection({ onOpen, onDeleted }: Props) {
  const toast = useToast()
  const writings = useLiveQuery(
    () => db.writings.orderBy('updatedAt').reverse().toArray(),
    [],
  )
  const [showAll, setShowAll] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const shown = (writings ?? []).slice(0, showAll ? undefined : PAGE_SIZE)

  const doDelete = async () => {
    if (confirmId == null) return
    await db.writings.delete(confirmId)
    onDeleted(confirmId)
    setConfirmId(null)
    toast('已删除')
  }

  if (!writings || writings.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={22} />}
        title="还没有写作记录"
        desc="开始写下第一篇吧。"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">历史写作</h2>
        {writings.length > PAGE_SIZE && (
          <button className="btn btn-soft" onClick={() => setShowAll((s) => !s)}>
            {showAll ? '收起' : `查看全部（${writings.length}）`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="history">
        {shown.map((w, i) => (
          <article
            key={w.id}
            onClick={() => onOpen(w)}
            className="group animate-fade-up cursor-pointer rounded-2xl border border-line bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40"
            style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg text-ink">{w.title}</h3>
                <p className="mt-0.5 text-xs text-muted">{formatTime(w.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmId(w.id ?? null)
                }}
                className="mt-0.5 rounded-full p-1.5 text-muted opacity-0 transition-all hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
                title="删除这篇作品"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {w.wordPair && (
              <p className="mt-2 text-[11px] tracking-wide text-muted/70">
                「{w.wordPair}」
              </p>
            )}
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
              {preview(w.content)}
            </p>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={confirmId != null}
        title="删除这篇作品？"
        message="删除后无法恢复。"
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
