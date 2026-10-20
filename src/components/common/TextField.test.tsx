import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

function Harness({ initial = 'Inicial' }: { initial?: string }) {
  const [value, setValue] = useState(initial)

  return (
    <div>
      <TextField label="Nombre" value={value} onCommit={setValue} hint="Ayuda" />
      <output data-testid="value">{value}</output>
      <button type="button" onClick={() => setValue('Externo')}>
        externo
      </button>
    </div>
  )
}

function setup(initial?: string) {
  const user = userEvent.setup()
  render(<Harness initial={initial} />)

  return { user, input: screen.getByLabelText('Nombre') }
}

describe('TextField', () => {
  it('permite escribir espacios sin normalizarlos en cada tecla', async () => {
    const { user, input } = setup('')

    await user.type(input, 'Mi producto')

    expect(input).toHaveValue('Mi producto')
    expect(screen.getByTestId('value')).toHaveTextContent('')
  })

  it('confirma al salir del campo', async () => {
    const { user, input } = setup('')

    await user.type(input, 'Nuevo nombre')
    await user.tab()

    expect(screen.getByTestId('value')).toHaveTextContent('Nuevo nombre')
  })

  it('confirma con Enter', async () => {
    const { user, input } = setup('')

    await user.type(input, 'Con Enter{Enter}')

    expect(screen.getByTestId('value')).toHaveTextContent('Con Enter')
  })

  it('revierte con Escape sin confirmar', async () => {
    const { user, input } = setup('Original')

    await user.type(input, ' cambiado{Escape}')

    expect(input).toHaveValue('Original')
    expect(screen.getByTestId('value')).toHaveTextContent('Original')
  })

  it('sincroniza cambios externos cuando no se está editando', async () => {
    const { user, input } = setup('Original')

    await user.click(screen.getByRole('button', { name: 'externo' }))

    expect(input).toHaveValue('Externo')
  })

  it('asocia la ayuda con aria-describedby', () => {
    setup()

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Ayuda')
  })
})
