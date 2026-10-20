import { useEffect } from 'react'
import { subscribeToStorageErrors } from '../../store/storage'
import { useUiStore } from '../../store/useUiStore'
import { Toast } from './Toast'

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts)
  const dismiss = useUiStore((state) => state.dismiss)
  const notify = useUiStore((state) => state.notify)

  useEffect(() => subscribeToStorageErrors((message) => notify(message, 'error')), [notify])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          text={toast.text}
          tone={toast.tone}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  )
}
