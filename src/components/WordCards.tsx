import { useState } from 'react'
import { Check, ChevronDown, Feather, Heart, Shuffle } from 'lucide-react'

export interface PairSide {
  word: string
  category: string
}
export interface WordPair {
  left: PairSide
  right: PairSide
}

interface FilterPickerProps {
  label: '左' | '右'
  value: string | null
  categories: string[]
  onChange: (c: string | null) => void
}

function FilterPicker({ label, value, categories, onChange }: FilterPickerProps) {
  const [open, setOpen] = useState(false)
  const select = (c: string | null) => {
    onChange(c)
    setOpen(false)
  }
  return (
    <div className="relative">
      <button
        data-testid={`filter-${label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-white/50 px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
        title="选择抽取分类"
      >
        <span className="tracking-[0.2em]">{value ?? '全部'}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-full z-20 mt-2 max-h-64 w-40 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-lift scroll-thin animate-pop-in">
            <button
              data-testid={`filter-opt-${label}-all`}
              onClick={() => select(null)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-sm transition-colors ${
                value === null ? 'bg-accent-soft/60 text-accent-deep' : 'text-ink hover:bg-paper'
              }`}
            >
              全部
              {value === null && <Check size={13} />}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                data-testid={`filter-opt-${label}-${c}`}
                onClick={() => select(c)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-sm transition-colors ${
                  value === c ? 'bg-accent-soft/60 text-accent-deep' : 'text-ink hover:bg-paper'
                }`}
              >
                {c}
                {value === c && <Check size={13} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface Props {
  pair: WordPair | null
  categories: string[]
  leftFilter: string | null
  rightFilter: string | null
  onFilterChange: (side: '左' | '右', cat: string | null) => void
  onRandomAll: () => void
  onRandomLeft: () => void
  onRandomRight: () => void
  onFavorite: () => void
  onStartWriting: () => void
}

function WordCard({
  sideLabel,
  side,
  filter,
  categories,
  onFilterChange,
  onRandom,
}: {
  sideLabel: '左' | '右'
  side: PairSide | undefined
  filter: string | null
  categories: string[]
  onFilterChange: (side: '左' | '右', cat: string | null) => void
  onRandom: () => void
}) {
  return (
    <div
      data-testid={`word-${sideLabel}`}
      className="group relative flex flex-col items-center overflow-hidden rounded-3xl border border-line bg-card px-2 py-8 text-center shadow-soft transition-shadow hover:shadow-lift sm:px-6 sm:py-14"
    >
      <span className="absolute left-2.5 top-2.5 text-[10px] tracking-[0.3em] text-muted/70 sm:left-4 sm:top-4 sm:text-[11px]">
        {sideLabel}
      </span>
      <FilterPicker
        label={sideLabel}
        value={filter}
        categories={categories}
        onChange={(c) => onFilterChange(sideLabel, c)}
      />
      <div
        key={side?.word ?? 'empty'}
        className="mt-6 flex min-h-[3.8rem] w-full items-center justify-center px-1 sm:mt-8 sm:min-h-[5rem]"
      >
        <span className="animate-word-swap max-w-full break-words font-display text-[1.8rem] leading-[1.2] text-ink sm:text-[4rem] sm:leading-none">
          {side?.word || '·'}
        </span>
      </div>
      <span
        data-testid={`word-cat-${sideLabel}`}
        className="mt-2.5 min-h-4 max-w-full truncate px-1 text-[10px] tracking-[0.2em] text-muted/70 sm:mt-3 sm:text-[11px] sm:tracking-[0.35em]"
      >
        {side?.category || ''}
      </span>
      <button
        onClick={onRandom}
        data-testid={`random-${sideLabel}`}
        className="mt-5 inline-flex items-center gap-1 rounded-full border border-line bg-white/60 px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent sm:mt-7 sm:px-4 sm:py-2 sm:text-xs"
        title="按所选分类重新随机这个词"
      >
        <Shuffle size={13} />
        随机
      </button>
    </div>
  )
}

export default function WordCards({
  pair,
  categories,
  leftFilter,
  rightFilter,
  onFilterChange,
  onRandomAll,
  onRandomLeft,
  onRandomRight,
  onFavorite,
  onStartWriting,
}: Props) {
  return (
    <div>
      {/* 双词卡片：页面上唯一的词汇展示位 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <WordCard
          sideLabel="左"
          side={pair?.left}
          filter={leftFilter}
          categories={categories}
          onFilterChange={(s, c) => onFilterChange('左', c)}
          onRandom={onRandomLeft}
        />
        <WordCard
          sideLabel="右"
          side={pair?.right}
          filter={rightFilter}
          categories={categories}
          onFilterChange={(s, c) => onFilterChange('右', c)}
          onRandom={onRandomRight}
        />
      </div>

      {/* 主操作：重新随机 / 开始写作 / 收藏（不再重复展示词组） */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-line bg-card/70 px-6 py-6 shadow-soft">
        <button
          className="btn bg-[#f5eaea] px-7 py-3 text-base text-[#b04040] hover:bg-[#eed8d8]"
          onClick={onRandomAll}
          data-testid="random-all"
          title="两个词一起重新随机"
        >
          <Shuffle size={18} />
          重新随机
        </button>
        <button
          className="btn bg-[#e2e1dd] px-7 py-3 text-base text-[#555550] hover:bg-[#d6d5d0]"
          onClick={onStartWriting}
          data-testid="start-writing"
        >
          <Feather size={18} />
          开始写作
        </button>
        <button
          className="btn btn-soft px-4 py-3"
          onClick={onFavorite}
          data-testid="fav-btn"
          disabled={!pair}
          title="收藏卡片上的两个词"
        >
          <Heart size={16} />
          收藏
        </button>
      </div>
    </div>
  )
}
