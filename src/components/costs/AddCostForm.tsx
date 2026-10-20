import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { CostBase, CostKind, FixedMode } from '../../domain/types'
import { useProjectsStore } from '../../store/useProjectsStore'
import { Button } from '../common/Button'
import { NumberInput } from '../common/NumberInput'

export interface AddCostFormProps {
  projectId: string
  currency: string
}

const SELECT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900'

export function AddCostForm({ projectId, currency }: AddCostFormProps) {
  const addCost = useProjectsStore((state) => state.addCost)
  const prefix = useId()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<CostKind>('percent')
  const [value, setValue] = useState(0)
  const [base, setBase] = useState<CostBase>('cif')
  const [fixedMode, setFixedMode] = useState<FixedMode>('total')

  const canSubmit = title.trim().length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    addCost(projectId, { title, kind, value, base, fixedMode })
    setTitle('')
    setValue(0)
  }

  return (
    <details className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
        Agregar costo personalizado
      </summary>

      <form className="mt-3 flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${prefix}-title`}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Título del costo
          </label>
          <input
            id={`${prefix}-title`}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Embalaje, flete interno, envío por volumen"
            maxLength={60}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${prefix}-kind`}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Tipo
            </label>
            <select
              id={`${prefix}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value === 'fixed' ? 'fixed' : 'percent')}
              className={SELECT_CLASSES}
            >
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
          </div>

          <NumberInput
            id={`${prefix}-value`}
            label={kind === 'percent' ? 'Porcentaje' : 'Monto'}
            value={value}
            onChange={setValue}
            suffix={kind === 'percent' ? '%' : currency}
          />

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${prefix}-mode`}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {kind === 'percent' ? 'Base de cálculo' : 'Modo'}
            </label>
            {kind === 'percent' ? (
              <select
                id={`${prefix}-mode`}
                value={base}
                onChange={(event) => setBase(event.target.value as CostBase)}
                className={SELECT_CLASSES}
              >
                <option value="product">Costo de productos</option>
                <option value="cif">CIF (productos + envío)</option>
                <option value="accumulated">CIF + costos anteriores</option>
                <option value="revenue">Ingresos por ventas</option>
              </select>
            ) : (
              <select
                id={`${prefix}-mode`}
                value={fixedMode}
                onChange={(event) =>
                  setFixedMode(event.target.value === 'perUnit' ? 'perUnit' : 'total')
                }
                className={SELECT_CLASSES}
              >
                <option value="total">Total del pedido</option>
                <option value="perUnit">Por unidad</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            Agregar costo
          </Button>
        </div>
      </form>
    </details>
  )
}
