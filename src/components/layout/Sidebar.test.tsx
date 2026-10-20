import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetProjectsStore } from '../../test/storeUtils'
import { useProjectsStore } from '../../store/useProjectsStore'
import { Sidebar } from './Sidebar'

beforeEach(() => {
  resetProjectsStore()
  vi.restoreAllMocks()
})

describe('Sidebar', () => {
  it('muestra el estado vacío', () => {
    render(<Sidebar />)

    expect(screen.getByText(/sin proyectos todavía/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nuevo proyecto/i })).toBeInTheDocument()
  })

  it('crea un proyecto desde el botón', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }))

    expect(useProjectsStore.getState().projects).toHaveLength(1)
    expect(screen.getByText('Proyecto 1')).toBeInTheDocument()
  })

  it('marca el proyecto activo con aria-current', () => {
    const id = useProjectsStore.getState().createProject({ name: 'Activo' })
    useProjectsStore.getState().createProject({ name: 'Otro' })
    useProjectsStore.getState().setActiveProject(id)

    render(<Sidebar />)

    expect(screen.getByRole('button', { name: /^Activo/ })).toHaveAttribute('aria-current', 'page')
  })

  it('cambia de proyecto al hacer clic', async () => {
    const user = userEvent.setup()
    const first = useProjectsStore.getState().createProject({ name: 'Primero' })
    useProjectsStore.getState().createProject({ name: 'Segundo' })
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: /^Primero/ }))

    expect(useProjectsStore.getState().activeProjectId).toBe(first)
  })

  it('duplica un proyecto', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Original' })
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Duplicar Original' }))

    const state = useProjectsStore.getState()
    expect(state.projects.map((project) => project.name)).toEqual(['Original', 'Original (copia)'])
    expect(state.activeProjectId).toBe(state.projects[1]?.id)
  })

  it('renombra desde la lista con Enter', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Viejo' })
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Renombrar Viejo' }))
    const input = screen.getByLabelText('Nuevo nombre del proyecto')

    await user.clear(input)
    await user.type(input, 'Nuevo{Enter}')

    expect(useProjectsStore.getState().projects[0]?.name).toBe('Nuevo')
  })

  it('cancela el renombrado con Escape', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Viejo' })
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Renombrar Viejo' }))
    const input = screen.getByLabelText('Nuevo nombre del proyecto')

    await user.type(input, 'Otro{Escape}')

    expect(useProjectsStore.getState().projects[0]?.name).toBe('Viejo')
    expect(screen.queryByLabelText('Nuevo nombre del proyecto')).not.toBeInTheDocument()
  })

  it('elimina un proyecto tras confirmar', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Borrar' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Eliminar Borrar' }))

    expect(useProjectsStore.getState().projects).toHaveLength(0)
  })

  it('no elimina si se cancela la confirmación', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Queda' })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Eliminar Queda' }))

    expect(useProjectsStore.getState().projects).toHaveLength(1)
  })

  it('expande y contrae la lista en móvil', async () => {
    const user = userEvent.setup()
    useProjectsStore.getState().createProject({ name: 'Uno' })
    render(<Sidebar />)

    const toggle = screen.getByRole('button', { name: /proyectos \(1\)/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
