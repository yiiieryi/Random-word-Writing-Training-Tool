import type { Writing } from '../db/db'

/** 雾中一粒来自文稿的词：附带其出处文稿与练习词组 */
export interface MistWord {
  text: string
  writingId: number
  title: string
  /** 该文稿练习的词组，形如「晨雾 × 街灯」（用于点击沿用） */
  pair: string
}

export interface MistSources {
  /** 已保存文稿中提取的词句单元（仅用于首页展示，不参与随机抽取） */
  writingWords: MistWord[]
  /** 词库词汇（随机抽取唯一词源） */
  library: string[]
  writingCount: number
}

/** 单个词句单元的最大长度（过长不适合作为雾中粒子） */
const MAX_UNIT = 12

/** 把一段文本切成可入雾的词句单元：按标点 / 空白切分，保留中文、英文与数字片段 */
function splitUnits(text: string): string[] {
  return String(text ?? '')
    .split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 1 && s.length <= MAX_UNIT)
}

/**
 * 由文稿列表与词库构建词雾来源（纯函数）。
 * 配合 useLiveQuery 使用：文稿 / 词库变化时自动重建，实现首页实时更新。
 */
export function buildSources(
  writings: Writing[] | undefined,
  words: { text: string }[] | undefined,
): MistSources | null {
  if (!writings || !words) return null
  const seen = new Set<string>()
  const writingWords: MistWord[] = []
  for (const w of writings) {
    for (const t of [w.title, w.content]) {
      for (const u of splitUnits(t)) {
        const key = `${w.id ?? 0}|${u}`
        if (seen.has(key)) continue
        seen.add(key)
        writingWords.push({
          text: u,
          writingId: w.id ?? 0,
          title: w.title,
          pair: w.wordPair ?? '',
        })
      }
    }
  }
  const library = Array.from(new Set(words.map((x) => x.text.trim()).filter(Boolean)))
  return { writingWords, library, writingCount: writings.length }
}
