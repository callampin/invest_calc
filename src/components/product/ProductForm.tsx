import type { Project } from '../../domain/types'
import { useProjectsStore } from '../../store/useProjectsStore'
import type { ProductPatch } from '../../store/useProjectsStore'
import { NumberInput } from '../common/NumberInput'
import { TextField } from '../common/TextField'

export interface ProductFormProps {
  project: Project
}

const CURRENCIES = ['CLP', 'USD', 'EUR', 'ARS', 'MXN', 'COP', 'PEN', 'BRL', 'UYU']

const SELECT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900'

export function ProductForm({ project }: ProductFormProps) {
  const updateProduct = useProjectsStore((state) => state.updateProduct)

  const update = (patch: ProductPatch): void => {
    updateProduct(project.id, patch)
  }

  const currencyOptions = CURRENCIES.includes(project.currency)
    ? CURRENCIES
    : [project.currency, ...CURRENCIES]

  const units = Math.max(1, Math.floor(project.quantity) || 1)

  return (
    <section
      aria-labelledby="product-form-title"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4">
        <h2
          id="product-form-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-50"
        >
          Datos del producto
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Todo se guarda automáticamente en este navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="project-name"
          className="sm:col-span-2"
          label="Nombre del proyecto"
          value={project.name}
          onCommit={(name) => update({ name })}
          hint="Por ejemplo: “Audífonos inalámbricos — 100 unidades”."
          maxLength={80}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-currency"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Moneda
          </label>
          <select
            id="project-currency"
            value={project.currency}
            onChange={(event) => update({ currency: event.target.value })}
            className={SELECT_CLASSES}
          >
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Todos los montos de este proyecto usan esta moneda.
          </p>
        </div>

        <NumberInput
          id="project-quantity"
          label="Cantidad de unidades"
          value={project.quantity}
          onChange={(quantity) => update({ quantity })}
          integer
          hint="Si queda vacío o en 0, se calcula como 1 unidad."
        />

        <NumberInput
          id="project-unit-cost"
          label="Costo unitario"
          value={project.unitCost}
          onChange={(unitCost) => update({ unitCost })}
          suffix={project.currency}
          hint="Lo que pagas al proveedor por cada unidad."
        />

        <NumberInput
          id="project-sale-price"
          label="Precio de venta por unidad"
          value={project.unitSalePrice}
          onChange={(unitSalePrice) => update({ unitSalePrice })}
          suffix={project.currency}
          hint="Precio final al que vendes cada unidad."
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="project-shipping-mode"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Tipo de envío
          </label>
          <select
            id="project-shipping-mode"
            value={project.shippingMode}
            onChange={(event) =>
              update({ shippingMode: event.target.value === 'perUnit' ? 'perUnit' : 'total' })
            }
            className={SELECT_CLASSES}
          >
            <option value="total">Monto total del pedido</option>
            <option value="perUnit">Por unidad</option>
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {project.shippingMode === 'perUnit'
              ? `Se multiplica por la cantidad (${units} unidades).`
              : 'Un único monto para todo el pedido.'}
          </p>
        </div>

        <NumberInput
          id="project-shipping-value"
          label="Costo de envío"
          value={project.shippingValue}
          onChange={(shippingValue) => update({ shippingValue })}
          suffix={project.currency}
          hint="Flete internacional, courier o retiro, según corresponda."
        />
      </div>
    </section>
  )
}
