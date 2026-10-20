import { describe, expect, it } from 'vitest'
import { makeReferenceProject } from '../test/factories'
import { persistedStateSchema, projectSchema } from './schemas'

describe('projectSchema', () => {
  it('acepta un proyecto válido completo', () => {
    const parsed = projectSchema.safeParse(makeReferenceProject())

    expect(parsed.success).toBe(true)
  })

  it('acepta campos opcionales de preset y recuperable', () => {
    const project = makeReferenceProject()
    const parsed = projectSchema.safeParse({
      ...project,
      costs: [{ ...project.costs[0], presetId: 'cl-iva', recoverable: true }],
    })

    expect(parsed.success).toBe(true)
  })

  it('rechaza proyectos a los que les falta un campo obligatorio', () => {
    const withoutName: Record<string, unknown> = { ...makeReferenceProject() }
    delete withoutName.name

    expect(projectSchema.safeParse(withoutName).success).toBe(false)
  })

  it('rechaza valores no numéricos y NaN', () => {
    expect(projectSchema.safeParse({ ...makeReferenceProject(), quantity: '10' }).success).toBe(
      false,
    )
    expect(
      projectSchema.safeParse({ ...makeReferenceProject(), unitCost: Number.NaN }).success,
    ).toBe(false)
  })

  it('rechaza enums desconocidos', () => {
    const project = makeReferenceProject()

    expect(
      projectSchema.safeParse({
        ...project,
        costs: [{ ...project.costs[0], kind: 'otro' }],
      }).success,
    ).toBe(false)
    expect(projectSchema.safeParse({ ...project, shippingMode: 'caja' }).success).toBe(false)
  })

  it('rechaza costos que no son un arreglo', () => {
    expect(projectSchema.safeParse({ ...makeReferenceProject(), costs: {} }).success).toBe(false)
  })
})

describe('persistedStateSchema', () => {
  it('acepta un estado sin proyecto activo', () => {
    const parsed = persistedStateSchema.safeParse({
      version: 1,
      projects: [makeReferenceProject()],
      activeProjectId: null,
    })

    expect(parsed.success).toBe(true)
  })

  it('rechaza versiones inválidas y activeProjectId no textual', () => {
    expect(
      persistedStateSchema.safeParse({ version: -1, projects: [], activeProjectId: null }).success,
    ).toBe(false)
    expect(
      persistedStateSchema.safeParse({ version: 1, projects: [], activeProjectId: 3 }).success,
    ).toBe(false)
    expect(persistedStateSchema.safeParse({ projects: [], activeProjectId: null }).success).toBe(
      false,
    )
  })

  it('rechaza proyectos corruptos dentro del estado', () => {
    const parsed = persistedStateSchema.safeParse({
      version: 1,
      projects: [{ id: 'x' }],
      activeProjectId: null,
    })

    expect(parsed.success).toBe(false)
  })
})
