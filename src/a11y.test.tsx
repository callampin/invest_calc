import { render } from '@testing-library/react'
import axe from 'axe-core'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useProjectsStore } from './store/useProjectsStore'
import { resetProjectsStore } from './test/storeUtils'

/**
 * Auditoría automatizada de accesibilidad. `color-contrast` se desactiva
 * porque requiere un motor de layout real (jsdom no calcula colores);
 * ese punto se revisa a mano y con Lighthouse cuando hay Chrome disponible.
 */
async function findViolations(container: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })

  return results.violations
}

beforeEach(() => {
  resetProjectsStore()
  document.documentElement.lang = 'es'
  document.title = 'Calculadora de Inversión'
})

describe('accesibilidad', () => {
  it('no tiene violaciones con el estado vacío', async () => {
    const { container } = render(<App />)

    expect(await findViolations(container)).toEqual([])
  }, 20_000)

  it('no tiene violaciones con un proyecto cargado', async () => {
    useProjectsStore.getState().createProject({ name: 'Proyecto accesible' })
    const project = useProjectsStore.getState().projects[0]
    if (project) {
      useProjectsStore.getState().updateProduct(project.id, {
        unitCost: 5,
        quantity: 100,
        shippingValue: 80,
        unitSalePrice: 15,
      })
    }

    const { container } = render(<App />)

    expect(await findViolations(container)).toEqual([])
  }, 20_000)
})
