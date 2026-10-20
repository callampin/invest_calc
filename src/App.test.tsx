import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetProjectsStore } from './test/storeUtils'
import { useProjectsStore } from './store/useProjectsStore'
import App from './App'

beforeEach(() => {
  resetProjectsStore()
})

describe('App', () => {
  it('muestra el título de la aplicación', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /calculadora de inversión/i })).toBeInTheDocument()
  })

  it('muestra el estado vacío sin proyectos', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /todavía no hay proyectos/i })).toBeInTheDocument()
  })

  it('crea el primer proyecto y muestra el formulario', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /crear mi primer proyecto/i }))

    expect(screen.getByRole('heading', { name: /datos del producto/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Proyecto 1')
  })

  it('muestra el formulario del proyecto activo', () => {
    const id = useProjectsStore.getState().createProject({ name: 'Escenario A' })
    render(<App />)

    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Escenario A')
    expect(useProjectsStore.getState().activeProjectId).toBe(id)
  })
})
