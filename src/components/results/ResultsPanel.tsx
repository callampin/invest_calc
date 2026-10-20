import { useId, useState } from 'react'
import type { Project, ProjectResult } from '../../domain/types'
import { cn } from '../../utils/cn'
import { formatMoney, formatPercent } from '../../utils/format'
import { ResultsMetrics } from './ResultsMetrics'

export interface ResultsPanelProps {
  project: Project
  result: ProjectResult
}

export function ResultsPanel({ project, result }: ResultsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const regionId = useId()
  const isLoss = result.netProfit < 0
  const currency = project.currency

  const liveSummary = `Inversión total ${formatMoney(result.totalInvestment, currency)}. Ganancia neta ${formatMoney(result.netProfit, currency)}. Margen ${formatPercent(result.marginPct)}. ROI ${formatPercent(result.roiPct)}.`

  return (
    <>
      <section
        aria-labelledby="results-title"
        className="hidden rounded-xl border border-slate-200 bg-white p-4 lg:block dark:border-slate-800 dark:bg-slate-900"
      >
        <h2
          id="results-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-50"
        >
          Resultados
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Se recalculan al instante con cada cambio.
        </p>
        <div className="mt-3">
          <ResultsMetrics project={project} result={result} />
        </div>
        <p className="sr-only" aria-live="polite">
          {liveSummary}
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={regionId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex flex-wrap items-baseline gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Ganancia neta</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                isLoss
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400',
              )}
            >
              {formatMoney(result.netProfit, currency)}
            </span>
            {isLoss && (
              <>
                <span aria-hidden="true">▼</span>
                <span className="sr-only">negativo</span>
              </>
            )}
          </span>
          <span className="shrink-0 text-xs font-medium text-sky-700 dark:text-sky-400">
            {isOpen ? 'Ocultar detalle' : 'Ver detalle'}
          </span>
        </button>

        {isOpen && (
          <div
            id={regionId}
            className="max-h-[70vh] overflow-y-auto border-t border-slate-200 p-3 dark:border-slate-800"
          >
            <ResultsMetrics project={project} result={result} />
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {liveSummary}
        </p>
      </div>
    </>
  )
}
