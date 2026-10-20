import { z } from 'zod'

export const costKindSchema = z.enum(['percent', 'fixed'])
export const costBaseSchema = z.enum(['product', 'cif', 'accumulated', 'revenue'])
export const fixedModeSchema = z.enum(['total', 'perUnit'])
export const shippingModeSchema = z.enum(['total', 'perUnit'])

/**
 * Los rangos numéricos se dejan deliberadamente laxos: la fuente de verdad es
 * `calculateProject`, que normaliza valores raros en vez de descartar datos.
 * Aquí solo validamos la forma (números finitos, tipos correctos).
 */
export const costItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  kind: costKindSchema,
  value: z.number().finite(),
  base: costBaseSchema,
  fixedMode: fixedModeSchema,
  enabled: z.boolean(),
  presetId: z.string().min(1).optional(),
  recoverable: z.boolean().optional(),
})

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  currency: z.string().min(1),
  quantity: z.number().finite(),
  unitCost: z.number().finite(),
  shippingMode: shippingModeSchema,
  shippingValue: z.number().finite(),
  unitSalePrice: z.number().finite(),
  costs: z.array(costItemSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const persistedStateSchema = z.object({
  version: z.number().int().nonnegative(),
  projects: z.array(projectSchema),
  activeProjectId: z.string().min(1).nullable(),
})

/** Forma del estado que `zustand/persist` guarda (sin la versión del envelope). */
export const projectsStateSchema = persistedStateSchema.pick({
  projects: true,
  activeProjectId: true,
})

export type CostItemInput = z.input<typeof costItemSchema>
export type ProjectInput = z.input<typeof projectSchema>
export type PersistedStateInput = z.input<typeof persistedStateSchema>
