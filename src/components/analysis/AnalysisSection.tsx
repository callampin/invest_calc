import type { Project, ProjectResult } from '../../domain/types'
import { CostCompositionChart } from './CostCompositionChart'
import { ScenarioComparator } from './ScenarioComparator'
import { SensitivityTable } from './SensitivityTable'

export interface AnalysisSectionProps {
  project: Project
  result: ProjectResult
}

export function AnalysisSection({ project, result }: AnalysisSectionProps) {
  return (
    <section
      aria-labelledby="analysis-title"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="analysis-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
        Análisis y escenarios
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Compara cantidades, prueba otros precios y revisa en qué se va el dinero.
      </p>

      <div className="mt-4 flex flex-col divide-y divide-slate-200 dark:divide-slate-800 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <ScenarioComparator project={project} />
        <SensitivityTable project={project} />
        <CostCompositionChart project={project} result={result} />
      </div>
    </section>
  )
}
