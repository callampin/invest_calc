import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createDefaultCosts,
  DEFAULT_COUNTRY_CODE,
  findPreset,
  getCountryProfile,
  presetToCostItem,
} from '../config/presets'
import { createId } from '../domain/id'
import { projectsStateSchema } from '../domain/schemas'
import type {
  CostBase,
  CostItem,
  CostKind,
  FixedMode,
  Project,
  ShippingMode,
} from '../domain/types'
import { migratePersistedState, SCHEMA_VERSION } from './migrations'
import {
  backupCorruptData,
  type PersistedProjectsState,
  projectsStorage,
  removeStorageItem,
  STORAGE_KEY,
  BACKUP_KEY,
} from './storage'

const FALLBACK_PROJECT_NAME = 'Proyecto sin nombre'
const FALLBACK_COST_TITLE = 'Costo sin título'
const FALLBACK_CURRENCY = 'USD'

const COST_BASES: CostBase[] = ['product', 'cif', 'accumulated', 'revenue']
const SHIPPING_MODES: ShippingMode[] = ['total', 'perUnit']

export interface ProductPatch {
  name?: string
  currency?: string
  quantity?: number
  unitCost?: number
  shippingMode?: ShippingMode
  shippingValue?: number
  unitSalePrice?: number
}

export interface NewCostInput {
  title: string
  kind: CostKind
  value: number
  base: CostBase
  fixedMode: FixedMode
}

export type CostPatch = Partial<
  Pick<CostItem, 'title' | 'kind' | 'value' | 'base' | 'fixedMode' | 'enabled' | 'recoverable'>
>

export interface CreateProjectOptions {
  name?: string
  countryCode?: string
}

export type ImportMode = 'replace' | 'merge'

export interface ProjectsStore extends PersistedProjectsState {
  createProject: (options?: CreateProjectOptions) => string
  duplicateProject: (projectId: string) => string | undefined
  deleteProject: (projectId: string) => void
  renameProject: (projectId: string, name: string) => void
  setActiveProject: (projectId: string | null) => void
  updateProduct: (projectId: string, patch: ProductPatch) => void
  addCost: (projectId: string, input: NewCostInput) => string | undefined
  updateCost: (projectId: string, costId: string, patch: CostPatch) => void
  removeCost: (projectId: string, costId: string) => void
  toggleCost: (projectId: string, costId: string) => void
  moveCost: (projectId: string, costId: string, direction: 'up' | 'down') => void
  resetCostToPreset: (projectId: string, costId: string) => void
  addPresetCost: (projectId: string, presetId: string) => string | undefined
  importProjects: (projects: Project[], mode: ImportMode) => number
  clearAllData: () => void
}

export const initialProjectsState: PersistedProjectsState = {
  projects: [],
  activeProjectId: null,
}

function nowIso(): string {
  return new Date().toISOString()
}

function toNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function sanitizeCurrency(currency: string): string {
  const code = currency
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)

  return code.length === 3 ? code : FALLBACK_CURRENCY
}

function sanitizeKind(kind: CostKind): CostKind {
  return kind === 'fixed' ? 'fixed' : 'percent'
}

function sanitizeBase(base: CostBase): CostBase {
  return COST_BASES.includes(base) ? base : 'cif'
}

function sanitizeFixedMode(fixedMode: FixedMode): FixedMode {
  return fixedMode === 'perUnit' ? 'perUnit' : 'total'
}

function sanitizeShippingMode(shippingMode: ShippingMode): ShippingMode {
  return SHIPPING_MODES.includes(shippingMode) ? shippingMode : 'total'
}

function sanitizeProjectName(name: string): string {
  return name.trim() || FALLBACK_PROJECT_NAME
}

function sanitizeCostTitle(title: string): string {
  return title.trim() || FALLBACK_COST_TITLE
}

function nextProjectName(projects: Project[]): string {
  const usedNames = new Set(projects.map((project) => project.name))
  let index = projects.length + 1

  while (usedNames.has(`Proyecto ${index}`)) {
    index += 1
  }

  return `Proyecto ${index}`
}

function copyName(name: string, usedNames: Set<string>): string {
  const first = `${name} (copia)`

  if (!usedNames.has(first)) {
    return first
  }

  let index = 2
  while (usedNames.has(`${name} (copia ${index})`)) {
    index += 1
  }

  return `${name} (copia ${index})`
}

function resolveActiveId(projects: Project[], activeProjectId: string | null): string | null {
  if (activeProjectId && projects.some((project) => project.id === activeProjectId)) {
    return activeProjectId
  }

  return projects[0]?.id ?? null
}

function updateProject(
  projects: Project[],
  projectId: string,
  updater: (project: Project) => Project,
): Project[] {
  return projects.map((project) => (project.id === projectId ? updater(project) : project))
}

function applyCostPatch(cost: CostItem, patch: CostPatch): CostItem {
  const next: CostItem = { ...cost }

  if (patch.title !== undefined) {
    next.title = sanitizeCostTitle(patch.title)
  }
  if (patch.kind !== undefined) {
    next.kind = sanitizeKind(patch.kind)
  }
  if (patch.value !== undefined) {
    next.value = toNonNegative(patch.value)
  }
  if (patch.base !== undefined) {
    next.base = sanitizeBase(patch.base)
  }
  if (patch.fixedMode !== undefined) {
    next.fixedMode = sanitizeFixedMode(patch.fixedMode)
  }
  if (patch.enabled !== undefined) {
    next.enabled = patch.enabled
  }
  if (patch.recoverable !== undefined) {
    next.recoverable = patch.recoverable
  }

  return next
}

function applyProductPatch(project: Project, patch: ProductPatch): Project {
  const next: Project = { ...project }

  if (patch.name !== undefined) {
    next.name = sanitizeProjectName(patch.name)
  }
  if (patch.currency !== undefined) {
    next.currency = sanitizeCurrency(patch.currency)
  }
  if (patch.quantity !== undefined) {
    next.quantity = Math.floor(toNonNegative(patch.quantity))
  }
  if (patch.unitCost !== undefined) {
    next.unitCost = toNonNegative(patch.unitCost)
  }
  if (patch.shippingMode !== undefined) {
    next.shippingMode = sanitizeShippingMode(patch.shippingMode)
  }
  if (patch.shippingValue !== undefined) {
    next.shippingValue = toNonNegative(patch.shippingValue)
  }
  if (patch.unitSalePrice !== undefined) {
    next.unitSalePrice = toNonNegative(patch.unitSalePrice)
  }

  return { ...next, updatedAt: nowIso() }
}

function validatePersistedState(persisted: unknown): PersistedProjectsState {
  const parsed = projectsStateSchema.safeParse(persisted)

  if (!parsed.success) {
    backupCorruptData(persisted)
    return { ...initialProjectsState }
  }

  return {
    projects: parsed.data.projects,
    activeProjectId: resolveActiveId(parsed.data.projects, parsed.data.activeProjectId),
  }
}

export const useProjectsStore = create<ProjectsStore>()(
  persist(
    (set, get) => ({
      ...initialProjectsState,

      createProject: (options) => {
        const profile = getCountryProfile(options?.countryCode ?? DEFAULT_COUNTRY_CODE)
        const timestamp = nowIso()
        const project: Project = {
          id: createId(),
          name: options?.name?.trim() || nextProjectName(get().projects),
          currency: profile.currency,
          quantity: 1,
          unitCost: 0,
          shippingMode: 'total',
          shippingValue: 0,
          unitSalePrice: 0,
          costs: createDefaultCosts(profile),
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }))

        return project.id
      },

      duplicateProject: (projectId) => {
        const state = get()
        const original = state.projects.find((project) => project.id === projectId)

        if (!original) {
          return undefined
        }

        const timestamp = nowIso()
        const copy: Project = {
          ...original,
          id: createId(),
          name: copyName(original.name, new Set(state.projects.map((project) => project.name))),
          costs: original.costs.map((cost) => ({ ...cost, id: createId() })),
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        set({ projects: [...state.projects, copy], activeProjectId: copy.id })

        return copy.id
      },

      deleteProject: (projectId) => {
        const state = get()
        const index = state.projects.findIndex((project) => project.id === projectId)

        if (index === -1) {
          return
        }

        const projects = state.projects.filter((project) => project.id !== projectId)
        const activeProjectId =
          state.activeProjectId === projectId
            ? resolveActiveId(projects, projects[Math.min(index, projects.length - 1)]?.id ?? null)
            : state.activeProjectId

        set({ projects, activeProjectId })
      },

      renameProject: (projectId, name) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => ({
            ...project,
            name: sanitizeProjectName(name),
            updatedAt: nowIso(),
          })),
        }))
      },

      setActiveProject: (projectId) => {
        if (projectId === null) {
          set({ activeProjectId: null })
          return
        }

        if (get().projects.some((project) => project.id === projectId)) {
          set({ activeProjectId: projectId })
        }
      },

      updateProduct: (projectId, patch) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) =>
            applyProductPatch(project, patch),
          ),
        }))
      },

      addCost: (projectId, input) => {
        const project = get().projects.find((candidate) => candidate.id === projectId)

        if (!project) {
          return undefined
        }

        const cost: CostItem = {
          id: createId(),
          title: sanitizeCostTitle(input.title),
          kind: sanitizeKind(input.kind),
          value: toNonNegative(input.value),
          base: sanitizeBase(input.base),
          fixedMode: sanitizeFixedMode(input.fixedMode),
          enabled: true,
        }

        set((state) => ({
          projects: updateProject(state.projects, projectId, (current) => ({
            ...current,
            costs: [...current.costs, cost],
            updatedAt: nowIso(),
          })),
        }))

        return cost.id
      },

      updateCost: (projectId, costId, patch) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => ({
            ...project,
            costs: project.costs.map((cost) =>
              cost.id === costId ? applyCostPatch(cost, patch) : cost,
            ),
            updatedAt: nowIso(),
          })),
        }))
      },

      removeCost: (projectId, costId) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => ({
            ...project,
            costs: project.costs.filter((cost) => cost.id !== costId),
            updatedAt: nowIso(),
          })),
        }))
      },

      toggleCost: (projectId, costId) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => ({
            ...project,
            costs: project.costs.map((cost) =>
              cost.id === costId ? { ...cost, enabled: !cost.enabled } : cost,
            ),
            updatedAt: nowIso(),
          })),
        }))
      },

      moveCost: (projectId, costId, direction) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => {
            const index = project.costs.findIndex((cost) => cost.id === costId)
            const targetIndex = direction === 'up' ? index - 1 : index + 1

            if (index === -1 || targetIndex < 0 || targetIndex >= project.costs.length) {
              return project
            }

            const costs = [...project.costs]
            const [moved] = costs.splice(index, 1)
            costs.splice(targetIndex, 0, moved)

            return { ...project, costs, updatedAt: nowIso() }
          }),
        }))
      },

      resetCostToPreset: (projectId, costId) => {
        const cost = get()
          .projects.find((project) => project.id === projectId)
          ?.costs.find((candidate) => candidate.id === costId)

        const preset = cost?.presetId ? findPreset(cost.presetId) : undefined

        if (!preset) {
          return
        }

        set((state) => ({
          projects: updateProject(state.projects, projectId, (project) => ({
            ...project,
            costs: project.costs.map((current) =>
              current.id === costId
                ? { ...current, value: toNonNegative(preset.defaultValue) }
                : current,
            ),
            updatedAt: nowIso(),
          })),
        }))
      },

      addPresetCost: (projectId, presetId) => {
        const project = get().projects.find((candidate) => candidate.id === projectId)
        const preset = findPreset(presetId)

        if (!project || !preset) {
          return undefined
        }

        const existing = project.costs.find((cost) => cost.presetId === presetId)
        if (existing) {
          return existing.id
        }

        const cost = presetToCostItem(preset)

        set((state) => ({
          projects: updateProject(state.projects, projectId, (current) => ({
            ...current,
            costs: [...current.costs, cost],
            updatedAt: nowIso(),
          })),
        }))

        return cost.id
      },

      importProjects: (incoming, mode) => {
        const state = get()
        const timestamp = nowIso()
        const usedIds = new Set(mode === 'merge' ? state.projects.map((project) => project.id) : [])

        const imported = incoming.map((project) => {
          let projectId = project.id

          if (usedIds.has(projectId)) {
            projectId = createId()
          }
          usedIds.add(projectId)

          return {
            ...project,
            id: projectId,
            costs: project.costs.map((cost) => ({ ...cost, id: createId() })),
            updatedAt: timestamp,
          }
        })

        if (imported.length === 0) {
          return 0
        }

        const projects = mode === 'merge' ? [...state.projects, ...imported] : imported
        const activeProjectId =
          mode === 'merge'
            ? resolveActiveId(projects, state.activeProjectId)
            : (imported[0]?.id ?? null)

        set({ projects, activeProjectId })

        return imported.length
      },

      clearAllData: () => {
        set({ projects: [], activeProjectId: null })
        removeStorageItem(STORAGE_KEY)
        removeStorageItem(BACKUP_KEY)
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: projectsStorage,
      partialize: (state): PersistedProjectsState => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
      migrate: (persistedState, version) =>
        migratePersistedState(persistedState, version) as PersistedProjectsState,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...validatePersistedState(persistedState),
      }),
    },
  ),
)

/** Proyecto activo, o null si no hay ninguno. */
export function selectActiveProject(state: ProjectsStore): Project | undefined {
  return state.projects.find((project) => project.id === state.activeProjectId)
}
