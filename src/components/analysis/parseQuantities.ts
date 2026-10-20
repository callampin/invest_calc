export const MAX_SCENARIOS = 6

/** Convierte "50, 100; 500" en [50, 100, 500], sin duplicados ni valores inválidos. */
export function parseQuantities(raw: string): number[] {
  const values = raw
    .split(/[,\s;]+/)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value) && value > 0)

  return [...new Set(values)].slice(0, MAX_SCENARIOS)
}
