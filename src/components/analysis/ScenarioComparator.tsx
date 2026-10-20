import { useMemo, useState } from 'react'
import { calculateProject } from '../../domain/calculate'
import type { Project } from '../../domain/types'
import { cn } from '../../utils/cn'
import { formatMoney, formatPercent } from '../../utils/format'
import { MAX_SCENARIOS, parseQuantities } from './parseQuantities'

const DEFAULT_QUANTITIES = '50, 100, 500'

export interface ScenarioComparatorProps {
  project: Project
}

export function ScenarioComparator({ project }: ScenarioComparatorProps) {
  const [raw, setRaw] = useState(DEFAULT_QUANTITIES)
  const currentQuantity = Math.max(1, Math.floor(project.quantity) || 1)

  const rows = useMemo(() => {
    const quantities = [...new Set([currentQuantity, ...parseQuantities(raw)])]
      .slice(0, MAX_SCENARIOS)
      .sort((left, right) => left - right)

    return quantities.map((quantity) => ({
      quantity,
      isCurrent: quantity === currentQuantity,
      result: calculateProject({ ...project, quantity }),
    }))
  }, [project, raw, currentQuantity])

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Comparador de cantidades
      </h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Misma ficha con distintas cantidades: el envío por unidad y los costos fijos por unidad
        cambian el margen.
      </p>

      <div className="mt-2 flex flex-col gap-1">
        <label
          htmlFor="scenario-quantities"
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Cantidades a comparar
        </label>
        <input
          id="scenario-quantities"
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sepáralas con coma. Siempre se incluye la cantidad actual; máximo 6.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">
            Inversión, ganancia, margen y ROI según la cantidad de unidades
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Unidades
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Inversión
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Ganancia
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Margen
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                ROI
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ quantity, isCurrent, result }) => (
              <tr
                key={quantity}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800',
                  isCurrent && 'bg-sky-50 dark:bg-sky-950/40',
                )}
              >
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  <span className="tabular-nums">{quantity}</span>
                  {isCurrent && (
                    <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                      actual
                    </span>
                  )}
                </th>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatMoney(result.totalInvestment, project.currency)}
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
                    'py-1.5 pr-2 text-right tabular-nums',
                    result.marginPct !== null &&
                      result.marginPct < 0 &&
                      'text-red-700 dark:text-red-400',
                  )}
                >
                  {formatPercent(result.marginPct)}
                </td>
                <td
                  className={cn(
                    'py-1.5 text-right tabular-nums',
                    result.roiPct !== null && result.roiPct < 0 && 'text-red-700 dark:text-red-400',
                  )}
                >
                  {formatPercent(result.roiPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
