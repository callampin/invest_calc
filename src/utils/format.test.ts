import { describe, expect, it } from 'vitest'
import { formatMoney, formatNumber, formatPercent } from './format'

describe('formatNumber', () => {
  it('usa separadores locales y no notación científica', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5')
    expect(formatNumber(1e12)).toBe('1.000.000.000.000')
  })

  it('limita los decimales indicados', () => {
    expect(formatNumber(1.239, 'es-CL', 2)).toBe('1,24')
  })

  it('devuelve un guion para valores no finitos', () => {
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatMoney', () => {
  it('formatea con el símbolo y los decimales de la moneda', () => {
    const usd = formatMoney(1234.5, 'USD')
    const clp = formatMoney(1234, 'CLP')

    expect(usd).toContain('1.234,50')
    expect(usd).toMatch(/US\$|\$/)
    expect(clp).toContain('1.234')
    expect(clp).not.toContain(',00')
  })

  it('muestra montos negativos', () => {
    expect(formatMoney(-500, 'USD')).toContain('-500')
  })

  it('cae a un formato simple si la moneda no es válida', () => {
    expect(formatMoney(100, 'NO-EXISTE')).toContain('100')
  })

  it('devuelve un guion para valores no finitos', () => {
    expect(formatMoney(Number.NaN, 'CLP')).toBe('—')
  })
})

describe('formatPercent', () => {
  it('agrega el signo de porcentaje con un decimal', () => {
    expect(formatPercent(35.8925)).toBe('35,9%')
    expect(formatPercent(0)).toBe('0%')
  })

  it('devuelve un guion cuando no hay valor', () => {
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
  })
})
