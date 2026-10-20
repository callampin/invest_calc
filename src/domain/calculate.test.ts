import { describe, expect, it } from 'vitest'
import { makeCost, makeProject, makeReferenceProject } from '../test/factories'
import { calculateProject, normalizeQuantity, toAmount } from './calculate'
import type { CostBase } from './types'

describe('calculateProject — ejemplo de referencia (AGENTS.md §5.4)', () => {
  it('reproduce exactamente los totales del ejemplo', () => {
    const result = calculateProject(makeReferenceProject())

    expect(result.productCostTotal).toBeCloseTo(500, 2)
    expect(result.shippingTotal).toBeCloseTo(80, 2)
    expect(result.cif).toBeCloseTo(580, 2)

    expect(result.breakdown).toHaveLength(4)
    expect(result.breakdown[0]?.amount).toBeCloseTo(34.8, 2) // arancel 6% del CIF
    expect(result.breakdown[1]?.amount).toBeCloseTo(116.812, 2) // IVA 19% de (CIF + arancel)
    expect(result.breakdown[2]?.amount).toBeCloseTo(180, 2) // comisión 12% de ingresos
    expect(result.breakdown[3]?.amount).toBeCloseTo(50, 2) // envío por volumen fijo

    expect(result.upfrontCostsTotal).toBeCloseTo(201.612, 2)
    expect(result.totalInvestment).toBeCloseTo(781.612, 2)
    expect(result.revenue).toBeCloseTo(1500, 2)
    expect(result.salesCostsTotal).toBeCloseTo(180, 2)
    expect(result.totalCosts).toBeCloseTo(961.612, 2)
    expect(result.netProfit).toBeCloseTo(538.388, 2)
    expect(result.marginPct).toBeCloseTo(35.8925, 2)
    expect(result.roiPct).toBeCloseTo(68.8819, 2)
    expect(result.landedUnitCost).toBeCloseTo(7.81612, 4)
    expect(result.profitPerUnit).toBeCloseTo(5.38388, 4)
    expect(result.breakEvenUnitPrice).toBeCloseTo(8.88195, 4)
  })

  it('marca como upfront todo salvo los porcentajes sobre revenue', () => {
    const result = calculateProject(makeReferenceProject())
    const flags = Object.fromEntries(result.breakdown.map((line) => [line.costId, line.isUpfront]))

    expect(flags).toEqual({
      arancel: true,
      iva: true,
      comision: false,
      'envio-volumen': true,
    })
  })

  it('expone base null para costos fijos y la base real para porcentajes', () => {
    const result = calculateProject(makeReferenceProject())
    const byId = Object.fromEntries(result.breakdown.map((line) => [line.costId, line.base]))

    expect(byId).toEqual({
      arancel: 'cif',
      iva: 'accumulated',
      comision: 'revenue',
      'envio-volumen': null,
    })
  })
})

describe('calculateProject — normalización de entradas', () => {
  it('trata cantidad 0 como 1 unidad', () => {
    const result = calculateProject(makeProject({ quantity: 0, unitSalePrice: 0 }))

    expect(result.productCostTotal).toBeCloseTo(5, 2)
    expect(result.cif).toBeCloseTo(85, 2)
    expect(result.landedUnitCost).toBeCloseTo(85, 2)
  })

  it('trata cantidades negativas como 1 unidad', () => {
    const result = calculateProject(makeProject({ quantity: -7, unitSalePrice: 0 }))

    expect(result.productCostTotal).toBeCloseTo(5, 2)
    expect(result.profitPerUnit).toBeCloseTo(result.netProfit, 4)
  })

  it('trunca cantidades decimales al entero inferior', () => {
    const result = calculateProject(makeProject({ quantity: 2.7, unitSalePrice: 0 }))

    expect(result.productCostTotal).toBeCloseTo(10, 2)
    expect(result.landedUnitCost).toBeCloseTo(45, 2) // (10 + 80) / 2
  })

  it('normaliza NaN e Infinity sin lanzar y sin propagar NaN', () => {
    const result = calculateProject(
      makeProject({
        quantity: Number.NaN,
        unitCost: Number.NaN,
        shippingValue: Number.POSITIVE_INFINITY,
        unitSalePrice: Number.NaN,
        costs: [makeCost({ title: 'Roto', value: Number.NaN })],
      }),
    )

    expect(result.productCostTotal).toBe(0)
    expect(result.shippingTotal).toBe(0)
    expect(result.revenue).toBe(0)
    expect(result.breakdown[0]?.amount).toBe(0)
    expect(result.marginPct).toBeNull()

    expect(Number.isFinite(result.totalInvestment)).toBe(true)
    expect(Number.isFinite(result.netProfit)).toBe(true)
    expect(Number.isFinite(result.roiPct ?? 0)).toBe(true)
  })

  it('convierte montos negativos en 0', () => {
    const result = calculateProject(
      makeProject({
        unitCost: -10,
        shippingValue: -5,
        unitSalePrice: -3,
        costs: [makeCost({ value: -20, base: 'cif' })],
      }),
    )

    expect(result.cif).toBe(0)
    expect(result.revenue).toBe(0)
    expect(result.breakdown[0]?.amount).toBe(0)
  })

  it('soporta números muy grandes sin desbordar', () => {
    const result = calculateProject(makeProject({ quantity: 1_000_000, unitCost: 1_000_000 }))

    expect(result.productCostTotal).toBe(1e12)
    expect(Number.isFinite(result.totalInvestment)).toBe(true)
  })
})

describe('calculateProject — costos', () => {
  it('ignora costos deshabilitados sin afectar totales ni desglose', () => {
    const costs = [
      makeCost({ id: 'activo', value: 10, base: 'cif' }),
      makeCost({ id: 'inactivo', value: 50, base: 'cif', enabled: false }),
    ]
    const result = calculateProject(makeProject({ costs }))

    expect(result.breakdown.map((line) => line.costId)).toEqual(['activo'])
    expect(result.upfrontCostsTotal).toBeCloseTo(58, 2)
    expect(result.salesCostsTotal).toBe(0)
  })

  it('hace que el orden importe en la base accumulated', () => {
    const ivaFirst = calculateProject(
      makeProject({
        costs: [
          makeCost({ id: 'iva', value: 19, base: 'accumulated' }),
          makeCost({ id: 'arancel', value: 6, base: 'cif' }),
        ],
      }),
    )
    const arancelFirst = calculateProject(
      makeProject({
        costs: [
          makeCost({ id: 'arancel', value: 6, base: 'cif' }),
          makeCost({ id: 'iva', value: 19, base: 'accumulated' }),
        ],
      }),
    )

    expect(ivaFirst.breakdown[0]?.amount).toBeCloseTo(110.2, 2) // 19% de 580
    expect(arancelFirst.breakdown[1]?.amount).toBeCloseTo(116.812, 2) // 19% de 614.8
    expect(ivaFirst.totalInvestment).toBeCloseTo(725, 2)
    expect(arancelFirst.totalInvestment).toBeCloseTo(731.612, 2)
  })

  it('excluye los costos basados en revenue de la base accumulated', () => {
    const result = calculateProject(
      makeProject({
        costs: [
          makeCost({ id: 'comision', value: 12, base: 'revenue' }),
          makeCost({ id: 'iva', value: 19, base: 'accumulated' }),
        ],
      }),
    )

    expect(result.breakdown[1]?.amount).toBeCloseTo(110.2, 2) // 19% de 580, no de 760
    expect(result.upfrontCostsTotal).toBeCloseTo(110.2, 2)
    expect(result.salesCostsTotal).toBeCloseTo(180, 2)
  })

  it('incluye los costos fijos anteriores en la base accumulated', () => {
    const result = calculateProject(
      makeProject({
        costs: [
          makeCost({ id: 'arancel', value: 6, base: 'cif' }),
          makeCost({ id: 'fijo', kind: 'fixed', fixedMode: 'total', value: 50 }),
          makeCost({ id: 'iva', value: 19, base: 'accumulated' }),
        ],
      }),
    )

    expect(result.breakdown[2]?.amount).toBeCloseTo(126.312, 2) // 19% de (580 + 34.8 + 50)
  })

  it('aplica la base product al costo de los productos, sin envío', () => {
    const result = calculateProject(
      makeProject({ costs: [makeCost({ value: 10, base: 'product' })] }),
    )

    expect(result.breakdown[0]?.amount).toBeCloseTo(50, 2)
  })

  it('permite porcentajes mayores a 100', () => {
    const result = calculateProject(makeProject({ costs: [makeCost({ value: 150, base: 'cif' })] }))

    expect(result.breakdown[0]?.amount).toBeCloseTo(870, 2)
    expect(result.totalInvestment).toBeCloseTo(1450, 2)
  })

  it('calcula un costo fijo por unidad', () => {
    const result = calculateProject(
      makeProject({
        costs: [makeCost({ kind: 'fixed', fixedMode: 'perUnit', value: 1.5 })],
      }),
    )

    expect(result.breakdown[0]?.amount).toBeCloseTo(150, 2)
    expect(result.breakdown[0]?.base).toBeNull()
  })

  it('funciona con la lista de costos vacía', () => {
    const result = calculateProject(makeProject({ costs: [], unitSalePrice: 10 }))

    expect(result.breakdown).toEqual([])
    expect(result.upfrontCostsTotal).toBe(0)
    expect(result.salesCostsTotal).toBe(0)
    expect(result.totalInvestment).toBeCloseTo(580, 2)
    expect(result.netProfit).toBeCloseTo(420, 2)
    expect(result.breakEvenUnitPrice).toBeCloseTo(5.8, 2)
  })

  it('funciona con todos los costos desactivados', () => {
    const result = calculateProject(
      makeProject({
        costs: [makeCost({ value: 20, base: 'cif', enabled: false })],
      }),
    )

    expect(result.breakdown).toEqual([])
    expect(result.totalInvestment).toBeCloseTo(580, 2)
  })

  it('tolera una base desconocida (datos corruptos) sin lanzar', () => {
    const corrupted = makeCost({ value: 10, base: 'desconocida' as unknown as CostBase })
    const result = calculateProject(makeProject({ costs: [corrupted] }))

    expect(result.breakdown[0]?.amount).toBe(0)
    expect(result.upfrontCostsTotal).toBe(0)
  })

  it('permite dos costos con el mismo título', () => {
    const result = calculateProject(
      makeProject({
        costs: [
          makeCost({ id: 'a', title: 'Envío', kind: 'fixed', value: 10 }),
          makeCost({ id: 'b', title: 'Envío', kind: 'fixed', value: 15 }),
        ],
      }),
    )

    expect(result.breakdown.map((line) => line.costId)).toEqual(['a', 'b'])
    expect(result.upfrontCostsTotal).toBeCloseTo(25, 2)
  })
})

describe('calculateProject — envío', () => {
  it('interpreta el envío total como un monto único', () => {
    const result = calculateProject(makeProject({ quantity: 10, shippingMode: 'total' }))

    expect(result.shippingTotal).toBeCloseTo(80, 2)
    expect(result.cif).toBeCloseTo(130, 2)
  })

  it('multiplica el envío por unidad por la cantidad', () => {
    const result = calculateProject(
      makeProject({ quantity: 10, shippingMode: 'perUnit', shippingValue: 2 }),
    )

    expect(result.shippingTotal).toBeCloseTo(20, 2)
    expect(result.cif).toBeCloseTo(70, 2)
  })
})

describe('calculateProject — métricas', () => {
  it('devuelve marginPct null cuando no hay ingresos', () => {
    const result = calculateProject(makeProject({ unitSalePrice: 0 }))

    expect(result.revenue).toBe(0)
    expect(result.marginPct).toBeNull()
    expect(result.netProfit).toBeCloseTo(-580, 2)
    expect(result.roiPct).toBeCloseTo(-100, 2)
  })

  it('devuelve roiPct null cuando la inversión es 0', () => {
    const result = calculateProject(
      makeProject({
        quantity: 1,
        unitCost: 0,
        shippingValue: 0,
        unitSalePrice: 0,
        costs: [],
      }),
    )

    expect(result.totalInvestment).toBe(0)
    expect(result.roiPct).toBeNull()
    expect(result.marginPct).toBeNull()
    expect(result.breakEvenUnitPrice).toBe(0)
  })

  it('devuelve breakEvenUnitPrice null cuando r >= 1', () => {
    const exactly = calculateProject(
      makeProject({ costs: [makeCost({ value: 100, base: 'revenue' })] }),
    )
    const above = calculateProject(
      makeProject({ costs: [makeCost({ value: 120, base: 'revenue' })] }),
    )

    expect(exactly.breakEvenUnitPrice).toBeNull()
    expect(above.breakEvenUnitPrice).toBeNull()
    expect(exactly.netProfit).toBeCloseTo(-580, 2)
  })

  it('calcula el punto de equilibrio con comisiones sobre revenue', () => {
    const result = calculateProject(
      makeProject({
        quantity: 10,
        unitCost: 5,
        shippingValue: 20,
        unitSalePrice: 20,
        costs: [makeCost({ value: 10, base: 'revenue' })],
      }),
    )

    // N = 70, r = 0.1 → P = 70 / (10 × 0.9) = 7.777…
    expect(result.breakEvenUnitPrice).toBeCloseTo(7.7778, 3)
  })
})

describe('calculateProject — costos recuperables', () => {
  it('descuenta los recuperables pagados antes de vender del costo real', () => {
    const result = calculateProject(
      makeProject({
        costs: [makeCost({ id: 'iva', value: 19, base: 'accumulated', recoverable: true })],
      }),
    )

    expect(result.breakdown[0]?.recoverable).toBe(true)
    expect(result.recoverableCostsTotal).toBeCloseTo(110.2, 2)
    expect(result.realInvestmentCost).toBeCloseTo(580, 2)
    expect(result.totalInvestment).toBeCloseTo(690.2, 2)
  })

  it('suma recuperables de ventas sin cambiar la inversión real', () => {
    const result = calculateProject(
      makeProject({
        costs: [makeCost({ id: 'comision', value: 12, base: 'revenue', recoverable: true })],
      }),
    )

    expect(result.recoverableCostsTotal).toBeCloseTo(180, 2)
    expect(result.realInvestmentCost).toBeCloseTo(result.totalInvestment, 2)
  })

  it('ignora recuperables deshabilitados', () => {
    const result = calculateProject(
      makeProject({
        costs: [makeCost({ value: 10, base: 'cif', recoverable: true, enabled: false })],
      }),
    )

    expect(result.recoverableCostsTotal).toBe(0)
    expect(result.realInvestmentCost).toBeCloseTo(result.totalInvestment, 2)
  })

  it('no marca como recuperable nada por defecto', () => {
    const result = calculateProject(makeReferenceProject())

    expect(result.recoverableCostsTotal).toBe(0)
    expect(result.breakdown.every((line) => !line.recoverable)).toBe(true)
  })
})

describe('helpers de normalización', () => {
  it('normalizeQuantity aplica el mínimo 1 y trunca decimales', () => {
    expect(normalizeQuantity(Number.NaN)).toBe(1)
    expect(normalizeQuantity(Number.POSITIVE_INFINITY)).toBe(1)
    expect(normalizeQuantity(0)).toBe(1)
    expect(normalizeQuantity(-3)).toBe(1)
    expect(normalizeQuantity(0.9)).toBe(1)
    expect(normalizeQuantity(4.99)).toBe(4)
    expect(normalizeQuantity(7)).toBe(7)
  })

  it('toAmount convierte inválidos y negativos en 0', () => {
    expect(toAmount(Number.NaN)).toBe(0)
    expect(toAmount(Number.NEGATIVE_INFINITY)).toBe(0)
    expect(toAmount(-1)).toBe(0)
    expect(toAmount(0)).toBe(0)
    expect(toAmount(12.5)).toBe(12.5)
  })
})
