import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { selectActiveProject, useProjectsStore } from '../../store/useProjectsStore'
import { resetProjectsStore } from '../../test/storeUtils'
import { ProductForm } from './ProductForm'

function ActiveProductForm() {
  const project = useProjectsStore(selectActiveProject)

  return project ? <ProductForm project={project} /> : null
}

function setup() {
  const user = userEvent.setup()
  const id = useProjectsStore.getState().createProject({ name: 'Mi producto' })
  render(<ActiveProductForm />)

  return { user, id }
}

beforeEach(() => {
  resetProjectsStore()
})

describe('ProductForm', () => {
  it('muestra los datos del proyecto activo', () => {
    setup()

    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Mi producto')
    expect(screen.getByLabelText('Moneda')).toHaveValue('CLP')
    expect(screen.getByLabelText('Cantidad de unidades')).toHaveValue('1')
    expect(screen.getByLabelText('Costo unitario')).toHaveValue('')
    expect(screen.getByLabelText('Costo de envío')).toHaveValue('')
    expect(screen.getByLabelText('Precio de venta por unidad')).toHaveValue('')
  })

  it('actualiza la cantidad en el store', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Cantidad de unidades')

    await user.clear(input)
    await user.type(input, '25')

    expect(useProjectsStore.getState().projects[0]?.quantity).toBe(25)
  })

  it('confirma el nombre al salir del campo', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Nombre del proyecto')

    await user.clear(input)
    await user.type(input, 'Audífonos')
    await user.tab()

    expect(useProjectsStore.getState().projects[0]?.name).toBe('Audífonos')
  })

  it('cambia la moneda', async () => {
    const { user } = setup()

    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')

    expect(useProjectsStore.getState().projects[0]?.currency).toBe('USD')
  })

  it('cambia el tipo de envío y actualiza la ayuda', async () => {
    const { user } = setup()

    await user.selectOptions(screen.getByLabelText('Tipo de envío'), 'perUnit')

    expect(useProjectsStore.getState().projects[0]?.shippingMode).toBe('perUnit')
    expect(screen.getByText(/se multiplica por la cantidad/i)).toBeInTheDocument()
  })

  it('acepta montos con coma decimal', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Costo unitario')

    await user.type(input, '12,5')

    expect(useProjectsStore.getState().projects[0]?.unitCost).toBe(12.5)
  })

  it('ignora montos negativos', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Precio de venta por unidad')

    await user.type(input, '-10')

    expect(useProjectsStore.getState().projects[0]?.unitSalePrice).toBe(10)
  })
})
