const pad = (n: number) => String(n).padStart(2, '0')

/** 2026.08.31 03:21 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 03:21 */
export function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 文件名时间：2026-08-31 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 字符计数（兼容代理对） */
export function countChars(s: string): number {
  return Array.from(s).length
}
