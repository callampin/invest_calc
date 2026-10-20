import { z } from 'zod'
import { projectSchema } from '../domain/schemas'
import type { Project } from '../domain/types'

export const EXPORT_APP_ID = 'calculadora-inversion'
export const EXPORT_VERSION = 1

const exportPayloadSchema = z.object({
  app: z.literal(EXPORT_APP_ID),
  version: z.number().int().positive(),
  exportedAt: z.string().min(1),
  projects: z.array(projectSchema).min(1),
  activeProjectId: z.string().min(1).nullable(),
})

export type ExportPayload = z.infer<typeof exportPayloadSchema>

export type ParseImportResult =
  { ok: true; projects: Project[]; activeProjectId: string | null } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function buildExportPayload(
  projects: Project[],
  activeProjectId: string | null,
  now: Date = new Date(),
): ExportPayload {
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    projects,
    activeProjectId,
  }
}

export function serializeProjects(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2)
}

/** Valida un archivo importado. Nunca lanza: devuelve un error legible. */
export function parseProjectsFile(raw: string): ParseImportResult {
  let data: unknown

  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }

  if (isRecord(data) && typeof data.version === 'number' && data.version > EXPORT_VERSION) {
    return {
      ok: false,
      error: 'El archivo se creó con una versión más nueva de la calculadora.',
    }
  }

  const parsed = exportPayloadSchema.safeParse(data)

  if (!parsed.success) {
    return {
      ok: false,
      error: 'El archivo no tiene el formato esperado. Expórtalo desde esta calculadora.',
    }
  }

  return {
    ok: true,
    projects: parsed.data.projects,
    activeProjectId: parsed.data.activeProjectId,
  }
}

/** Descarga los proyectos como `.json` y devuelve el nombre del archivo. */
export function downloadProjectsFile(payload: ExportPayload): string {
  const filename = `calculadora-inversion-${payload.exportedAt.slice(0, 10)}.json`
  const blob = new Blob([serializeProjects(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return filename
}
