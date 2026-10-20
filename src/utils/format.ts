const DEFAULT_LOCALE = 'es-CL'
const EMPTY = '—'

export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  maximumFractionDigits = 2,
): string {
  if (!Number.isFinite(value)) {
    return EMPTY
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)
}

export function formatMoney(
  value: number,
  currency = 'USD',
  locale: string = DEFAULT_LOCALE,
): string {
  if (!Number.isFinite(value)) {
    return EMPTY
  }

  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return `${formatNumber(value, locale)} ${currency}`
  }
}

export function formatPercent(
  value: number | null,
  locale: string = DEFAULT_LOCALE,
  maximumFractionDigits = 1,
): string {
  if (value === null || !Number.isFinite(value)) {
    return EMPTY
  }

  return `${formatNumber(value, locale, maximumFractionDigits)}%`
}
