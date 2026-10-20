import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NumberInput } from './NumberInput'

interface HarnessProps {
  initial?: number
  integer?: boolean
  min?: number
}

function Harness({ initial = 0, integer = false, min = 0 }: HarnessProps) {
  const [value, setValue] = useState(initial)

  return (
    <div>
      <NumberInput
        label="Monto"
        value={value}
        onChange={setValue}
        integer={integer}
        min={min}
        hint="Ayuda del campo"
      />
      <output data-testid="value">{value}</output>
      <button type="button" onClick={() => setValue(42)}>
        externo
      </button>
    </div>
  )
}

function setup(props: HarnessProps = {}) {
  const user = userEvent.setup()
  render(<Harness {...props} />)
  const input = screen.getByLabelText('Monto')

  return { user, input }
}

describe('NumberInput', () => {
  it('muestra vacío en lugar de un 0 forzado', () => {
    const { input } = setup()

    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', '0')
  })

  it('acepta coma decimal', async () => {
    const { user, input } = setup()

    await user.type(input, '12,5')

    expect(input).toHaveValue('12,5')
    expect(screen.getByTestId('value')).toHaveTextContent('12.5')
  })

  it('acepta punto decimal', async () => {
    const { user, input } = setup()

    await user.type(input, '0.75')

    expect(screen.getByTestId('value')).toHaveTextContent('0.75')
  })

  it('no pierde el foco mientras se escribe', async () => {
    const { user, input } = setup()

    await user.type(input, '1234')

    expect(input).toHaveFocus()
    expect(screen.getByTestId('value')).toHaveTextContent('1234')
  })

  it('ignora los signos negativos y letras', async () => {
    const { user, input } = setup()

    await user.type(input, '-abc5')

    expect(input).toHaveValue('5')
    expect(screen.getByTestId('value')).toHaveTextContent('5')
  })

  it('permite solo un separador decimal', async () => {
    const { user, input } = setup()

    await user.type(input, '1.2.3')

    expect(input).toHaveValue('1.23')
    expect(screen.getByTestId('value')).toHaveTextContent('1.23')
  })

  it('en modo entero descarta los decimales', async () => {
    const { user, input } = setup({ integer: true })

    await user.type(input, '12.5')

    expect(input).toHaveValue('125')
    expect(screen.getByTestId('value')).toHaveTextContent('125')
  })

  it('normaliza el texto al salir del campo', async () => {
    const { user, input } = setup()

    await user.type(input, '12.')
    await user.tab()

    expect(input).toHaveValue('12')
  })

  it('vuelve a vacío al salir con 0', async () => {
    const { user, input } = setup()

    await user.type(input, '0')
    await user.tab()

    expect(input).toHaveValue('')
    expect(screen.getByTestId('value')).toHaveTextContent('0')
  })

  it('respeta el mínimo', async () => {
    const { user, input } = setup({ min: 10 })

    await user.type(input, '5')
    await user.tab()

    expect(screen.getByTestId('value')).toHaveTextContent('10')
    expect(input).toHaveValue('10')
  })

  it('asocia la ayuda con aria-describedby', () => {
    const { input } = setup()

    expect(input).toHaveAccessibleDescription('Ayuda del campo')
  })

  it('se actualiza cuando el valor cambia desde fuera', async () => {
    const { user, input } = setup({ initial: 7 })

    expect(input).toHaveValue('7')
    await user.click(screen.getByRole('button', { name: 'externo' }))

    expect(input).toHaveValue('42')
    expect(screen.getByTestId('value')).toHaveTextContent('42')
  })
})
