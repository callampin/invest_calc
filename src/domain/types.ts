export type CostKind = 'percent' | 'fixed'

/** Sobre qué valor se aplica un costo de tipo 'percent' */
export type CostBase =
  /** costo total de los productos (costo unitario × cantidad) */
  | 'product'
  /** producto + envío (base típica de aranceles/impuestos de importación) */
  | 'cif'
  /** cif + suma de los costos ANTERIORES de la lista que no sean base 'revenue' */
  | 'accumulated'
  /** ingresos por ventas (ej. comisión de la plataforma) */
  | 'revenue'

/** Cómo se interpreta un costo de tipo 'fixed' */
export type FixedMode = 'total' | 'perUnit'

export interface CostItem {
  id: string
  /** "IVA", "Envío por volumen", etc. */
  title: string
  kind: CostKind
  /** porcentaje (19 = 19%) o monto, según `kind` */
  value: number
  /** solo relevante si `kind === 'percent'` */
  base: CostBase
  /** solo relevante si `kind === 'fixed'` */
  fixedMode: FixedMode
  /** permite desactivar sin borrar */
  enabled: boolean
  /** si viene de un preset (permite "restablecer valor por defecto") */
  presetId?: string
  /** opcional: ej. IVA crédito fiscal (ver fase 7) */
  recoverable?: boolean
}

export type ShippingMode = 'total' | 'perUnit'

export interface Project {
  id: string
  /** nombre del producto/escenario */
  name: string
  /** código ISO, ej. 'USD', 'CLP', 'ARS' */
  currency: string
  /** unidades a comprar (entero ≥ 1) */
  quantity: number
  /** costo de compra por unidad */
  unitCost: number
  /** envío internacional/principal */
  shippingMode: ShippingMode
  shippingValue: number
  /** precio de venta final por unidad */
  unitSalePrice: number
  /** lista ORDENADA (el orden importa para 'accumulated') */
  costs: CostItem[]
  /** ISO */
  createdAt: string
  /** ISO */
  updatedAt: string
}

export interface CostBreakdownLine {
  costId: string
  title: string
  amount: number
  /** null si es fijo */
  base: CostBase | null
  /** true = se paga antes de vender (parte de la inversión) */
  isUpfront: boolean
  /** true = se recupera después (ej. crédito fiscal) */
  recoverable: boolean
}

export interface ProjectResult {
  productCostTotal: number
  shippingTotal: number
  /** productCostTotal + shippingTotal */
  cif: number
  breakdown: CostBreakdownLine[]
  /** suma de costos NO basados en revenue */
  upfrontCostsTotal: number
  /** suma de costos basados en revenue */
  salesCostsTotal: number
  /** cif + upfrontCostsTotal (lo que hay que desembolsar) */
  totalInvestment: number
  /** unitSalePrice × quantity */
  revenue: number
  /** totalInvestment + salesCostsTotal */
  totalCosts: number
  /** revenue − totalCosts */
  netProfit: number
  /** suma de costos recuperables (crédito fiscal, etc.) */
  recoverableCostsTotal: number
  /** totalInvestment − costos recuperables pagados antes de vender */
  realInvestmentCost: number
  /** netProfit / revenue × 100 (null si revenue = 0) */
  marginPct: number | null
  /** netProfit / totalInvestment × 100 (null si inversión = 0) */
  roiPct: number | null
  /** totalInvestment / quantity */
  landedUnitCost: number
  /** netProfit / quantity */
  profitPerUnit: number
  /** precio mínimo por unidad para no perder (null si imposible) */
  breakEvenUnitPrice: number | null
}

export interface PersistedState {
  version: number
  projects: Project[]
  activeProjectId: string | null
}
