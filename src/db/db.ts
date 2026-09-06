import Dexie, { type Table } from 'dexie'

/** 词库分类，含用于板块布局的尺寸信息 */
export interface Category {
  id?: number
  name: string
  order: number
  /** 网格列跨度（宽度） */
  colSpan: number
  /** 网格行跨度（高度） */
  rowSpan: number
}

export interface Word {
  id?: number
  categoryId: number
  text: string
}

/** 收藏的词组（左右两词） */
export interface Collection {
  id?: number
  wordA: string
  categoryA: string
  wordB: string
  categoryB: string
  createdAt: number
}

/** 已保存的作品 */
export interface Writing {
  id?: number
  title: string
  content: string
  wordPair: string
  createdAt: number
  updatedAt: number
}

/** 单份写作草稿（id 恒为 1） */
export interface Draft {
  id?: number
  title: string
  content: string
  wordPair: string
  editingId?: number | null
  updatedAt: number
}

class WordSparkDB extends Dexie {
  categories!: Table<Category, number>
  words!: Table<Word, number>
  collections!: Table<Collection, number>
  writings!: Table<Writing, number>
  drafts!: Table<Draft, number>

  constructor() {
    super('wordspark')
    this.version(1).stores({
      categories: '++id, order, name',
      words: '++id, categoryId, text',
      collections: '++id, createdAt',
      writings: '++id, updatedAt, createdAt',
      drafts: 'id',
    })
  }
}

export const db = new WordSparkDB()
