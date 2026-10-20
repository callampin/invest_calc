import type { CostBase, CostItem, CostKind, FixedMode } from '../../domain/types'
import { findPreset } from '../../config/presets'
import { useProjectsStore } from '../../store/useProjectsStore'
import type { CostPatch } from '../../store/useProjectsStore'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'
import { IconButton } from '../common/IconButton'
import { NumberInput } from '../common/NumberInput'
import { TextField } from '../common/TextField'

export interface CostRowProps {
  projectId: string
  currency: string
  cost: CostItem
  isFirst: boolean
  isLast: boolean
}

const SELECT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900'

const BASE_OPTIONS: Array<{ value: CostBase; label: string }> = [
  { value: 'product', label: 'Costo de productos' },
  { value: 'cif', label: 'CIF (productos + envío)' },
  { value: 'accumulated', label: 'CIF + costos anteriores' },
  { value: 'revenue', label: 'Ingresos por ventas' },
]

const BASE_HELP: Record<CostBase, string> = {
  product: 'Se aplica solo al costo de los productos, sin envío.',
  cif: 'CIF = costo de los productos + envío.',
  accumulated: 'CIF + los costos anteriores de la lista, salvo los que se cobran sobre las ventas.',
  revenue: 'Se cobra sobre las ventas: reduce la ganancia, no la inversión inicial.',
}

export function CostRow({ projectId, currency, cost, isFirst, isLast }: CostRowProps) {
  const updateCost = useProjectsStore((state) => state.updateCost)
  const removeCost = useProjectsStore((state) => state.removeCost)
  const toggleCost = useProjectsStore((state) => state.toggleCost)
  const moveCost = useProjectsStore((state) => state.moveCost)
  const resetCostToPreset = useProjectsStore((state) => state.resetCostToPreset)

  const preset = cost.presetId ? findPreset(cost.presetId) : undefined
  const canReset = preset !== undefined && cost.value !== preset.defaultValue
  const isPercent = cost.kind === 'percent'

  const update = (patch: CostPatch): void => {
    updateCost(projectId, cost.id, patch)
  }

  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        cost.enabled
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40',
      )}
    >
      <div className="flex items-end gap-2">
        <TextField
          className="min-w-0 flex-1"
          label="Título"
          value={cost.title}
          onCommit={(title) => update({ title })}
          maxLength={60}
        />
        <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={cost.enabled}
            onChange={() => toggleCost(projectId, cost.id)}
            className="h-4 w-4 accent-sky-700"
          />
          Activo
        </label>
        <div className="flex items-center gap-0.5 pb-1">
          <IconButton
            label={`Subir ${cost.title}`}
            disabled={isFirst}
            onClick={() => moveCost(projectId, cost.id, 'up')}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </IconButton>
          <IconButton
            label={`Bajar ${cost.title}`}
            disabled={isLast}
            onClick={() => moveCost(projectId, cost.id, 'down')}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </IconButton>
          <IconButton
            label={`Eliminar ${cost.title}`}
            tone="danger"
            onClick={() => removeCost(projectId, cost.id)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`cost-kind-${cost.id}`}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Tipo
          </label>
          <select
            id={`cost-kind-${cost.id}`}
            value={cost.kind}
            onChange={(event) => update({ kind: event.target.value as CostKind })}
            className={SELECT_CLASSES}
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
        </div>

        <NumberInput
          id={`cost-value-${cost.id}`}
          label={isPercent ? 'Porcentaje' : 'Monto'}
          value={cost.value}
          onChange={(value) => update({ value })}
          suffix={isPercent ? '%' : currency}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`cost-mode-${cost.id}`}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {isPercent ? 'Base de cálculo' : 'Modo'}
          </label>
          {isPercent ? (
            <select
              id={`cost-mode-${cost.id}`}
              value={cost.base}
              onChange={(event) => update({ base: event.target.value as CostBase })}
              className={SELECT_CLASSES}
            >
              {BASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              id={`cost-mode-${cost.id}`}
              value={cost.fixedMode}
              onChange={(event) => update({ fixedMode: event.target.value as FixedMode })}
              className={SELECT_CLASSES}
            >
              <option value="total">Total del pedido</option>
              <option value="perUnit">Por unidad</option>
            </select>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {preset && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Predefinido
          </span>
        )}
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            aria-label={`Recuperable: ${cost.title}`}
            checked={cost.recoverable ?? false}
            onChange={(event) => update({ recoverable: event.target.checked })}
            className="h-4 w-4 accent-emerald-700"
          />
          Recuperable
        </label>
        {canReset && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => resetCostToPreset(projectId, cost.id)}
          >
            Restablecer valor por defecto
          </Button>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {isPercent
          ? BASE_HELP[cost.base]
          : cost.fixedMode === 'perUnit'
            ? 'Monto fijo que se multiplica por la cantidad de unidades.'
            : 'Monto fijo para todo el pedido.'}
      </p>

      {cost.recoverable && (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          Se recupera después (ej. crédito fiscal): no cuenta como costo real de inversión.
        </p>
      )}

      {isPercent && cost.value > 100 && (
        <p
          role="status"
          className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
        >
          <span aria-hidden="true">⚠</span> Porcentaje mayor a 100 %: revisa que sea intencional.
        </p>
      )}
    </li>
  )
}
