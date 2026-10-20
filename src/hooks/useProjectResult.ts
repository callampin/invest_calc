import { useMemo } from 'react'
import { calculateProject } from '../domain/calculate'
import type { Project, ProjectResult } from '../domain/types'

/** Deriva el resultado del proyecto activo (nunca se guarda en el store). */
export function useProjectResult(project: Project | undefined): ProjectResult | null {
  return useMemo(() => (project ? calculateProject(project) : null), [project])
}
