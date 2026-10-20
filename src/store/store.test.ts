import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_KEY, STORAGE_KEY, subscribeToStorageErrors } from './storage'
import { SCHEMA_VERSION } from './migrations'
import { useProjectsStore } from './useProjectsStore'
import type { Project } from '../domain/types'
import { makeReferenceProject } from '../test/factories'

function resetStore(): void {
  localStorage.clear()
  useProjectsStore.setState({ projects: [], activeProjectId: null })
}

function readPersisted(): { state: unknown; version: number } {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    throw new Error('No hay estado persistido')
  }

  return JSON.parse(raw) as { state: unknown; version: number }
}

function writePersisted(state: unknown, version: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }))
}

async function rehydrate(): Promise<void> {
  await useProjectsStore.persist.rehydrate()
}

function activeProject(): Project {
  const { projects, activeProjectId } = useProjectsStore.getState()
  const project = projects.find((candidate) => candidate.id === activeProjectId)

  if (!project) {
    throw new Error('No hay proyecto activo')
  }

  return project
}

beforeEach(() => {
  vi.useRealTimers()
  resetStore()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createProject', () => {
  it('crea un proyecto con los presets de Chile y lo activa', () => {
    const id = useProjectsStore.getState().createProject()
    const state = useProjectsStore.getState()
    const project = state.projects[0]

    expect(state.projects).toHaveLength(1)
    expect(state.activeProjectId).toBe(id)
    expect(project?.id).toBe(id)
    expect(project?.currency).toBe('CLP')
    expect(project?.quantity).toBe(1)
    expect(project?.shippingMode).toBe('total')
    expect(project?.costs.map((cost) => cost.presetId)).toEqual([
      'cl-arancel',
      'cl-iva',
      'cl-comision-plataforma',
    ])
    expect(project?.costs.every((cost) => cost.enabled)).toBe(true)
    expect(project?.createdAt).toBe(project?.updatedAt)
  })

  it('numera los proyectos por defecto sin repetir nombres', () => {
    const store = useProjectsStore.getState()
    store.createProject()
    store.createProject()
    store.createProject({ name: '  Mi producto  ' })

    expect(useProjectsStore.getState().projects.map((project) => project.name)).toEqual([
      'Proyecto 1',
      'Proyecto 2',
      'Mi producto',
    ])
  })

  it('usa el perfil GENERIC cuando se pide', () => {
    useProjectsStore.getState().createProject({ countryCode: 'GENERIC', name: 'Genérico' })
    const project = activeProject()

    expect(project.currency).toBe('USD')
    expect(project.costs.map((cost) => cost.presetId)).toEqual([
      'generic-arancel',
      'generic-impuesto',
      'generic-comision',
    ])
  })

  it('persiste el proyecto automáticamente', () => {
    const id = useProjectsStore.getState().createProject()
    const persisted = readPersisted()

    expect(persisted.version).toBe(SCHEMA_VERSION)
    expect(persisted.state).toMatchObject({ activeProjectId: id })
    expect((persisted.state as { projects: Project[] }).projects).toHaveLength(1)
  })
})

describe('duplicateProject', () => {
  it('crea una copia independiente justo después del original', () => {
    const store = useProjectsStore.getState()
    const originalId = store.createProject({ name: 'Original' })
    const copyId = store.duplicateProject(originalId)
    const state = useProjectsStore.getState()

    expect(copyId).toBeDefined()
    expect(state.projects).toHaveLength(2)
    expect(state.projects[1]?.name).toBe('Original (copia)')
    expect(state.activeProjectId).toBe(copyId)

    const original = state.projects[0]
    const copy = state.projects[1]

    expect(copy?.costs).toHaveLength(original?.costs.length ?? 0)
    expect(copy?.costs.map((cost) => cost.id)).not.toEqual(original?.costs.map((cost) => cost.id))
  })

  it('evita nombres de copia repetidos', () => {
    const store = useProjectsStore.getState()
    const id = store.createProject({ name: 'Producto' })
    store.duplicateProject(id)
    store.duplicateProject(id)

    expect(useProjectsStore.getState().projects.map((project) => project.name)).toEqual([
      'Producto',
      'Producto (copia)',
      'Producto (copia 2)',
    ])
  })

  it('devuelve undefined si el proyecto no existe', () => {
    expect(useProjectsStore.getState().duplicateProject('no-existe')).toBeUndefined()
  })
})

describe('deleteProject', () => {
  it('elimina el proyecto y activa el siguiente o el anterior', () => {
    const store = useProjectsStore.getState()
    const first = store.createProject({ name: 'A' })
    const second = store.createProject({ name: 'B' })
    const third = store.createProject({ name: 'C' })

    store.deleteProject(second)
    let state = useProjectsStore.getState()
    expect(state.projects.map((project) => project.name)).toEqual(['A', 'C'])
    expect(state.activeProjectId).toBe(third)

    store.deleteProject(third)
    state = useProjectsStore.getState()
    expect(state.activeProjectId).toBe(first)
  })

  it('deja activeProjectId en null al borrar el último proyecto', () => {
    const store = useProjectsStore.getState()
    const id = store.createProject()
    store.deleteProject(id)

    expect(useProjectsStore.getState().projects).toEqual([])
    expect(useProjectsStore.getState().activeProjectId).toBeNull()
  })

  it('no hace nada si el proyecto no existe', () => {
    const id = useProjectsStore.getState().createProject()
    useProjectsStore.getState().deleteProject('no-existe')

    expect(useProjectsStore.getState().projects.map((project) => project.id)).toEqual([id])
  })
})

describe('renameProject', () => {
  it('recorta espacios y actualiza updatedAt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))
    const id = useProjectsStore.getState().createProject()

    vi.setSystemTime(new Date('2026-05-01T00:05:00.000Z'))
    useProjectsStore.getState().renameProject(id, '  Nuevo nombre  ')
    const project = useProjectsStore.getState().projects[0]

    expect(project?.name).toBe('Nuevo nombre')
    expect(project?.updatedAt).toBe('2026-05-01T00:05:00.000Z')
  })

  it('usa un nombre de respaldo si queda vacío', () => {
    const id = useProjectsStore.getState().createProject()
    useProjectsStore.getState().renameProject(id, '   ')

    expect(useProjectsStore.getState().projects[0]?.name).toBe('Proyecto sin nombre')
  })
})

describe('setActiveProject', () => {
  it('activa solo proyectos existentes', () => {
    const store = useProjectsStore.getState()
    const first = store.createProject()
    store.createProject()

    store.setActiveProject(first)
    expect(useProjectsStore.getState().activeProjectId).toBe(first)

    store.setActiveProject('no-existe')
    expect(useProjectsStore.getState().activeProjectId).toBe(first)

    store.setActiveProject(null)
    expect(useProjectsStore.getState().activeProjectId).toBeNull()
  })
})

describe('updateProduct', () => {
  it('actualiza los datos del producto', () => {
    const id = useProjectsStore.getState().createProject()
    useProjectsStore.getState().updateProduct(id, {
      name: 'Audífonos',
      currency: 'usd',
      quantity: 25,
      unitCost: 12.5,
      shippingMode: 'perUnit',
      shippingValue: 1.5,
      unitSalePrice: 39.9,
    })
    const project = activeProject()

    expect(project).toMatchObject({
      name: 'Audífonos',
      currency: 'USD',
      quantity: 25,
      unitCost: 12.5,
      shippingMode: 'perUnit',
      shippingValue: 1.5,
      unitSalePrice: 39.9,
    })
  })

  it('normaliza cantidades y montos inválidos', () => {
    const id = useProjectsStore.getState().createProject()
    useProjectsStore.getState().updateProduct(id, {
      quantity: 2.9,
      unitCost: -5,
      shippingValue: Number.NaN,
      unitSalePrice: -1,
      currency: 'e',
      shippingMode: 'caja' as never,
    })
    const project = activeProject()

    expect(project.quantity).toBe(2)
    expect(project.unitCost).toBe(0)
    expect(project.shippingValue).toBe(0)
    expect(project.unitSalePrice).toBe(0)
    expect(project.currency).toBe('USD')
    expect(project.shippingMode).toBe('total')
  })

  it('solo modifica el proyecto indicado', () => {
    const store = useProjectsStore.getState()
    const first = store.createProject({ name: 'A' })
    const second = store.createProject({ name: 'B' })

    store.updateProduct(first, { unitCost: 99 })
    const [projectA, projectB] = useProjectsStore.getState().projects

    expect(projectA?.unitCost).toBe(99)
    expect(projectB?.name).toBe('B')
    expect(projectB?.id).toBe(second)
  })
})

describe('costos', () => {
  it('agrega un costo personalizado al final', () => {
    const id = useProjectsStore.getState().createProject()
    const costId = useProjectsStore.getState().addCost(id, {
      title: '  Embalaje  ',
      kind: 'fixed',
      value: 3,
      base: 'cif',
      fixedMode: 'perUnit',
    })
    const project = activeProject()
    const cost = project.costs.at(-1)

    expect(costId).toBeDefined()
    expect(cost).toMatchObject({
      id: costId,
      title: 'Embalaje',
      kind: 'fixed',
      value: 3,
      fixedMode: 'perUnit',
      enabled: true,
    })
    expect(cost?.presetId).toBeUndefined()
  })

  it('usa un título de respaldo y descarta valores negativos', () => {
    const id = useProjectsStore.getState().createProject()
    useProjectsStore.getState().addCost(id, {
      title: '',
      kind: 'percent',
      value: -10,
      base: 'revenue',
      fixedMode: 'total',
    })

    expect(activeProject().costs.at(-1)).toMatchObject({
      title: 'Costo sin título',
      value: 0,
    })
  })

  it('devuelve undefined si el proyecto no existe', () => {
    expect(
      useProjectsStore.getState().addCost('no-existe', {
        title: 'X',
        kind: 'fixed',
        value: 1,
        base: 'cif',
        fixedMode: 'total',
      }),
    ).toBeUndefined()
  })

  it('edita un costo sin tocar los demás', () => {
    const id = useProjectsStore.getState().createProject()
    const iva = activeProject().costs.find((cost) => cost.presetId === 'cl-iva')

    useProjectsStore.getState().updateCost(id, iva?.id ?? '', {
      title: 'IVA 19 %',
      value: 21,
      base: 'cif',
    })
    const updated = activeProject().costs.find((cost) => cost.id === iva?.id)
    const others = activeProject().costs.filter((cost) => cost.id !== iva?.id)

    expect(updated).toMatchObject({ title: 'IVA 19 %', value: 21, base: 'cif' })
    expect(others.every((cost) => cost.value !== 21)).toBe(true)
  })

  it('sanea parches inválidos al editar', () => {
    const id = useProjectsStore.getState().createProject()
    const costId = activeProject().costs[0]?.id ?? ''

    useProjectsStore.getState().updateCost(id, costId, {
      value: -3,
      kind: 'raro' as never,
      base: 'rara' as never,
    })
    const cost = activeProject().costs.find((candidate) => candidate.id === costId)

    expect(cost?.value).toBe(0)
    expect(cost?.kind).toBe('percent')
    expect(cost?.base).toBe('cif')
  })

  it('elimina un costo', () => {
    const id = useProjectsStore.getState().createProject()
    const costId = activeProject().costs[0]?.id ?? ''

    useProjectsStore.getState().removeCost(id, costId)

    expect(activeProject().costs.some((cost) => cost.id === costId)).toBe(false)
    expect(activeProject().costs).toHaveLength(2)
  })

  it('activa y desactiva un costo', () => {
    const id = useProjectsStore.getState().createProject()
    const costId = activeProject().costs[0]?.id ?? ''

    useProjectsStore.getState().toggleCost(id, costId)
    expect(activeProject().costs[0]?.enabled).toBe(false)

    useProjectsStore.getState().toggleCost(id, costId)
    expect(activeProject().costs[0]?.enabled).toBe(true)
  })

  it('mueve costos hacia arriba y hacia abajo', () => {
    const id = useProjectsStore.getState().createProject()
    const ivaId = activeProject().costs.find((cost) => cost.presetId === 'cl-iva')?.id ?? ''

    useProjectsStore.getState().moveCost(id, ivaId, 'up')
    expect(activeProject().costs.map((cost) => cost.presetId)).toEqual([
      'cl-iva',
      'cl-arancel',
      'cl-comision-plataforma',
    ])

    useProjectsStore.getState().moveCost(id, ivaId, 'down')
    expect(activeProject().costs.map((cost) => cost.presetId)).toEqual([
      'cl-arancel',
      'cl-iva',
      'cl-comision-plataforma',
    ])
  })

  it('no mueve costos fuera de los límites', () => {
    const id = useProjectsStore.getState().createProject()
    const [first, , third] = activeProject().costs

    useProjectsStore.getState().moveCost(id, first?.id ?? '', 'up')
    storeOrder(id, ['cl-arancel', 'cl-iva', 'cl-comision-plataforma'])

    useProjectsStore.getState().moveCost(id, third?.id ?? '', 'down')
    storeOrder(id, ['cl-arancel', 'cl-iva', 'cl-comision-plataforma'])
  })

  it('restablece el valor de un preset editado', () => {
    const id = useProjectsStore.getState().createProject()
    const iva = activeProject().costs.find((cost) => cost.presetId === 'cl-iva')

    useProjectsStore.getState().updateCost(id, iva?.id ?? '', { value: 21 })
    useProjectsStore.getState().resetCostToPreset(id, iva?.id ?? '')

    expect(activeProject().costs.find((cost) => cost.id === iva?.id)?.value).toBe(19)
  })

  it('no restablece costos personalizados', () => {
    const id = useProjectsStore.getState().createProject()
    const costId = useProjectsStore.getState().addCost(id, {
      title: 'Personalizado',
      kind: 'fixed',
      value: 7,
      base: 'cif',
      fixedMode: 'total',
    })

    useProjectsStore.getState().resetCostToPreset(id, costId ?? '')

    expect(activeProject().costs.at(-1)?.value).toBe(7)
  })

  it('vuelve a agregar un preset eliminado sin duplicarlo', () => {
    const id = useProjectsStore.getState().createProject()
    const iva = activeProject().costs.find((cost) => cost.presetId === 'cl-iva')

    useProjectsStore.getState().removeCost(id, iva?.id ?? '')
    const newId = useProjectsStore.getState().addPresetCost(id, 'cl-iva')
    const costs = activeProject().costs

    expect(newId).toBeDefined()
    expect(costs.filter((cost) => cost.presetId === 'cl-iva')).toHaveLength(1)
    expect(costs.at(-1)).toMatchObject({ presetId: 'cl-iva', value: 19, title: 'IVA importación' })

    const again = useProjectsStore.getState().addPresetCost(id, 'cl-iva')
    expect(again).toBe(newId)
    expect(activeProject().costs).toHaveLength(3)
  })

  it('ignora presets desconocidos', () => {
    const id = useProjectsStore.getState().createProject()

    expect(useProjectsStore.getState().addPresetCost(id, 'no-existe')).toBeUndefined()
    expect(useProjectsStore.getState().addPresetCost('no-existe', 'cl-iva')).toBeUndefined()
  })
})

function storeOrder(projectId: string, expected: string[]): void {
  const project = useProjectsStore
    .getState()
    .projects.find((candidate) => candidate.id === projectId)

  expect(project?.costs.map((cost) => cost.presetId)).toEqual(expected)
}

describe('importProjects', () => {
  it('fusiona proyectos y regenera los ids en conflicto', () => {
    const localId = useProjectsStore.getState().createProject({ name: 'Local' })
    const imported = { ...makeReferenceProject(), id: localId, name: 'Importado' }
    const importedCostIds = imported.costs.map((cost) => cost.id)

    const count = useProjectsStore.getState().importProjects([imported], 'merge')
    const state = useProjectsStore.getState()
    const added = state.projects[1]

    expect(count).toBe(1)
    expect(state.projects).toHaveLength(2)
    expect(added?.name).toBe('Importado')
    expect(added?.id).not.toBe(localId)
    expect(added?.costs.map((cost) => cost.id)).not.toEqual(importedCostIds)
    expect(state.activeProjectId).toBe(localId)
  })

  it('reemplaza todos los proyectos', () => {
    useProjectsStore.getState().createProject({ name: 'Local' })
    const imported = makeReferenceProject()

    const count = useProjectsStore.getState().importProjects([imported], 'replace')
    const state = useProjectsStore.getState()

    expect(count).toBe(1)
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0]?.name).toBe('Proyecto de prueba')
    expect(state.activeProjectId).toBe(state.projects[0]?.id)
  })

  it('no cambia nada con una lista vacía', () => {
    const id = useProjectsStore.getState().createProject()

    const count = useProjectsStore.getState().importProjects([], 'replace')

    expect(count).toBe(0)
    expect(useProjectsStore.getState().projects.map((project) => project.id)).toEqual([id])
  })
})

describe('clearAllData', () => {
  it('borra proyectos, respaldo y almacenamiento', () => {
    useProjectsStore.getState().createProject()
    localStorage.setItem(BACKUP_KEY, 'respaldo')

    useProjectsStore.getState().clearAllData()

    expect(useProjectsStore.getState().projects).toEqual([])
    expect(useProjectsStore.getState().activeProjectId).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull()
  })
})

describe('persistencia', () => {
  it('guarda solo los datos de entrada, no los resultados', () => {
    useProjectsStore.getState().createProject()
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''

    expect(raw).not.toContain('netProfit')
    expect(raw).not.toContain('totalInvestment')
    expect(raw).not.toContain('createProject')
  })

  it('recarga el estado guardado al rehidratar', async () => {
    const id = useProjectsStore.getState().createProject({ name: 'Persistido' })
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''

    useProjectsStore.setState({ projects: [], activeProjectId: null })
    localStorage.setItem(STORAGE_KEY, raw)
    await rehydrate()

    const state = useProjectsStore.getState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0]?.name).toBe('Persistido')
    expect(state.activeProjectId).toBe(id)
  })

  it('respalda y descarta JSON corrupto', async () => {
    useProjectsStore.setState({ projects: [], activeProjectId: null })
    localStorage.setItem(STORAGE_KEY, '{esto no es json')
    await rehydrate()

    expect(useProjectsStore.getState().projects).toEqual([])
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{esto no es json')
  })

  it('respalda y descarta estados que no cumplen el esquema', async () => {
    useProjectsStore.setState({ projects: [], activeProjectId: null })
    writePersisted({ projects: [{ id: 'roto' }], activeProjectId: 'roto' }, SCHEMA_VERSION)
    await rehydrate()

    expect(useProjectsStore.getState().projects).toEqual([])
    expect(useProjectsStore.getState().activeProjectId).toBeNull()
    expect(localStorage.getItem(BACKUP_KEY)).toContain('"id":"roto"')
  })

  it('corrige un activeProjectId que no existe', async () => {
    const id = useProjectsStore.getState().createProject()
    const raw = localStorage.getItem(STORAGE_KEY) ?? ''

    useProjectsStore.setState({ projects: [], activeProjectId: null })
    localStorage.setItem(STORAGE_KEY, raw)
    const persisted = JSON.parse(raw) as { state: { activeProjectId: string }; version: number }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { ...persisted.state, activeProjectId: 'fantasma' },
        version: persisted.version,
      }),
    )
    await rehydrate()

    expect(useProjectsStore.getState().activeProjectId).toBe(id)
  })

  it('migra datos de la versión 0 completando los campos nuevos', async () => {
    useProjectsStore.setState({ projects: [], activeProjectId: null })
    writePersisted(
      {
        projects: [
          {
            id: 'viejo',
            name: 'Proyecto viejo',
            unitCost: 10,
            unitSalePrice: 20,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            costs: [{ id: 'costo-viejo', title: 'IVA', value: 19 }],
          },
        ],
        activeProjectId: 'viejo',
      },
      0,
    )

    await rehydrate()

    const state = useProjectsStore.getState()
    const project = state.projects[0]

    expect(state.activeProjectId).toBe('viejo')
    expect(project).toMatchObject({
      quantity: 1,
      shippingMode: 'total',
      shippingValue: 0,
      currency: 'USD',
    })
    expect(project?.costs[0]).toMatchObject({
      kind: 'percent',
      base: 'cif',
      fixedMode: 'total',
      enabled: true,
      value: 19,
    })
  })

  it('avisa y sigue funcionando si localStorage no puede escribir', () => {
    const messages: string[] = []
    const unsubscribe = subscribeToStorageErrors((message) => messages.push(message))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    useProjectsStore.getState().createProject()

    expect(messages.length).toBeGreaterThan(0)
    expect(useProjectsStore.getState().projects).toHaveLength(1)

    setItem.mockRestore()
    unsubscribe()
  })
})
