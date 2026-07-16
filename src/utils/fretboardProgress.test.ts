import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadEarProgress, recordEarResult } from './earTrainingProgress'

let store: Record<string, string>

const localStorageStub = {
  getItem: (key: string): string | null => (key in store ? store[key] : null),
  setItem: (key: string, value: string): void => {
    store[key] = String(value)
  },
  removeItem: (key: string): void => {
    delete store[key]
  },
  clear: (): void => {
    store = {}
  },
}

beforeEach(() => {
  store = {}
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: localStorageStub }
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = localStorageStub
})

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage
})

describe('fretboard progress', () => {
  it('starts blank with a fretboard stage', () => {
    const p = loadEarProgress()
    expect(p.fretboard).toEqual({ correct: 0, total: 0, bestStreak: 0 })
    expect(p.fretboardMisses).toEqual({})
  })
  it('records a fretboard result and weights misses per quality', () => {
    const p = recordEarResult({
      stage: 'fretboard', correct: false, streak: 0,
      missKey: 'fretboardMisses', missItems: ['maj7'],
    })
    expect(p.fretboard.total).toBe(1)
    expect(p.fretboard.correct).toBe(0)
    expect(p.fretboardMisses.maj7).toBeGreaterThan(0)
  })
})
