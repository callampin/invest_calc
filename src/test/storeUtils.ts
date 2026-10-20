import { useProjectsStore } from '../store/useProjectsStore'

/** Deja el store y el almacenamiento en un estado limpio entre tests. */
export function resetProjectsStore(): void {
  localStorage.clear()
  useProjectsStore.setState({ projects: [], activeProjectId: null })
}
