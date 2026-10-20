import { describe, expect, it } from 'vitest'
import {
  CHILE_PROFILE,
  COUNTRY_PROFILES,
  createDefaultCosts,
  DEFAULT_COUNTRY_CODE,
  findPreset,
  GENERIC_PROFILE,
  getCountryProfile,
  presetToCostItem,
} from './presets'

describe('perfil de Chile', () => {
  it('usa CLP y una fecha de verificación ISO', () => {
    expect(CHILE_PROFILE.currency).toBe('CLP')
    expect(CHILE_PROFILE.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('verifica el IVA en 19 % sobre CIF + arancel (base accumulated)', () => {
    const iva = CHILE_PROFILE.presets.find((preset) => preset.presetId === 'cl-iva')

    expect(iva).toMatchObject({ kind: 'percent', defaultValue: 19, base: 'accumulated' })
    expect(iva?.sourceNote).toContain('sii.cl')
  })

  it('verifica el arancel general en 6 % sobre el valor CIF', () => {
    const arancel = CHILE_PROFILE.presets.find((preset) => preset.presetId === 'cl-arancel')

    expect(arancel).toMatchObject({ kind: 'percent', defaultValue: 6, base: 'cif' })
    expect(arancel?.sourceNote).toContain('aduana.cl')
  })

  it('deja la comisión de plataforma en 0 porque varía por categoría', () => {
    const comision = CHILE_PROFILE.presets.find(
      (preset) => preset.presetId === 'cl-comision-plataforma',
    )

    expect(comision).toMatchObject({ kind: 'percent', defaultValue: 0, base: 'revenue' })
    expect(comision?.description).toMatch(/8 % y 21 %/)
  })

  it('ordena el arancel antes del IVA para que la base accumulated funcione', () => {
    const ids = CHILE_PROFILE.presets.map((preset) => preset.presetId)

    expect(ids.indexOf('cl-arancel')).toBeLessThan(ids.indexOf('cl-iva'))
  })
})

describe('perfil genérico', () => {
  it('tiene todos los valores en 0', () => {
    expect(GENERIC_PROFILE.presets.every((preset) => preset.defaultValue === 0)).toBe(true)
  })

  it('incluye impuesto, arancel y comisión', () => {
    expect(GENERIC_PROFILE.presets.map((preset) => preset.base)).toEqual([
      'cif',
      'accumulated',
      'revenue',
    ])
  })
})

describe('helpers de perfiles', () => {
  it('encuentra perfiles por código y cae a GENERIC', () => {
    expect(getCountryProfile('CL')).toBe(CHILE_PROFILE)
    expect(getCountryProfile('XX')).toBe(GENERIC_PROFILE)
    expect(COUNTRY_PROFILES).toContain(CHILE_PROFILE)
    expect(DEFAULT_COUNTRY_CODE).toBe('CL')
  })

  it('encuentra presets por id', () => {
    expect(findPreset('cl-iva')?.defaultValue).toBe(19)
    expect(findPreset('generic-comision')?.base).toBe('revenue')
    expect(findPreset('no-existe')).toBeUndefined()
  })

  it('convierte un preset en un costo editable', () => {
    const preset = CHILE_PROFILE.presets[0]
    const cost = presetToCostItem(preset)

    expect(cost).toMatchObject({
      title: preset.title,
      kind: preset.kind,
      value: preset.defaultValue,
      base: preset.base,
      fixedMode: preset.fixedMode,
      enabled: true,
      presetId: preset.presetId,
    })
    expect(cost.id).toBeTruthy()
  })

  it('hereda la marca de recuperable del IVA', () => {
    const iva = findPreset('cl-iva')
    if (!iva) {
      throw new Error('Falta el preset de IVA')
    }

    expect(presetToCostItem(iva).recoverable).toBe(true)
    expect(presetToCostItem(CHILE_PROFILE.presets[0]).recoverable).toBeUndefined()
  })

  it('marca como recoverable el IVA de Chile', () => {
    expect(findPreset('cl-iva')?.recoverable).toBe(true)
    expect(findPreset('cl-arancel')?.recoverable).toBeUndefined()
  })

  it('genera un id distinto por cada costo por defecto', () => {
    const costs = createDefaultCosts(CHILE_PROFILE)
    const ids = new Set(costs.map((cost) => cost.id))

    expect(costs).toHaveLength(CHILE_PROFILE.presets.length)
    expect(ids.size).toBe(costs.length)
  })
})
