import { describe, it, expect } from 'vitest'
import { resolveVariant, getVisitorId, withTimeout, CONTROL, VARIANT } from '../src/experiment.js'

const memoryStorage = (seed = {}) => { const m = new Map(Object.entries(seed)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

it('maps flag values to arms, defaulting to control', () => {
  expect(resolveVariant({ value: 'preview_first' })).toBe(VARIANT)
  expect(resolveVariant({ value: 'signup_first' })).toBe(CONTROL)
  expect(resolveVariant({ value: 'garbage' })).toBe(CONTROL)
  expect(resolveVariant(null)).toBe(CONTROL)
})

describe('getVisitorId', () => {
  it('is stable across visits and keeps a pre-seeded agent id', () => {
    const s = memoryStorage()
    const id = getVisitorId(s)
    expect(id).toMatch(UUID)
    expect(getVisitorId(s)).toBe(id)
    expect(getVisitorId(memoryStorage({ classmate_vid: 'us-abc' }))).toBe('us-abc')
  })
  it('still returns an id when storage throws or is missing', () => {
    const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
    expect(getVisitorId(broken)).toMatch(UUID)
    expect(getVisitorId(null)).toMatch(UUID)
  })
})

it('withTimeout resolves to the value, or the fallback on timeout or rejection', async () => {
  await expect(withTimeout(Promise.resolve('flag'), 50, 'fb')).resolves.toBe('flag')
  await expect(withTimeout(new Promise(() => {}), 10, 'fb')).resolves.toBe('fb')
  await expect(withTimeout(Promise.reject(new Error('down')), 50, 'fb')).resolves.toBe('fb')
})
