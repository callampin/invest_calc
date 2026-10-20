import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProject } from '../test/factories'
import {
  buildExportPayload,
  downloadProjectsFile,
  EXPORT_APP_ID,
  EXPORT_VERSION,
  parseProjectsFile,
  serializeProjects,
} from './exportImport'

const project = makeProject({ name: 'Exportado' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildExportPayload', () => {
  it('arma el sobre con app, versión y fecha ISO', () => {
    const payload = buildExportPayload([project], project.id, new Date('2026-10-20T12:00:00.000Z'))

    expect(payload).toMatchObject({
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION,
      exportedAt: '2026-10-20T12:00:00.000Z',
      activeProjectId: project.id,
    })
    expect(payload.projects).toHaveLength(1)
  })
})

describe('parseProjectsFile', () => {
  it('lee un archivo exportado y conserva los proyectos', () => {
    const raw = serializeProjects(buildExportPayload([project], project.id))
    const result = parseProjectsFile(raw)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.projects[0]?.name).toBe('Exportado')
      expect(result.activeProjectId).toBe(project.id)
    }
  })

  it('rechaza JSON inválido', () => {
    expect(parseProjectsFile('{no-json')).toEqual({
      ok: false,
      error: 'El archivo no es un JSON válido.',
    })
  })

  it('rechaza archivos de otra aplicación o con forma incorrecta', () => {
    const result = parseProjectsFile(JSON.stringify({ hola: 'mundo' }))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/formato esperado/i)
    }
  })

  it('rechaza archivos sin proyectos', () => {
    const raw = JSON.stringify({
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION,
      exportedAt: '2026-10-20T00:00:00.000Z',
      projects: [],
      activeProjectId: null,
    })

    expect(parseProjectsFile(raw).ok).toBe(false)
  })

  it('rechaza proyectos corruptos', () => {
    const raw = JSON.stringify({
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION,
      exportedAt: '2026-10-20T00:00:00.000Z',
      projects: [{ id: 'roto' }],
      activeProjectId: null,
    })

    expect(parseProjectsFile(raw).ok).toBe(false)
  })

  it('rechaza archivos de una versión futura', () => {
    const raw = JSON.stringify({
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION + 1,
      exportedAt: '2026-10-20T00:00:00.000Z',
      projects: [project],
      activeProjectId: null,
    })

    const result = parseProjectsFile(raw)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/versión más nueva/i)
    }
  })
})

describe('downloadProjectsFile', () => {
  it('genera el archivo con el nombre y el tipo correctos', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const filename = downloadProjectsFile(
      buildExportPayload([project], project.id, new Date('2026-10-20T00:00:00.000Z')),
    )

    expect(filename).toBe('calculadora-inversion-2026-10-20.json')
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(click).toHaveBeenCalled()
  })
})
