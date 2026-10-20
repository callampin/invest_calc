import type { Project, ProjectResult } from '../../domain/types'
import { cn } from '../../utils/cn'
import { formatMoney, formatPercent } from '../../utils/format'

interface ChartSegment {
  key: string
  label: string
  amount: number
  fill: string
  swatch: string
}

export interface CostCompositionChartProps {
  project: Project
  result: ProjectResult
}

export function CostCompositionChart({ project, result }: CostCompositionChartProps) {
  const segments: ChartSegment[] = [
    {
      key: 'product',
      label: 'Productos',
      amount: result.productCostTotal,
      fill: 'fill-sky-600',
      swatch: 'bg-sky-600',
    },
    {
      key: 'shipping',
      label: 'Envío',
      amount: result.shippingTotal,
      fill: 'fill-cyan-500',
      swatch: 'bg-cyan-500',
    },
    {
      key: 'upfront',
      label: 'Otros costos iniciales',
      amount: result.upfrontCostsTotal,
      fill: 'fill-amber-500',
      swatch: 'bg-amber-500',
    },
    {
      key: 'sales',
      label: 'Comisiones de venta',
      amount: result.salesCostsTotal,
      fill: 'fill-rose-600',
      swatch: 'bg-rose-600',
    },
  ].filter((segment) => segment.amount > 0)

  const total = segments.reduce((sum, segment) => sum + segment.amount, 0)

  if (total <= 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Composición de costos
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Todavía no hay costos registrados para graficar.
        </p>
      </div>
    )
  }

  const description = `Composición del costo total (${formatMoney(total, project.currency)}): ${segments
    .map(
      (segment) =>
        `${segment.label} ${formatMoney(segment.amount, project.currency)} (${formatPercent(
          (segment.amount / total) * 100,
        )})`,
    )
    .join(', ')}.`

  let offset = 0

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Composición de costos
      </h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Peso de cada bloque sobre el costo total.
      </p>

      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={description}
        className="mt-3 h-6 w-full overflow-hidden rounded"
      >
        {segments.map((segment) => {
          const width = (segment.amount / total) * 100
          const x = offset
          offset += width

          return (
            <rect
              key={segment.key}
              x={x}
              y={0}
              width={width}
              height={10}
              className={segment.fill}
            />
          )
        })}
      </svg>

      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', segment.swatch)}
            />
            <span className="flex-1 text-slate-700 dark:text-slate-300">{segment.label}</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {formatMoney(segment.amount, project.currency)}
            </span>
            <span className="w-12 text-right tabular-nums text-slate-500 dark:text-slate-400">
              {formatPercent((segment.amount / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
