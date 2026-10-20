import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectsStore, selectActiveProject } from '../../store/useProjectsStore'
import { resetProjectsStore } from '../../test/storeUtils'
import { CostList } from './CostList'

function ActiveCostList() {
  const project = useProjectsStore(selectActiveProject)

  return project ? <CostList project={project} /> : null
}

function setup() {
  const user = userEvent.setup()
  const id = useProjectsStore.getState().createProject({ name: 'Costos' })
  render(<ActiveCostList />)

  return { user, id }
}

function rowFor(title: string): HTMLElement {
  const input = screen.getByDisplayValue(title)
  const row = input.closest('li')

  if (!row) {
    throw new Error(`No se encontró la fila de ${title}`)
  }

  return row
}

function costByTitle(title: string) {
  return useProjectsStore.getState().projects[0]?.costs.find((cost) => cost.title === title)
}

beforeEach(() => {
  resetProjectsStore()
})

describe('CostList', () => {
  it('lista los costos predefinidos del proyecto', () => {
    setup()

    expect(screen.getByDisplayValue('Arancel aduanero')).toBeInTheDocument()
    expect(screen.getByDisplayValue('IVA importación')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Comisión plataforma')).toBeInTheDocument()
  })

  it('explica la base de cálculo seleccionada', () => {
    setup()

    expect(
      within(rowFor('IVA importación')).getByText(/CIF \+ los costos anteriores/i),
    ).toBeInTheDocument()
    expect(
      within(rowFor('Arancel aduanero')).getByText(/CIF = costo de los productos/i),
    ).toBeInTheDocument()
  })

  it('edita el porcentaje de un costo', async () => {
    const { user } = setup()
    const row = rowFor('IVA importación')

    const input = within(row).getByLabelText('Porcentaje')
    await user.clear(input)
    await user.type(input, '21')

    expect(costByTitle('IVA importación')?.value).toBe(21)
  })

  it('edita el título con commit al salir', async () => {
    const { user } = setup()
    const row = rowFor('Arancel aduanero')
    const input = within(row).getByLabelText('Título')

    await user.clear(input)
    await user.type(input, 'Derecho de importación')
    await user.tab()

    expect(costByTitle('Derecho de importación')).toBeDefined()
    expect(costByTitle('Arancel aduanero')).toBeUndefined()
  })

  it('cambia el tipo a monto fijo y muestra el modo', async () => {
    const { user } = setup()
    const row = rowFor('IVA importación')

    await user.selectOptions(within(row).getByLabelText('Tipo'), 'fixed')

    expect(costByTitle('IVA importación')?.kind).toBe('fixed')
    expect(within(row).getByText('Modo')).toBeInTheDocument()
    expect(within(row).getByText(/monto fijo para todo el pedido/i)).toBeInTheDocument()
  })

  it('cambia la base de cálculo', async () => {
    const { user } = setup()
    const row = rowFor('Arancel aduanero')

    await user.selectOptions(within(row).getByLabelText('Base de cálculo'), 'revenue')

    expect(costByTitle('Arancel aduanero')?.base).toBe('revenue')
  })

  it('activa y desactiva un costo', async () => {
    const { user } = setup()
    const row = rowFor('IVA importación')
    const checkbox = within(row).getByLabelText('Activo')

    await user.click(checkbox)

    expect(costByTitle('IVA importación')?.enabled).toBe(false)
  })

  it('elimina un costo', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Eliminar IVA importación' }))

    expect(useProjectsStore.getState().projects[0]?.costs).toHaveLength(2)
    expect(costByTitle('IVA importación')).toBeUndefined()
  })

  it('mueve un costo hacia abajo y respeta los límites', async () => {
    const { user } = setup()

    expect(screen.getByRole('button', { name: 'Subir Arancel aduanero' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar Comisión plataforma' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Bajar Arancel aduanero' }))

    expect(useProjectsStore.getState().projects[0]?.costs.map((cost) => cost.title)).toEqual([
      'IVA importación',
      'Arancel aduanero',
      'Comisión plataforma',
    ])
  })

  it('restablece el valor de un preset editado', async () => {
    const { user } = setup()
    const row = rowFor('IVA importación')

    const input = within(row).getByLabelText('Porcentaje')
    await user.clear(input)
    await user.type(input, '21')

    await user.click(screen.getByRole('button', { name: 'Restablecer valor por defecto' }))

    expect(costByTitle('IVA importación')?.value).toBe(19)
    expect(screen.queryByRole('button', { name: 'Restablecer valor por defecto' })).toBeNull()
  })

  it('avisa cuando un porcentaje supera 100', async () => {
    const { user } = setup()
    const row = rowFor('Arancel aduanero')
    const input = within(row).getByLabelText('Porcentaje')

    await user.clear(input)
    await user.type(input, '150')

    expect(within(row).getByRole('status')).toHaveTextContent(/mayor a 100/i)
  })

  it('agrega un costo personalizado', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Agregar costo personalizado'))
    await user.type(screen.getByLabelText('Título del costo'), 'Embalaje')

    const form = screen.getByLabelText('Título del costo').closest('form')
    if (!form) {
      throw new Error('No se encontró el formulario')
    }

    await user.type(within(form).getByLabelText('Porcentaje'), '5')
    await user.click(within(form).getByRole('button', { name: 'Agregar costo' }))

    const costs = useProjectsStore.getState().projects[0]?.costs ?? []
    expect(costs).toHaveLength(4)
    expect(costs.at(-1)).toMatchObject({ title: 'Embalaje', kind: 'percent', value: 5 })
  })

  it('no agrega un costo sin título', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Agregar costo personalizado'))

    expect(screen.getByRole('button', { name: 'Agregar costo' })).toBeDisabled()
    expect(useProjectsStore.getState().projects[0]?.costs).toHaveLength(3)
  })

  it('marca el IVA de Chile como recuperable por defecto', () => {
    setup()

    expect(
      within(rowFor('IVA importación')).getByLabelText('Recuperable: IVA importación'),
    ).toBeChecked()
  })

  it('permite marcar y desmarcar un costo como recuperable', async () => {
    const { user } = setup()
    const row = rowFor('Arancel aduanero')
    const checkbox = within(row).getByLabelText('Recuperable: Arancel aduanero')

    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)

    expect(costByTitle('Arancel aduanero')?.recoverable).toBe(true)
    expect(within(row).getByText(/no cuenta como costo real/i)).toBeInTheDocument()
  })

  it('vuelve a agregar un preset eliminado desde el selector', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Eliminar IVA importación' }))

    const picker = screen.getByRole('heading', { name: 'Costos predefinidos' }).closest('section')
    if (!picker) {
      throw new Error('No se encontró el selector de presets')
    }

    expect(within(picker).getByText(/valores verificados el 2026-10-20/i)).toBeInTheDocument()

    await user.click(within(picker).getByRole('button', { name: 'Agregar' }))

    expect(costByTitle('IVA importación')).toBeDefined()
    expect(useProjectsStore.getState().projects[0]?.costs).toHaveLength(3)
  })

  it('oculta los presets que ya están en el proyecto', () => {
    setup()

    expect(screen.getByText(/ya agregaste todos los costos predefinidos/i)).toBeInTheDocument()
  })

  it('muestra el estado vacío sin costos', () => {
    const id = useProjectsStore.getState().createProject()
    const project = useProjectsStore.getState().projects[0]
    if (!project) {
      throw new Error('Falta el proyecto')
    }

    for (const cost of project.costs) {
      useProjectsStore.getState().removeCost(id, cost.id)
    }

    render(<ActiveCostList />)

    expect(screen.getByText(/no hay costos todavía/i)).toBeInTheDocument()
  })
})
