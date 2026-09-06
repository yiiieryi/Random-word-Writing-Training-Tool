import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark, X } from 'lucide-react'
import { db, type Collection } from '../db/db'
import { useToast } from '../hooks/useToast'
import EmptyState from './EmptyState'

interface Props {
  onPick: (c: Collection) => void
}

export default function Collections({ onPick }: Props) {
  const toast = useToast()
  const collections = useLiveQuery(
    () => db.collections.orderBy('createdAt').reverse().toArray(),
    [],
  )

  const remove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await db.collections.delete(id)
    toast('已取消收藏')
  }

  if (!collections || collections.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={22} />}
        title="还没有收藏词组"
        desc="随机生成两个词，看看它们会碰撞出什么。"
      />
    )
  }

  return (
    <div
      data-testid="collections"
      className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-line bg-card/40 p-4 scroll-thin"
    >
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="group relative flex items-center gap-1.5 rounded-full border border-line bg-card py-1.5 pl-4 pr-8 text-sm text-ink shadow-soft transition-all hover:border-accent/40 hover:text-accent"
          title="点击用作今日灵感"
        >
          <span className="font-display">{c.wordA}</span>
          <span className="text-accent">×</span>
          <span className="font-display">{c.wordB}</span>
          <span
            role="button"
            onClick={(e) => remove(e, c.id!)}
            className="absolute right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
            title="删除收藏"
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  )
}
