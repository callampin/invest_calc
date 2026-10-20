import type { Project, ProjectResult } from '../../domain/types'
import { formatMoney, formatPercent } from '../../utils/format'
import { ResultCard } from './ResultCard'

export interface ResultsMetricsProps {
  project: Project
  result: ProjectResult
}

export function ResultsMetrics({ project, result }: ResultsMetricsProps) {
  const currency = project.currency
  const isLoss = result.netProfit < 0

  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1">
      <ResultCard
        label="Inversión total"
        value={formatMoney(result.totalInvestment, currency)}
        hint="Lo que debes desembolsar antes de vender."
      />
      <ResultCard
        label="Ingresos"
        value={formatMoney(result.revenue, currency)}
        hint="Precio de venta × unidades."
      />
      <ResultCard
        label="Ganancia neta"
        value={formatMoney(result.netProfit, currency)}
        hint={`Equivale a ${formatMoney(result.profitPerUnit, currency)} por unidad.`}
        tone={isLoss ? 'negative' : 'positive'}
        emphasis
      />
      <ResultCard
        label="Margen"
        value={formatPercent(result.marginPct)}
        hint="Ganancia sobre las ventas."
        tone={result.marginPct !== null && result.marginPct < 0 ? 'negative' : 'default'}
      />
      <ResultCard
        label="ROI"
        value={formatPercent(result.roiPct)}
        hint="Ganancia sobre la inversión."
        tone={result.roiPct !== null && result.roiPct < 0 ? 'negative' : 'default'}
      />
      <ResultCard
        label="Costo unitario en bodega"
        value={formatMoney(result.landedUnitCost, currency)}
        hint="Inversión total ÷ unidades."
      />
      {result.recoverableCostsTotal > 0 && (
        <>
          <ResultCard
            label="Inversión de caja"
            value={formatMoney(result.totalInvestment, currency)}
            hint="Desembolso antes de vender."
          />
          <ResultCard
            label="Costo real de inversión"
            value={formatMoney(result.realInvestmentCost, currency)}
            hint="Sin contar el IVA u otros costos que recuperas."
          />
        </>
      )}
      <ResultCard
        label="Precio de equilibrio"
        value={
          result.breakEvenUnitPrice === null
            ? 'No existe'
            : formatMoney(result.breakEvenUnitPrice, currency)
        }
        hint={
          result.breakEvenUnitPrice === null
            ? 'Las comisiones sobre ventas llegan al 100 % o más.'
            : 'Precio mínimo por unidad para no perder.'
        }
      />
    </dl>
  )
}
