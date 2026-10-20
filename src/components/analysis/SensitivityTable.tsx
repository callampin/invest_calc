import { calculateProject } from '../../domain/calculate'
import type { Project } from '../../domain/types'
import { cn } from '../../utils/cn'
import { formatMoney, formatPercent } from '../../utils/format'

const VARIATIONS = [
  { label: '-20 %', factor: 0.8 },
  { label: '-10 %', factor: 0.9 },
  { label: 'Actual', factor: 1 },
  { label: '+10 %', factor: 1.1 },
  { label: '+20 %', factor: 1.2 },
]

export interface SensitivityTableProps {
  project: Project
}

export function SensitivityTable({ project }: SensitivityTableProps) {
  if (project.unitSalePrice <= 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Sensibilidad al precio
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ingresa un precio de venta mayor que 0 para ver cómo cambia la ganancia.
        </p>
      </div>
    )
  }

  const rows = VARIATIONS.map(({ label, factor }) => {
    const price = project.unitSalePrice * factor
    const result = calculateProject({ ...project, unitSalePrice: price })

    return { label, price, result, isCurrent: factor === 1 }
  })

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Sensibilidad al precio
      </h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Ganancia y margen al mover el precio de venta ±10 % y ±20 %.
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <caption className="sr-only">
            Ganancia y margen para distintos precios de venta del proyecto {project.name}
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Variación
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Precio
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Ganancia
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Margen
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, price, result, isCurrent }) => (
              <tr
                key={label}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800',
                  isCurrent && 'bg-sky-50 dark:bg-sky-950/40',
                )}
              >
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {label}
                </th>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatMoney(price, project.currency)}
                </td>
                <td
                  className={cn(
                    'py-1.5 pr-2 text-right tabular-nums',
                    result.netProfit < 0 && 'text-red-700 dark:text-red-400',
                  )}
                >
                  {result.netProfit < 0 && (
                    <>
                      <span aria-hidden="true">▼ </span>
                      <span className="sr-only">negativo </span>
                    </>
                  )}
                  {formatMoney(result.netProfit, project.currency)}
                </td>
                <td
                  className={cn(
                    'py-1.5 text-right tabular-nums',
                    result.marginPct !== null &&
                      result.marginPct < 0 &&
                      'text-red-700 dark:text-red-400',
                  )}
                >
                  {formatPercent(result.marginPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
