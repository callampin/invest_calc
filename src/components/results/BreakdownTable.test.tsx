import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calculateProject } from '../../domain/calculate'
import { makeProject, makeReferenceProject } from '../../test/factories'
import { formatMoney } from '../../utils/format'
import { BreakdownTable } from './BreakdownTable'

function setup(project = makeReferenceProject()) {
  const result = calculateProject(project)
  render(<BreakdownTable project={project} result={result} />)

  return { project, result }
}

describe('BreakdownTable', () => {
  it('separa los costos antes de vender de los que se cobran al vender', () => {
    const { project } = setup()
    const table = within(screen.getByRole('table'))
    const currency = project.currency

    expect(table.getByText(/antes de vender \(inversión\)/i)).toBeInTheDocument()
    expect(table.getByText(/al vender \(comisiones\)/i)).toBeInTheDocument()
    expect(table.getByText('Arancel')).toBeInTheDocument()
    expect(table.getByText('IVA')).toBeInTheDocument()
    expect(table.getByText('Envío por volumen')).toBeInTheDocument()
    expect(table.getByText('Comisión plataforma')).toBeInTheDocument()
    expect(table.getAllByText(formatMoney(180, currency))).toHaveLength(2)
  })

  it('muestra las bases de cálculo', () => {
    setup()
    const table = within(screen.getByRole('table'))

    expect(table.getByText('CIF')).toBeInTheDocument()
    expect(table.getByText('CIF + anteriores')).toBeInTheDocument()
    expect(table.getByText('Ventas')).toBeInTheDocument()
    expect(table.getByText('Fijo')).toBeInTheDocument()
  })

  it('muestra los totales e ingresos', () => {
    const { project, result } = setup()
    const table = within(screen.getByRole('table'))
    const currency = project.currency

    expect(table.getByText('Total inversión')).toBeInTheDocument()
    expect(table.getAllByText(formatMoney(result.totalInvestment, currency)).length).toBe(1)
    expect(table.getByText(formatMoney(result.revenue, currency))).toBeInTheDocument()
    expect(table.getAllByText(formatMoney(result.totalCosts, currency)).length).toBe(1)
  })

  it('avisa cuando no hay comisiones sobre ventas', () => {
    setup(makeProject({ unitSalePrice: 0 }))

    expect(screen.getByText(/sin comisiones sobre las ventas/i)).toBeInTheDocument()
  })

  it('marca la ganancia negativa con icono y texto', () => {
    setup(makeProject({ unitSalePrice: 0 }))
    const table = within(screen.getByRole('table'))

    expect(table.getByText('negativo')).toBeInTheDocument()
    expect(table.getByText('▼')).toBeInTheDocument()
  })

  it('marca las líneas recuperables', () => {
    const project = makeReferenceProject()
    project.costs = project.costs.map((cost) =>
      cost.id === 'iva' ? { ...cost, recoverable: true } : cost,
    )
    setup(project)

    expect(screen.getByText('recuperable')).toBeInTheDocument()
  })

  it('incluye un caption con el nombre del proyecto', () => {
    setup()

    expect(screen.getByRole('table')).toHaveAccessibleName(/Proyecto de prueba/)
  })
})
