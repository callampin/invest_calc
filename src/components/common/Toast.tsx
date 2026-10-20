import type { ToastTone } from '../../store/useUiStore'
import { cn } from '../../utils/cn'

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100',
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  error:
    'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
}

export interface ToastProps {
  text: string
  tone: ToastTone
  onDismiss: () => void
}

export function Toast({ text, tone, onDismiss }: ToastProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-3 text-sm shadow-lg',
        TONE_STYLES[tone],
      )}
    >
      <span className="flex-1">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="rounded p-0.5 text-xs font-bold hover:bg-black/10 dark:hover:bg-white/10"
      >
        ✕
      </button>
    </div>
  )
}
