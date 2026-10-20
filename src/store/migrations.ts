/**
 * Migraciones del estado persistido. Cada versión nueva agrega un paso que
 * transforma la forma anterior sin perder los datos del usuario.
 */

export const SCHEMA_VERSION = 1

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migrateCostV0(cost: unknown): unknown {
  if (!isRecord(cost)) {
    return cost
  }

  return {
    kind: 'percent',
    value: 0,
    base: 'cif',
    fixedMode: 'total',
    enabled: true,
    ...cost,
  }
}

function migrateProjectV0(project: unknown): unknown {
  if (!isRecord(project)) {
    return project
  }

  return {
    quantity: 1,
    shippingMode: 'total',
    shippingValue: 0,
    unitCost: 0,
    unitSalePrice: 0,
    currency: 'USD',
    ...project,
    costs: Array.isArray(project.costs) ? project.costs.map(migrateCostV0) : [],
  }
}

/** v0 (prototipo previo) → v1: completa campos que antes no existían. */
function migrateV0ToV1(state: unknown): unknown {
  if (!isRecord(state)) {
    return state
  }

  return {
    ...state,
    projects: Array.isArray(state.projects) ? state.projects.map(migrateProjectV0) : [],
    activeProjectId: state.activeProjectId ?? null,
  }
}

/**
 * Aplica las migraciones necesarias desde `version` hasta `SCHEMA_VERSION`.
 * Es tolerante a datos inválidos: la validación final la hace Zod.
 */
export function migratePersistedState(persisted: unknown, version: number): unknown {
  let state = persisted
  const fromVersion = Number.isFinite(version) ? version : 0

  if (fromVersion < 1) {
    state = migrateV0ToV1(state)
  }

  return state
}
