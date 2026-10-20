import { getProfileForCurrency } from '../../config/presets'
import type { Project } from '../../domain/types'
import { AddCostForm } from './AddCostForm'
import { CostRow } from './CostRow'
import { PresetPicker } from './PresetPicker'

export interface CostListProps {
  project: Project
}

export function CostList({ project }: CostListProps) {
  const profile = getProfileForCurrency(project.currency)

  return (
    <section
      aria-labelledby="costs-title"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3">
        <h2 id="costs-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Costos adicionales
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Impuestos, comisiones y envíos extra. El orden importa: un costo con base «CIF + costos
          anteriores» usa los que están más arriba.
        </p>
      </div>

      {project.costs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          No hay costos todavía. Agrega uno personalizado o vuelve a sumar un costo predefinido.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {project.costs.map((cost, index) => (
            <CostRow
              key={cost.id}
              projectId={project.id}
              currency={project.currency}
              cost={cost}
              isFirst={index === 0}
              isLast={index === project.costs.length - 1}
            />
          ))}
        </ul>
      )}

      <AddCostForm projectId={project.id} currency={project.currency} />
      <PresetPicker project={project} profile={profile} />
    </section>
  )
}
