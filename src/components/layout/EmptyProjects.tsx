import { useProjectsStore } from '../../store/useProjectsStore'
import { Button } from '../common/Button'

export function EmptyProjects() {
  const createProject = useProjectsStore((state) => state.createProject)

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Todavía no hay proyectos
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Crea uno para estimar cuánto invertir y cuánto ganarás al revender tu producto.
      </p>
      <Button className="mt-4" onClick={() => createProject()}>
        Crear mi primer proyecto
      </Button>
    </section>
  )
}
