import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../store/storage'
import { useProjectsStore } from '../../store/useProjectsStore'
import { useUiStore } from '../../store/useUiStore'
import { resetProjectsStore } from '../../test/storeUtils'
import { makeReferenceProject } from '../../test/factories'
import { buildExportPayload, serializeProjects } from '../../utils/exportImport'
import { Toaster } from '../common/Toaster'
import { DataActions } from './DataActions'

function setup() {
  const user = userEvent.setup()
  render(
    <>
      <DataActions />
      <Toaster />
    </>,
  )

  return { user }
}

function importFile(user: ReturnType<typeof userEvent.setup>, content: string) {
  const input = screen.getByLabelText('Archivo JSON para importar')
  const file = new File([content], 'datos.json', { type: 'application/json' })

  return user.upload(input, file)
}

function exportedFile(projects = [makeReferenceProject()]): string {
  return serializeProjects(buildExportPayload(projects, projects[0]?.id ?? null))
}

beforeEach(() => {
  resetProjectsStore()
  useUiStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DataActions', () => {
  it('avisa cuando no hay proyectos para exportar', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Exportar JSON' }))

    expect(screen.getByRole('status')).toHaveTextContent(/no hay proyectos para exportar/i)
  })

  it('exporta un archivo JSON', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject({ name: 'Para exportar' })

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
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button', { name: 'Exportar JSON' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/copia exportada/i)
  })

  it('fusiona proyectos importados', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject({ name: 'Local' })

    await importFile(user, exportedFile())

    const dialog = await screen.findByRole('dialog', { name: 'Importar proyectos' })
    expect(dialog).toHaveTextContent(/1 proyecto/i)

    await user.click(within(dialog).getByRole('button', { name: 'Fusionar' }))

    expect(useProjectsStore.getState().projects).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('Se importó 1 proyecto.')
  })

  it('reemplaza los proyectos al importar', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject({ name: 'Local' })

    await importFile(user, exportedFile())

    const dialog = await screen.findByRole('dialog', { name: 'Importar proyectos' })
    await user.click(within(dialog).getByRole('button', { name: 'Reemplazar' }))

    const state = useProjectsStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0]?.name).toBe('Proyecto de prueba')
  })

  it('cancela la importación sin tocar los datos', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject({ name: 'Local' })

    await importFile(user, exportedFile())

    const dialog = await screen.findByRole('dialog', { name: 'Importar proyectos' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useProjectsStore.getState().projects).toHaveLength(1)
  })

  it('rechaza archivos inválidos con un error', async () => {
    const { user } = setup()

    await importFile(user, '{esto no es json')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(/no es un json válido/i)
  })

  it('borra todos los datos tras confirmar', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject()

    await user.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    const dialog = screen.getByRole('dialog', { name: 'Borrar todos los datos' })

    await user.click(within(dialog).getByRole('button', { name: 'Borrar todo' }))

    expect(useProjectsStore.getState().projects).toHaveLength(0)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(/se borraron todos los datos/i)
  })

  it('cierra el modal de borrado al cancelar', async () => {
    const { user } = setup()
    useProjectsStore.getState().createProject()

    await user.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    const dialog = screen.getByRole('dialog', { name: 'Borrar todos los datos' })

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useProjectsStore.getState().projects).toHaveLength(1)
  })
})
