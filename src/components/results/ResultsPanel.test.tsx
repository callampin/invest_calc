import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { calculateProject } from '../../domain/calculate'
import { makeProject, makeReferenceProject } from '../../test/factories'
import { formatMoney, formatPercent } from '../../utils/format'
import { ResultsPanel } from './ResultsPanel'

function setup(project = makeReferenceProject()) {
  const result = calculateProject(project)
  const user = userEvent.setup()
  render(<ResultsPanel project={project} result={result} />)

  return { user, project, result }
}

function desktopPanel(): HTMLElement {
  const heading = screen.getByRole('heading', { name: 'Resultados' })
  const section = heading.closest('section')

  if (!section) {
    throw new Error('No se encontró el panel de resultados')
  }

  return section
}

describe('ResultsPanel', () => {
  it('muestra las siete métricas del ejemplo de referencia', () => {
    const { project, result } = setup()
    const panel = within(desktopPanel())
    const currency = project.currency

    expect(panel.getByText('Inversión total')).toBeInTheDocument()
    expect(panel.getByText(formatMoney(result.totalInvestment, currency))).toBeInTheDocument()
    expect(panel.getByText(formatMoney(result.revenue, currency))).toBeInTheDocument()
    expect(panel.getByText(formatMoney(result.netProfit, currency))).toBeInTheDocument()
    expect(panel.getByText(formatPercent(result.marginPct))).toBeInTheDocument()
    expect(panel.getByText(formatPercent(result.roiPct))).toBeInTheDocument()
    expect(panel.getByText(formatMoney(result.landedUnitCost, currency))).toBeInTheDocument()
    expect(
      panel.getByText(formatMoney(result.breakEvenUnitPrice ?? 0, currency)),
    ).toBeInTheDocument()
    expect(panel.getByText('Precio de equilibrio')).toBeInTheDocument()
  })

  it('anuncia los resultados en una región aria-live', () => {
    setup()

    const liveRegion = desktopPanel().querySelector('[aria-live="polite"]')

    expect(liveRegion).toHaveTextContent(/inversión total/i)
    expect(liveRegion).toHaveTextContent(/ganancia neta/i)
  })

  it('marca las pérdidas con icono y texto, no solo con color', () => {
    const project = makeProject({ unitSalePrice: 0 })
    setup(project)

    const panel = within(desktopPanel())

    expect(panel.getAllByText('negativo').length).toBeGreaterThan(0)
    expect(panel.getAllByText('▼').length).toBeGreaterThan(0)
  })

  it('indica cuando no existe precio de equilibrio', () => {
    const project = makeProject({
      costs: [
        {
          id: 'comision',
          title: 'Comisión',
          kind: 'percent',
          value: 100,
          base: 'revenue',
          fixedMode: 'total',
          enabled: true,
        },
      ],
    })
    setup(project)

    expect(within(desktopPanel()).getByText('No existe')).toBeInTheDocument()
  })

  it('muestra inversión de caja y costo real con costos recuperables', () => {
    const project = makeReferenceProject()
    project.costs = project.costs.map((cost) =>
      cost.id === 'iva' ? { ...cost, recoverable: true } : cost,
    )
    const { result } = setup(project)
    const panel = within(desktopPanel())

    expect(panel.getByText('Inversión de caja')).toBeInTheDocument()
    expect(panel.getByText('Costo real de inversión')).toBeInTheDocument()
    expect(
      panel.getByText(formatMoney(result.realInvestmentCost, project.currency)),
    ).toBeInTheDocument()
  })

  it('expande y colapsa el detalle en la barra móvil', async () => {
    const { user, result, project } = setup()
    const toggle = screen.getByRole('button', { name: /ver detalle/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Inversión total')).toHaveLength(1)

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('Inversión total')).toHaveLength(2)
    expect(
      screen.getAllByText(formatMoney(result.netProfit, project.currency)).length,
    ).toBeGreaterThan(1)

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
