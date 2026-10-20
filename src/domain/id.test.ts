import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createId', () => {
  it('genera UUID v4 válidos', () => {
    expect(createId()).toMatch(UUID_V4)
  })

  it('no repite ids en una ráfaga de creaciones', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createId()))

    expect(ids.size).toBe(200)
  })

  it('usa getRandomValues cuando randomUUID no está disponible', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })

    const id = createId()

    expect(id).toMatch(UUID_V4)
    expect(id.startsWith('abababab-abab')).toBe(true)
  })

  it('cae a Math.random cuando no hay Web Crypto', () => {
    vi.stubGlobal('crypto', undefined)

    expect(createId()).toMatch(UUID_V4)
  })
})
