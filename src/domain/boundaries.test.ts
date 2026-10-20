import { describe, expect, it } from 'vitest'

const domainSources = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const entries = Object.entries(domainSources).filter(
  ([path]) => !path.endsWith('.test.ts') && !path.endsWith('.d.ts'),
)

describe('límites de la capa domain', () => {
  it('encuentra los archivos de dominio', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(entries)('%s no importa React, el store ni APIs del DOM', (_path, content) => {
    expect(content).not.toMatch(/from ['"]react/)
    expect(content).not.toMatch(/from ['"]react-dom/)
    expect(content).not.toMatch(/from ['"]zustand/)
    expect(content).not.toMatch(/from ['"]\.\.\/store/)
    expect(content).not.toMatch(/\bdocument\.|\bwindow\.|\blocalStorage\b/)
  })
})
