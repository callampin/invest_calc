import { useRef, useState } from 'react'
import type { Project } from '../../domain/types'
import { useProjectsStore } from '../../store/useProjectsStore'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'

export interface ProjectListItemProps {
  project: Project
  isActive: boolean
}

export function ProjectListItem({ project, isActive }: ProjectListItemProps) {
  const setActiveProject = useProjectsStore((state) => state.setActiveProject)
  const duplicateProject = useProjectsStore((state) => state.duplicateProject)
  const deleteProject = useProjectsStore((state) => state.deleteProject)
  const renameProject = useProjectsStore((state) => state.renameProject)

  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState(project.name)
  const cancelled = useRef(false)

  const startRenaming = (): void => {
    setDraftName(project.name)
    setIsRenaming(true)
  }

  const commitRename = (): void => {
    const name = draftName.trim()
    setIsRenaming(false)

    if (name && name !== project.name) {
      renameProject(project.id, name)
    }
  }

  const handleDelete = (): void => {
    const confirmed = window.confirm(
      `¿Eliminar "${project.name}"? Esta acción no se puede deshacer.`,
    )

    if (confirmed) {
      deleteProject(project.id)
    }
  }

  return (
    <li
      className={cn(
        'flex items-center gap-1 rounded-lg border',
        isActive
          ? 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/50'
          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
      )}
    >
      {isRenaming ? (
        <form
          className="flex flex-1 items-center gap-1 p-1"
          onSubmit={(event) => {
            event.preventDefault()
            commitRename()
          }}
        >
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- el usuario acaba de pedir renombrar
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={() => {
              if (cancelled.current) {
                cancelled.current = false
                return
              }

              commitRename()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                cancelled.current = true
                setDraftName(project.name)
                setIsRenaming(false)
              }
            }}
            aria-label="Nuevo nombre del proyecto"
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button type="submit" size="sm" className="shrink-0">
            OK
          </Button>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActiveProject(project.id)}
            aria-current={isActive ? 'page' : undefined}
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left"
          >
            <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {project.name}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {project.currency}
            </span>
          </button>
          <div className="flex items-center gap-0.5 pr-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-1.5 py-1"
              onClick={startRenaming}
              aria-label={`Renombrar ${project.name}`}
              title="Renombrar"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-1.5 py-1"
              onClick={() => duplicateProject(project.id)}
              aria-label={`Duplicar ${project.name}`}
              title="Duplicar"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-1.5 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
              onClick={handleDelete}
              aria-label={`Eliminar ${project.name}`}
              title="Eliminar"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
