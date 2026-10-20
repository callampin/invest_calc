import type { CostBase, CostBreakdownLine, Project, ProjectResult } from '../../domain/types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/format'

export interface BreakdownTableProps {
  project: Project
  result: ProjectResult
}

const BASE_LABELS: Record<CostBase, string> = {
  product: 'Costo productos',
  cif: 'CIF',
  accumulated: 'CIF + anteriores',
  revenue: 'Ventas',
}

function rowBase(line: CostBreakdownLine): string {
  return line.base === null ? 'Fijo' : BASE_LABELS[line.base]
}

function Amount({ value, currency }: { value: number; currency: string }) {
  return <span className="tabular-nums">{formatMoney(value, currency)}</span>
}

export function BreakdownTable({ project, result }: BreakdownTableProps) {
  const currency = project.currency
  const upfrontLines = result.breakdown.filter((line) => line.isUpfront)
  const salesLines = result.breakdown.filter((line) => !line.isUpfront)
  const isLoss = result.netProfit < 0

  return (
    <section
      aria-labelledby="breakdown-title"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2
        id="breakdown-title"
        className="text-base font-semibold text-slate-900 dark:text-slate-50"
      >
        Desglose de costos
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Línea por línea, separando lo que pagas antes de vender de lo que se descuenta al vender.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <caption className="sr-only">Desglose de costos del proyecto {project.name}</caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Concepto
              </th>
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Base
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Monto
              </th>
            </tr>
          </thead>

          <tbody>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              <th
                scope="colgroup"
                colSpan={3}
                className="px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Antes de vender (inversión)
              </th>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                Costo de los productos
              </th>
              <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">—</td>
              <td className="py-1.5 text-right">
                <Amount value={result.productCostTotal} currency={currency} />
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                Envío
              </th>
              <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">—</td>
              <td className="py-1.5 text-right">
                <Amount value={result.shippingTotal} currency={currency} />
              </td>
            </tr>
            {upfrontLines.map((line) => (
              <tr key={line.costId}>
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {line.title}
                  {line.recoverable && (
                    <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      recuperable
                    </span>
                  )}
                </th>
                <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">{rowBase(line)}</td>
                <td className="py-1.5 text-right">
                  <Amount value={line.amount} currency={currency} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <th scope="row" className="py-2 pr-2 text-left font-semibold">
                Total inversión
              </th>
              <td />
              <td className="py-2 text-right font-semibold">
                <Amount value={result.totalInvestment} currency={currency} />
              </td>
            </tr>
          </tbody>

          <tbody>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              <th
                scope="colgroup"
                colSpan={3}
                className="px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Al vender (comisiones)
              </th>
            </tr>
            {salesLines.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-2 text-slate-500 dark:text-slate-400">
                  Sin comisiones sobre las ventas.
                </td>
              </tr>
            ) : (
              salesLines.map((line) => (
                <tr key={line.costId}>
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                    {line.title}
                    {line.recoverable && (
                      <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        recuperable
                      </span>
                    )}
                  </th>
                  <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">
                    {rowBase(line)}
                  </td>
                  <td className="py-1.5 text-right">
                    <Amount value={line.amount} currency={currency} />
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <th scope="row" className="py-2 pr-2 text-left font-semibold">
                Subtotal comisiones
              </th>
              <td />
              <td className="py-2 text-right font-semibold">
                <Amount value={result.salesCostsTotal} currency={currency} />
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                Ingresos
              </th>
              <td />
              <td className="py-1.5 text-right">
                <Amount value={result.revenue} currency={currency} />
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                Costos totales
              </th>
              <td />
              <td className="py-1.5 text-right">
                <Amount value={result.totalCosts} currency={currency} />
              </td>
            </tr>
            <tr className="border-t-2 border-slate-300 dark:border-slate-600">
              <th scope="row" className="py-2 pr-2 text-left font-semibold">
                Ganancia neta
              </th>
              <td />
              <td
                className={cn(
                  'py-2 text-right font-semibold tabular-nums',
                  isLoss
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400',
                )}
              >
                {isLoss && (
                  <>
                    <span aria-hidden="true">▼ </span>
                    <span className="sr-only">negativo </span>
                  </>
                )}
                {formatMoney(result.netProfit, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
