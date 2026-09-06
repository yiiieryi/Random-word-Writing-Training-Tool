import type { ReactNode } from 'react'

interface Props {
  title: string
  desc?: string
  icon?: ReactNode
  action?: ReactNode
}

export default function EmptyState({ title, desc, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted/70">{icon}</div>}
      <p className="font-display text-lg text-ink">{title}</p>
      {desc && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
