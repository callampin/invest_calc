import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { notifyStorageError } from '../../store/storage'
import { useUiStore } from '../../store/useUiStore'
import { Toaster } from './Toaster'

beforeEach(() => {
  useUiStore.setState({ toasts: [] })
})

describe('Toaster', () => {
  it('muestra un aviso y permite cerrarlo', async () => {
    const user = userEvent.setup()
    render(<Toaster />)

    act(() => useUiStore.getState().notify('Proyectos exportados.', 'success'))

    expect(screen.getByRole('status')).toHaveTextContent('Proyectos exportados.')

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('muestra los errores de almacenamiento como alerta', () => {
    render(<Toaster />)

    act(() => notifyStorageError('No se pudieron guardar los datos.'))

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron guardar los datos.')
  })
})
