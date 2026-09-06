import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

type Push = (message: string, kind?: ToastKind) => void

const ToastCtx = createContext<Push>(() => {})

export function useToast(): Push {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const push = useCallback<Push>((message, kind = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-3), { id, message, kind }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-7 left-1/2 z-[60] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in flex items-start gap-2 rounded-2xl border border-line bg-ink/95 px-4 py-2.5 text-sm text-paper shadow-lift backdrop-blur"
          >
            <span className="mt-0.5 shrink-0">
              {t.kind === 'success' && <Check size={15} className="text-pine" />}
              {t.kind === 'error' && <X size={15} className="text-accent" />}
              {t.kind === 'info' && <Info size={15} className="text-[#c9b48a]" />}
            </span>
            <span className="whitespace-pre-line text-center leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
