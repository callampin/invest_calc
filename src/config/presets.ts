import { createId } from '../domain/id'
import type { CostBase, CostItem, CostKind, FixedMode } from '../domain/types'

export interface CostPreset {
  presetId: string
  title: string
  kind: CostKind
  defaultValue: number
  base: CostBase
  fixedMode: FixedMode
  /** texto de ayuda mostrado en la UI */
  description?: string
  /** dónde verificar el valor oficial */
  sourceNote?: string
  /** si el costo suele recuperarse (ej. IVA crédito fiscal) */
  recoverable?: boolean
}

export interface CountryProfile {
  /** 'CL', 'AR', 'MX', ... */
  code: string
  name: string
  currency: string
  presets: CostPreset[]
  /** fecha 'YYYY-MM-DD' en que se verificaron los valores */
  lastVerified: string
}

const SII_IVA_URL = 'https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm'
const ADUANAS_ARANCEL_URL =
  'https://www.aduana.cl/arancel-de-las-importaciones/aduana/2019-04-26/115654.html'
const MERCADO_LIBRE_COSTOS_URL =
  'https://www.mercadolibre.cl/ayuda/Costos-de-vender-mis-productos_870'

export const CHILE_PROFILE: CountryProfile = {
  code: 'CL',
  name: 'Chile',
  currency: 'CLP',
  lastVerified: '2026-10-20',
  presets: [
    {
      presetId: 'cl-arancel',
      title: 'Arancel aduanero',
      kind: 'percent',
      defaultValue: 6,
      base: 'cif',
      fixedMode: 'total',
      description:
        'Derecho ad valorem general sobre el valor CIF (producto + envío). Puede ser 0 % si el producto viene de un país con acuerdo comercial o si compras hasta US$500 por una plataforma digital.',
      sourceNote: `Aduanas de Chile — arancel general de 6 % sobre el valor CIF. ${ADUANAS_ARANCEL_URL}`,
    },
    {
      presetId: 'cl-iva',
      title: 'IVA importación',
      kind: 'percent',
      defaultValue: 19,
      base: 'accumulated',
      fixedMode: 'total',
      description:
        '19 % sobre el valor CIF más el arancel. Si eres contribuyente de IVA, este monto suele recuperarse como crédito fiscal; si no, es un costo real.',
      sourceNote: `SII — tasa del IVA de 19 % (art. 14 LIVS). ${SII_IVA_URL}`,
      recoverable: true,
    },
    {
      presetId: 'cl-comision-plataforma',
      title: 'Comisión plataforma',
      kind: 'percent',
      defaultValue: 0,
      base: 'revenue',
      fixedMode: 'total',
      description:
        'Mercado Libre Chile cobra entre 8 % y 21 % según categoría y tipo de publicación, y suma 19 % de IVA sobre su comisión. Escribe aquí tu porcentaje efectivo (comisión × 1,19).',
      // TODO: verificar — Mercado Libre no publica una tasa única; depende de la categoría.
      // Se deja en 0 para no inventar un porcentaje.
      sourceNote: `Mercado Libre Chile — costos por vender (varía por categoría). ${MERCADO_LIBRE_COSTOS_URL}`,
    },
  ],
}

export const GENERIC_PROFILE: CountryProfile = {
  code: 'GENERIC',
  name: 'Genérico',
  currency: 'USD',
  lastVerified: '2026-10-20',
  presets: [
    {
      presetId: 'generic-arancel',
      title: 'Arancel de importación',
      kind: 'percent',
      defaultValue: 0, // TODO: verificar según el país del usuario
      base: 'cif',
      fixedMode: 'total',
      description: 'Porcentaje que cobra la aduana sobre el valor CIF (producto + envío).',
      sourceNote: 'Configura este valor con la aduana de tu país.',
    },
    {
      presetId: 'generic-impuesto',
      title: 'Impuesto al valor agregado',
      kind: 'percent',
      defaultValue: 0, // TODO: verificar según el país del usuario
      base: 'accumulated',
      fixedMode: 'total',
      description: 'Impuesto sobre el valor CIF más el arancel (IVA, IGV, VAT…).',
      sourceNote: 'Configura este valor con la administración tributaria de tu país.',
    },
    {
      presetId: 'generic-comision',
      title: 'Comisión de plataforma',
      kind: 'percent',
      defaultValue: 0, // TODO: verificar según la plataforma
      base: 'revenue',
      fixedMode: 'total',
      description: 'Porcentaje que retiene la plataforma de venta sobre cada venta.',
      sourceNote: 'Configura este valor con el simulador de costos de tu plataforma.',
    },
  ],
}

export const COUNTRY_PROFILES: CountryProfile[] = [CHILE_PROFILE, GENERIC_PROFILE]

export const DEFAULT_COUNTRY_CODE = CHILE_PROFILE.code

export function getCountryProfile(code: string): CountryProfile {
  return COUNTRY_PROFILES.find((profile) => profile.code === code) ?? GENERIC_PROFILE
}

/** Perfil cuyos presets se ofrecen para una moneda (CLP → Chile, resto → genérico). */
export function getProfileForCurrency(currency: string): CountryProfile {
  return COUNTRY_PROFILES.find((profile) => profile.currency === currency) ?? GENERIC_PROFILE
}

export function findPreset(presetId: string): CostPreset | undefined {
  for (const profile of COUNTRY_PROFILES) {
    const preset = profile.presets.find((candidate) => candidate.presetId === presetId)
    if (preset) {
      return preset
    }
  }

  return undefined
}

/** Convierte un preset en un costo editable del proyecto. */
export function presetToCostItem(preset: CostPreset): CostItem {
  return {
    id: createId(),
    title: preset.title,
    kind: preset.kind,
    value: preset.defaultValue,
    base: preset.base,
    fixedMode: preset.fixedMode,
    enabled: true,
    presetId: preset.presetId,
    ...(preset.recoverable ? { recoverable: true } : {}),
  }
}

export function createDefaultCosts(
  profile: CountryProfile = getCountryProfile(DEFAULT_COUNTRY_CODE),
): CostItem[] {
  return profile.presets.map(presetToCostItem)
}
