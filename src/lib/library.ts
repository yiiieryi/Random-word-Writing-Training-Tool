import { db } from '../db/db'

export interface ImportResult {
  cats: number
  words: number
  dups: number
  skipped: number
}

/** 将 {分类: [词汇...]} 合并进词库：新分类自动创建、词汇自动查重、重复跳过 */
export async function importLibraryData(entries: Record<string, string[]>): Promise<ImportResult> {
  const categories = await db.categories.toArray()
  const words = await db.words.toArray()

  const nameToCat = new Map<string, (typeof categories)[number]>()
  for (const c of categories) nameToCat.set(c.name, c)

  const wordsByCat = new Map<number, Set<string>>()
  for (const w of words) {
    const set = wordsByCat.get(w.categoryId) ?? new Set<string>()
    set.add(w.text)
    wordsByCat.set(w.categoryId, set)
  }

  let cats = 0
  let added = 0
  let dups = 0
  let maxOrder = categories.length ? Math.max(...categories.map((c) => c.order)) : -1

  await db.transaction('rw', db.categories, db.words, async () => {
    for (const [nameRaw, list] of Object.entries(entries)) {
      const name = nameRaw.trim()
      if (!name) continue
      let cat = nameToCat.get(name)
      if (!cat) {
        maxOrder += 1
        const id = await db.categories.add({ name, order: maxOrder, colSpan: 1, rowSpan: 1 })
        cat = { id, name, order: maxOrder, colSpan: 1, rowSpan: 1 }
        nameToCat.set(name, cat)
        cats += 1
      }
      const set = wordsByCat.get(cat.id!) ?? new Set<string>()
      wordsByCat.set(cat.id!, set)
      for (const raw of list) {
        const t = (raw ?? '').toString().trim()
        if (!t) continue
        if (set.has(t)) {
          dups += 1
          continue
        }
        set.add(t)
        await db.words.add({ categoryId: cat.id!, text: t })
        added += 1
      }
    }
  })

  return { cats, words: added, dups, skipped: 0 }
}

/** 解析词库 JSON：{ "田园": ["麦田", ...] }，兼容数组形式 */
export function parseLibraryJson(text: string): Record<string, string[]> {
  const data = JSON.parse(text)
  if (Array.isArray(data)) {
    const out: Record<string, string[]> = {}
    for (const item of data) {
      if (item && typeof item === 'object') {
        const name = item.category ?? item.name
        const list = item.words ?? item.items ?? item.wordsList
        if (name && Array.isArray(list)) out[String(name)] = list
      }
    }
    return out
  }
  if (data && typeof data === 'object') {
    return data as Record<string, string[]>
  }
  throw new Error('bad json')
}

/** 解析词库 CSV：每行「分类,词汇」，可选表头「分类,词汇 / category,word」 */
export function parseLibraryCsv(text: string): Record<string, string[]> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: Record<string, string[]> = {}
  let start = 0
  if (lines.length) {
    const first = lines[0].split(',').map((s) => s.trim())
    const h0 = first[0].toLowerCase()
    const h1 = first[1]?.toLowerCase() ?? ''
    if (
      first.length >= 2 &&
      (h0 === '分类' || h0 === 'category') &&
      (h1 === '词汇' || h1 === 'word')
    ) {
      start = 1
    }
  }
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim())
    if (parts.length < 2) continue
    const cat = parts[0]
    const word = parts[1]
    if (!cat || !word) continue
    if (!out[cat]) out[cat] = []
    out[cat].push(word)
  }
  return out
}

/** 导出词库为 {分类: [词汇...]} */
export async function exportLibraryData(): Promise<Record<string, string[]>> {
  const categories = await db.categories.orderBy('order').toArray()
  const words = await db.words.toArray()
  const byCat = new Map<number, string[]>()
  for (const w of words) {
    const arr = byCat.get(w.categoryId) ?? []
    arr.push(w.text)
    byCat.set(w.categoryId, arr)
  }
  const out: Record<string, string[]> = {}
  for (const c of categories) out[c.name] = byCat.get(c.id!) ?? []
  return out
}
