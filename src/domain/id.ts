const HEX_BASE = 16

function fillRandomBytes(bytes: Uint8Array): Uint8Array {
  const cryptoApi = globalThis.crypto

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
    return bytes
  }

  // Último recurso (navegadores sin Web Crypto): suficiente para ids de UI.
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }

  return bytes
}

/**
 * Genera un id único. Usa `crypto.randomUUID` cuando está disponible y, si no,
 * cae a un UUID v4 construido con `crypto.getRandomValues`.
 */
export function createId(): string {
  const cryptoApi = globalThis.crypto

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  const bytes = fillRandomBytes(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15] = bytes
  const hex = (byte: number): string => byte.toString(HEX_BASE).padStart(2, '0')

  return (
    `${hex(b0)}${hex(b1)}${hex(b2)}${hex(b3)}-` +
    `${hex(b4)}${hex(b5)}-` +
    `${hex(b6)}${hex(b7)}-` +
    `${hex(b8)}${hex(b9)}-` +
    `${hex(b10)}${hex(b11)}${hex(b12)}${hex(b13)}${hex(b14)}${hex(b15)}`
  )
}
