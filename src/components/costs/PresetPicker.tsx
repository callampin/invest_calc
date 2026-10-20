import type { CountryProfile } from '../../config/presets'
import type { Project } from '../../domain/types'
import { useProjectsStore } from '../../store/useProjectsStore'
import { formatMoney } from '../../utils/format'
import { Button } from '../common/Button'

export interface PresetPickerProps {
  project: Project
  profile: CountryProfile
}

export function PresetPicker({ project, profile }: PresetPickerProps) {
  const addPresetCost = useProjectsStore((state) => state.addPresetCost)

  const usedPresetIds = new Set(
    project.costs.flatMap((cost) => (cost.presetId ? [cost.presetId] : [])),
  )
  const missingPresets = profile.presets.filter((preset) => !usedPresetIds.has(preset.presetId))

  return (
    <section
      aria-labelledby="presets-title"
      className="mt-4 border-t border-dashed border-slate-300 pt-4 dark:border-slate-700"
    >
      <h3 id="presets-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Costos predefinidos
      </h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Valores verificados el {profile.lastVerified}. Confírmalos con la fuente oficial.
      </p>

      {missingPresets.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Ya agregaste todos los costos predefinidos de este perfil.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {missingPresets.map((preset) => (
            <li
              key={preset.presetId}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {preset.title}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {preset.kind === 'percent'
                      ? `${preset.defaultValue}%`
                      : formatMoney(preset.defaultValue, project.currency)}
                  </span>
                </p>
                {preset.description && (
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {preset.description}
                  </p>
                )}
                {preset.sourceNote && (
                  <p className="mt-0.5 text-[11px] break-words text-slate-500 dark:text-slate-500">
                    {preset.sourceNote}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addPresetCost(project.id, preset.presetId)}
              >
                Agregar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
