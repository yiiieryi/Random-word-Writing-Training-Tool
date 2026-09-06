import { useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Download, FileText, Upload } from 'lucide-react'
import { db } from '../db/db'
import { useToast } from '../hooks/useToast'
import { downloadJson } from '../utils/download'
import { formatDate } from '../utils/format'
import {
  exportLibraryData,
  importLibraryData,
  parseLibraryCsv,
  parseLibraryJson,
} from '../lib/library'

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className="text-accent">{icon}</span>
        <h2 className="font-display text-lg text-ink">{title}</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

export default function Settings() {
  const toast = useToast()
  const writingFileRef = useRef<HTMLInputElement>(null)
  const libraryFileRef = useRef<HTMLInputElement>(null)

  const writingCount = useLiveQuery(async () => db.writings.count(), [])

  // —— 文稿 ——
  const exportWritings = async () => {
    const ws = await db.writings.orderBy('createdAt').toArray()
    if (ws.length === 0) {
      toast('还没有文稿可以导出', 'info')
      return
    }
    const data = ws.map((w) => ({
      id: w.id,
      title: w.title,
      content: w.content,
      wordPair: w.wordPair,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))
    downloadJson(`writing-backup-${formatDate(Date.now())}.json`, data)
    toast(`已导出 ${data.length} 篇文稿`)
  }

  const importWritings = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const arr = Array.isArray(data) ? data : (data.writings ?? [])
      const existing = await db.writings.toArray()
      const keySet = new Set(existing.map((w) => `${w.title}|${w.content}`))
      let added = 0
      let dups = 0
      await db.transaction('rw', db.writings, async () => {
        for (const item of arr) {
          const title = String(item.title ?? '')
          const content = String(item.content ?? '')
          if (!title && !content) continue
          const key = `${title}|${content}`
          if (keySet.has(key)) {
            dups += 1
            continue
          }
          keySet.add(key)
          const now = Date.now()
          await db.writings.add({
            title,
            content,
            wordPair: String(item.wordPair ?? ''),
            createdAt: Number(item.createdAt) || now,
            updatedAt: Number(item.updatedAt) || now,
          })
          added += 1
        }
      })
      toast(
        `导入完成\n成功导入：${added} 篇\n检测到重复：${dups} 篇\n跳过：${dups} 篇`,
        'success',
      )
    } catch {
      toast('导入失败，请检查文件格式', 'error')
    } finally {
      if (writingFileRef.current) writingFileRef.current.value = ''
    }
  }

  // —— 词库 ——
  const exportLibrary = async () => {
    const data = await exportLibraryData()
    const count = Object.values(data).reduce((s, arr) => s + arr.length, 0)
    if (count === 0) {
      toast('词库还是空的，暂时没有可导出的内容', 'info')
      return
    }
    downloadJson(`library-backup-${formatDate(Date.now())}.json`, data)
    toast(`已导出 ${Object.keys(data).length} 个分类、${count} 个词汇`)
  }

  const importLibrary = async (file: File) => {
    try {
      const text = await file.text()
      const entries = /\.csv$/i.test(file.name)
        ? parseLibraryCsv(text)
        : parseLibraryJson(text)
      const result = await importLibraryData(entries)
      toast(
        `导入完成\n新增分类：${result.cats}\n新增词汇：${result.words}\n重复词汇：${result.dups}`,
        'success',
      )
    } catch {
      toast('导入失败，请检查文件格式', 'error')
    } finally {
      if (libraryFileRef.current) libraryFileRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">系统设置</h1>
        <p className="mt-1 text-sm text-muted">
          所有数据仅保存在本机浏览器（IndexedDB）中，可随时导出备份。
        </p>
      </div>

      <Section
        icon={<FileText size={18} />}
        title="文稿备份"
        desc="导出全部练习文稿为 JSON 文件，或导入此前导出的备份。导入不会覆盖现有文章，并按标题与内容自动检测重复。"
      >
        <button className="btn btn-primary" onClick={exportWritings}>
          <Download size={15} />
          导出全部文稿
          {writingCount != null && writingCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{writingCount}</span>
          )}
        </button>
        <button className="btn btn-ghost" onClick={() => writingFileRef.current?.click()}>
          <Upload size={15} />
          导入文稿
        </button>
        <input
          ref={writingFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importWritings(f)
          }}
        />
      </Section>

      <Section
        icon={<BookOpen size={18} />}
        title="词库备份"
        desc="导出当前全部分类与词汇为 JSON，或导入词库备份 / 其他词库文件。新分类自动创建，重复词汇自动跳过。"
      >
        <button className="btn btn-primary" onClick={exportLibrary}>
          <Download size={15} />
          导出词库
        </button>
        <button className="btn btn-ghost" onClick={() => libraryFileRef.current?.click()}>
          <Upload size={15} />
          导入词库
        </button>
        <input
          ref={libraryFileRef}
          type="file"
          accept=".json,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importLibrary(f)
          }}
        />
      </Section>

      <p className="px-2 text-center text-xs leading-relaxed text-muted/80">
        本工具完全离线运行，不上传任何数据。刷新或关闭网页后，词库、收藏、草稿与历史文章都会保留。
      </p>
    </div>
  )
}
