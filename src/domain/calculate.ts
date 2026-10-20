import type { CostBreakdownLine, CostBase, CostItem, Project, ProjectResult } from './types'

const PERCENT_DIVISOR = 100

/** Convierte cualquier entrada numérica en un monto ≥ 0 (NaN/∞/negativos → 0). */
export function toAmount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Normaliza la cantidad: NaN/∞ → 1, decimales → entero (hacia abajo) y mínimo 1.
 */
export function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(1, Math.floor(value))
}

interface CostContext {
  quantity: number
  productCostTotal: number
  cif: number
  revenue: number
  /** cif + amounts de los costos anteriores que no son base 'revenue' */
  accumulatedBase: number
}

function percentBaseValue(base: CostBase, context: CostContext): number {
  switch (base) {
    case 'product':
      return context.productCostTotal
    case 'cif':
      return context.cif
    case 'accumulated':
      return context.accumulatedBase
    case 'revenue':
      return context.revenue
    default:
      return 0
  }
}

function isRevenueBased(cost: CostItem): boolean {
  return cost.kind === 'percent' && cost.base === 'revenue'
}

function calculateCostAmount(cost: CostItem, context: CostContext): number {
  const value = toAmount(cost.value)

  if (cost.kind === 'fixed') {
    return cost.fixedMode === 'perUnit' ? value * context.quantity : value
  }

  return (value / PERCENT_DIVISOR) * percentBaseValue(cost.base, context)
}

/**
 * Calcula el resultado de un proyecto. Es una función pura y nunca lanza:
 * normaliza datos inválidos (NaN, ∞, negativos, cantidad < 1).
 */
export function calculateProject(project: Project): ProjectResult {
  const quantity = normalizeQuantity(project.quantity)
  const productCostTotal = toAmount(project.unitCost) * quantity

  const shippingValue = toAmount(project.shippingValue)
  const shippingTotal =
    project.shippingMode === 'perUnit' ? shippingValue * quantity : shippingValue

  const cif = productCostTotal + shippingTotal
  const revenue = toAmount(project.unitSalePrice) * quantity
  const costs = Array.isArray(project.costs) ? project.costs : []

  const context: CostContext = {
    quantity,
    productCostTotal,
    cif,
    revenue,
    accumulatedBase: cif,
  }

  const breakdown: CostBreakdownLine[] = []
  let upfrontCostsTotal = 0
  let salesCostsTotal = 0
  /** Suma de tasas (value/100) de los costos porcentuales basados en revenue. */
  let revenueRate = 0

  for (const cost of costs) {
    if (!cost.enabled) {
      continue
    }

    const amount = calculateCostAmount(cost, context)
    const isUpfront = !isRevenueBased(cost)

    breakdown.push({
      costId: cost.id,
      title: cost.title,
      amount,
      base: cost.kind === 'percent' ? cost.base : null,
      isUpfront,
      recoverable: cost.recoverable === true,
    })

    if (isUpfront) {
      upfrontCostsTotal += amount
      context.accumulatedBase += amount
    } else {
      salesCostsTotal += amount
      revenueRate += toAmount(cost.value) / PERCENT_DIVISOR
    }
  }

  const totalInvestment = cif + upfrontCostsTotal
  const totalCosts = totalInvestment + salesCostsTotal
  const netProfit = revenue - totalCosts

  const recoverableCostsTotal = breakdown.reduce(
    (sum, line) => (line.recoverable ? sum + line.amount : sum),
    0,
  )
  const recoverableUpfrontTotal = breakdown.reduce(
    (sum, line) => (line.recoverable && line.isUpfront ? sum + line.amount : sum),
    0,
  )
  const realInvestmentCost = totalInvestment - recoverableUpfrontTotal

  const marginPct = revenue > 0 ? (netProfit / revenue) * PERCENT_DIVISOR : null
  const roiPct = totalInvestment > 0 ? (netProfit / totalInvestment) * PERCENT_DIVISOR : null

  // Beneficio = P·q·(1 − r) − F − N, con F = 0 en esta versión (todo costo fijo es upfront).
  const breakEvenUnitPrice =
    revenueRate >= 1 ? null : totalInvestment / (quantity * (1 - revenueRate))

  return {
    productCostTotal,
    shippingTotal,
    cif,
    breakdown,
    upfrontCostsTotal,
    salesCostsTotal,
    totalInvestment,
    revenue,
    totalCosts,
    netProfit,
    recoverableCostsTotal,
    realInvestmentCost,
    marginPct,
    roiPct,
    landedUnitCost: totalInvestment / quantity,
    profitPerUnit: netProfit / quantity,
    breakEvenUnitPrice,
  }
}
