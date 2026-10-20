import { useState } from 'react'
import { useProjectsStore } from '../../store/useProjectsStore'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'
import { DataActions } from './DataActions'
import { ProjectListItem } from './ProjectListItem'

export function Sidebar() {
  const projects = useProjectsStore((state) => state.projects)
  const activeProjectId = useProjectsStore((state) => state.activeProjectId)
  const createProject = useProjectsStore((state) => state.createProject)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav
      aria-label="Proyectos"
      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="hidden text-xs font-semibold tracking-wide text-slate-500 uppercase md:block dark:text-slate-400">
        Proyectos
      </h2>

      <div className="flex items-center gap-2 md:mt-2 md:flex-col md:items-stretch">
        <Button
          variant="ghost"
          size="sm"
          className="justify-between md:hidden"
          aria-expanded={isOpen}
          aria-controls="project-list"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>Proyectos ({projects.length})</span>
          <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
        </Button>
        <Button size="sm" onClick={() => createProject()}>
          + Nuevo proyecto
        </Button>
      </div>

      <div id="project-list" className={cn('mt-3 md:block', isOpen ? 'block' : 'hidden')}>
        {projects.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
            Sin proyectos todavía. Crea el primero para empezar.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {projects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
              />
            ))}
          </ul>
        )}
      </div>

      <DataActions />
    </nav>
  )
}
