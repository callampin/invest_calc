import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { Project } from '../domain/types'

export const STORAGE_KEY = 'invest-calc:v1'
export const BACKUP_KEY = 'invest-calc:backup'

export interface PersistedProjectsState {
  projects: Project[]
  activeProjectId: string | null
}

type StorageErrorListener = (message: string) => void

const listeners = new Set<StorageErrorListener>()

/** Permite que la UI (Toast) reaccione a fallos de almacenamiento. */
export function subscribeToStorageErrors(listener: StorageErrorListener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function notifyStorageError(message: string): void {
  for (const listener of listeners) {
    listener(message)
  }
}

function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Respaldo en memoria cuando `localStorage` no está disponible (modo privado, cuota). */
const memoryFallback = new Map<string, string>()

export function readStorageItem(key: string): string | null {
  const storage = getBrowserStorage()

  if (!storage) {
    return memoryFallback.get(key) ?? null
  }

  try {
    return storage.getItem(key)
  } catch {
    notifyStorageError('No se pudieron leer los datos guardados en este navegador.')
    return memoryFallback.get(key) ?? null
  }
}

export function writeStorageItem(key: string, value: string): void {
  const storage = getBrowserStorage()

  if (storage) {
    try {
      storage.setItem(key, value)
      return
    } catch {
      notifyStorageError(
        'No se pudieron guardar los datos. Revisa el espacio disponible o si estás en modo privado.',
      )
    }
  } else {
    notifyStorageError(
      'Este navegador no permite guardar datos localmente. Los cambios se perderán al recargar.',
    )
  }

  memoryFallback.set(key, value)
}

export function removeStorageItem(key: string): void {
  memoryFallback.delete(key)

  const storage = getBrowserStorage()
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch {
    notifyStorageError('No se pudieron borrar los datos guardados en este navegador.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null
  } catch {
    return null
  }
}

/** Guarda una copia del dato corrupto antes de descartarlo. */
export function backupCorruptData(payload: unknown): void {
  if (payload === undefined || payload === null) {
    return
  }

  const raw = typeof payload === 'string' ? payload : safeStringify(payload)
  if (raw === null) {
    return
  }

  writeStorageItem(BACKUP_KEY, raw)
}

interface StoredEnvelope {
  state: unknown
  version: number
}

function parseEnvelope(raw: string): StoredEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed) || typeof parsed.version !== 'number' || !('state' in parsed)) {
      return null
    }

    return { state: parsed.state, version: parsed.version }
  } catch {
    return null
  }
}

/**
 * Adaptador de `zustand/persist` que nunca lanza: si el JSON está corrupto,
 * guarda una copia en `invest-calc:backup` y arranca sin datos.
 */
export const projectsStorage: PersistStorage<PersistedProjectsState> = {
  getItem: (name) => {
    const raw = readStorageItem(name)

    if (raw === null) {
      return null
    }

    const envelope = parseEnvelope(raw)
    if (!envelope) {
      backupCorruptData(raw)
      return null
    }

    return {
      state: envelope.state as PersistedProjectsState,
      version: envelope.version,
    }
  },
  setItem: (name, value: StorageValue<PersistedProjectsState>) => {
    writeStorageItem(name, JSON.stringify(value))
  },
  removeItem: (name) => {
    removeStorageItem(name)
  },
}
