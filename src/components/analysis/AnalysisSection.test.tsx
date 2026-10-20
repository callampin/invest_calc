import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { calculateProject } from '../../domain/calculate'
import { makeProject, makeReferenceProject } from '../../test/factories'
import { formatMoney } from '../../utils/format'
import { CostCompositionChart } from './CostCompositionChart'
import { parseQuantities } from './parseQuantities'
import { ScenarioComparator } from './ScenarioComparator'
import { SensitivityTable } from './SensitivityTable'

describe('parseQuantities', () => {
  it('acepta comas, espacios y punto y coma', () => {
    expect(parseQuantities('50, 100; 500 20')).toEqual([50, 100, 500, 20])
  })

  it('descarta valores inválidos y duplicados', () => {
    expect(parseQuantities('10, diez, -5, 0, 10')).toEqual([10])
  })

  it('limita a 6 cantidades', () => {
    expect(parseQuantities('1,2,3,4,5,6,7,8')).toHaveLength(6)
  })
})

describe('ScenarioComparator', () => {
  function setup(project = makeReferenceProject()) {
    const user = userEvent.setup()
    render(<ScenarioComparator project={project} />)

    return { user }
  }

  it('compara las cantidades por defecto e incluye la actual', () => {
    setup()

    expect(screen.getByRole('rowheader', { name: '50' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /100/ })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: '500' })).toBeInTheDocument()
    expect(screen.getByText('actual')).toBeInTheDocument()
  })

  it('calcula la inversión y la ganancia por escenario', () => {
    setup()

    const row = screen.getByRole('rowheader', { name: '50' }).closest('tr')
    if (!row) {
      throw new Error('No se encontró la fila de 50 unidades')
    }

    // q=50 → CIF 330 + arancel 19,8 + IVA 66,462 + fijo 50 = 466,262
    expect(within(row).getByText(formatMoney(466.262, 'USD'))).toBeInTheDocument()
    // ingresos 750 − comisión 90 − inversión 466,262 = 193,738
    expect(within(row).getByText(formatMoney(193.738, 'USD'))).toBeInTheDocument()
  })

  it('actualiza los escenarios al editar las cantidades', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Cantidades a comparar')

    await user.clear(input)
    await user.type(input, '10, 50')

    expect(screen.getByRole('rowheader', { name: '10' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /100/ })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: '500' })).toBeNull()
  })

  it('vuelve a la cantidad actual si la entrada no es válida', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Cantidades a comparar')

    await user.clear(input)
    await user.type(input, 'abc')

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(2) // encabezado + cantidad actual
  })

  it('no supera los 6 escenarios', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('Cantidades a comparar')

    await user.clear(input)
    await user.type(input, '1,2,3,4,5,6,7,8')

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(7) // encabezado + 6 escenarios
  })
})

describe('SensitivityTable', () => {
  it('muestra cinco precios alrededor del actual', () => {
    render(<SensitivityTable project={makeReferenceProject()} />)

    expect(screen.getByText('-20 %')).toBeInTheDocument()
    expect(screen.getByText('Actual')).toBeInTheDocument()
    expect(screen.getByText('+20 %')).toBeInTheDocument()
    expect(screen.getByText(formatMoney(12, 'USD'))).toBeInTheDocument()
    expect(screen.getByText(formatMoney(18, 'USD'))).toBeInTheDocument()
  })

  it('pide un precio cuando el proyecto no tiene', () => {
    render(<SensitivityTable project={makeProject({ unitSalePrice: 0 })} />)

    expect(screen.getByText(/ingresa un precio de venta mayor que 0/i)).toBeInTheDocument()
  })

  it('marca las pérdidas con icono y texto', () => {
    render(<SensitivityTable project={makeProject({ unitCost: 50 })} />)

    expect(screen.getAllByText('negativo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('▼').length).toBeGreaterThan(0)
  })
})

describe('CostCompositionChart', () => {
  function setup(project = makeReferenceProject()) {
    const result = calculateProject(project)
    const { container } = render(<CostCompositionChart project={project} result={result} />)

    return { container, result }
  }

  it('dibuja un segmento por bloque de costos', () => {
    const { container } = setup()

    expect(container.querySelectorAll('rect')).toHaveLength(4)
    expect(screen.getByRole('img', { name: /composición del costo total/i })).toBeInTheDocument()
  })

  it('incluye una leyenda con montos y porcentajes', () => {
    setup()

    expect(screen.getByText('Productos')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    expect(screen.getByText('Otros costos iniciales')).toBeInTheDocument()
    expect(screen.getByText('Comisiones de venta')).toBeInTheDocument()
  })

  it('avisa cuando no hay costos', () => {
    setup(makeProject({ quantity: 1, unitCost: 0, shippingValue: 0, unitSalePrice: 0 }))

    expect(screen.getByText(/no hay costos registrados/i)).toBeInTheDocument()
  })
})
