import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Project } from '../../domain/types'
import { useProjectsStore } from '../../store/useProjectsStore'
import type { ImportMode } from '../../store/useProjectsStore'
import { useUiStore } from '../../store/useUiStore'
import {
  buildExportPayload,
  downloadProjectsFile,
  parseProjectsFile,
} from '../../utils/exportImport'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'

interface PendingImport {
  projects: Project[]
}

export function DataActions() {
  const projects = useProjectsStore((state) => state.projects)
  const activeProjectId = useProjectsStore((state) => state.activeProjectId)
  const importProjects = useProjectsStore((state) => state.importProjects)
  const clearAllData = useProjectsStore((state) => state.clearAllData)
  const notify = useUiStore((state) => state.notify)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [isClearOpen, setIsClearOpen] = useState(false)

  const handleExport = (): void => {
    if (projects.length === 0) {
      notify('No hay proyectos para exportar.', 'info')
      return
    }

    try {
      downloadProjectsFile(buildExportPayload(projects, activeProjectId))
      notify('Copia exportada. Guárdala en un lugar seguro.', 'success')
    } catch {
      notify('No se pudo generar el archivo de exportación.', 'error')
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    let raw: string

    try {
      raw = await file.text()
    } catch {
      notify('No se pudo leer el archivo.', 'error')
      return
    }

    const parsed = parseProjectsFile(raw)

    if (!parsed.ok) {
      notify(parsed.error, 'error')
      return
    }

    setPendingImport({ projects: parsed.projects })
  }

  const handleImport = (mode: ImportMode): void => {
    if (!pendingImport) {
      return
    }

    const count = importProjects(pendingImport.projects, mode)
    setPendingImport(null)
    notify(count === 1 ? 'Se importó 1 proyecto.' : `Se importaron ${count} proyectos.`, 'success')
  }

  const handleClear = (): void => {
    clearAllData()
    setIsClearOpen(false)
    notify('Se borraron todos los datos de este navegador.', 'success')
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
      <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        Datos
      </h2>

      <div className="mt-2 flex flex-col gap-1.5">
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Exportar JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Importar JSON
        </Button>
        <Button variant="danger" size="sm" onClick={() => setIsClearOpen(true)}>
          Borrar todos los datos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Archivo JSON para importar"
          className="sr-only"
          onChange={(event) => {
            void handleFileChange(event)
          }}
        />
      </div>

      <Modal
        isOpen={pendingImport !== null}
        title="Importar proyectos"
        onClose={() => setPendingImport(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPendingImport(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => handleImport('merge')}>
              Fusionar
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleImport('replace')}>
              Reemplazar
            </Button>
          </>
        }
      >
        <p>
          El archivo contiene {pendingImport?.projects.length ?? 0}{' '}
          {pendingImport?.projects.length === 1 ? 'proyecto' : 'proyectos'}. Puedes fusionarlos con
          los {projects.length} que ya tienes o reemplazar todo.
        </p>
      </Modal>

      <Modal
        isOpen={isClearOpen}
        title="Borrar todos los datos"
        onClose={() => setIsClearOpen(false)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsClearOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={handleClear}>
              Borrar todo
            </Button>
          </>
        }
      >
        <p>
          Se eliminarán los {projects.length} proyectos guardados en este navegador. Esta acción no
          se puede deshacer.
        </p>
      </Modal>
    </div>
  )
}
