import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: string
  text: string
  tone: ToastTone
}

interface UiStore {
  toasts: ToastMessage[]
  notify: (text: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

let nextToastId = 0

/** Avisos efímeros (errores de guardado, importaciones, exportaciones). */
export const useUiStore = create<UiStore>()((set, get) => ({
  toasts: [],
  notify: (text, tone = 'info') => {
    nextToastId += 1
    const id = `toast-${nextToastId}`

    set((state) => ({ toasts: [...state.toasts, { id, text, tone }] }))
    setTimeout(() => get().dismiss(id), 6000)
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))
