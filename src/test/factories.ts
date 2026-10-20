import type { CostItem, Project } from '../domain/types'

export function makeCost(overrides: Partial<CostItem> = {}): CostItem {
  return {
    id: 'cost-1',
    title: 'Costo',
    kind: 'percent',
    value: 0,
    base: 'cif',
    fixedMode: 'total',
    enabled: true,
    ...overrides,
  }
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Proyecto de prueba',
    currency: 'USD',
    quantity: 100,
    unitCost: 5,
    shippingMode: 'total',
    shippingValue: 80,
    unitSalePrice: 15,
    costs: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Los cuatro costos del ejemplo de referencia de AGENTS.md §5.4. */
export function makeReferenceCosts(): CostItem[] {
  return [
    makeCost({ id: 'arancel', title: 'Arancel', kind: 'percent', value: 6, base: 'cif' }),
    makeCost({ id: 'iva', title: 'IVA', kind: 'percent', value: 19, base: 'accumulated' }),
    makeCost({
      id: 'comision',
      title: 'Comisión plataforma',
      kind: 'percent',
      value: 12,
      base: 'revenue',
    }),
    makeCost({
      id: 'envio-volumen',
      title: 'Envío por volumen',
      kind: 'fixed',
      value: 50,
      fixedMode: 'total',
    }),
  ]
}

export function makeReferenceProject(): Project {
  return makeProject({ costs: makeReferenceCosts() })
}
