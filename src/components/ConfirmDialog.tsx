interface Props {
  open: boolean
  title: string
  message?: string
  confirmText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
        onClick={onCancel}
      />
      <div className="animate-pop-in relative w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-lift">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        {message && <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
