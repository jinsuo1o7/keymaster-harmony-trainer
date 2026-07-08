import { describe, it, expect } from 'vitest'
import {
  ALL_CHORD_QUALITY_IDS,
  ALL_DEGREES,
  isCustomChordValid,
  isCustomProgressionValid,
  buildCustomProgression,
  loadCustomChord,
  loadCustomProgression,
  progressionSignature,
} from './earTrainingUtils'

describe('constants', () => {
  it('lists all 8 chord qualities', () => {
    expect(ALL_CHORD_QUALITY_IDS).toEqual([
      'maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'm7b5',
    ])
  })
  it('lists degrees 1..7', () => {
    expect(ALL_DEGREES).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('validation gates', () => {
  it('chord custom needs >= 2 qualities', () => {
    expect(isCustomChordValid(['maj'])).toBe(false)
    expect(isCustomChordValid(['maj', 'min'])).toBe(true)
  })
  it('progression custom needs >= 2 degrees and a valid length', () => {
    expect(isCustomProgressionValid([1], 2)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 0)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 5)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 1)).toBe(true)
    expect(isCustomProgressionValid([1, 4, 5], 4)).toBe(true)
  })
})

describe('buildCustomProgression', () => {
  it('honors the requested length and draws only from the pool', () => {
    const p = buildCustomProgression([1, 4, 5], 3, null)
    expect(p).toHaveLength(3)
    expect(p.every(d => [1, 4, 5].includes(d))).toBe(true)
  })
  it('clamps length into 1..4', () => {
    expect(buildCustomProgression([1, 4, 5], 0, null)).toHaveLength(1)
    expect(buildCustomProgression([1, 4, 5], 9, null)).toHaveLength(4)
  })
  it('length 1 yields a single chord (선생님 2번)', () => {
    const p = buildCustomProgression([2, 6], 1, null)
    expect(p).toHaveLength(1)
    expect([2, 6]).toContain(p[0])
  })
  it('with a single-degree pool it repeats that degree deterministically', () => {
    expect(buildCustomProgression([3], 4, null)).toEqual([3, 3, 3, 3])
  })
  it('avoids repeating the exact previous sequence when variety exists', () => {
    const last = progressionSignature([1])
    for (let i = 0; i < 50; i++) {
      expect(progressionSignature(buildCustomProgression([1, 4], 1, last))).not.toBe(last)
    }
  })
})

describe('localStorage config (node/SSR falls back to defaults)', () => {
  it('loadCustomChord returns a valid default', () => {
    const cfg = loadCustomChord()
    expect(cfg.qualities.length).toBeGreaterThanOrEqual(2)
  })
  it('loadCustomProgression returns a valid default', () => {
    const cfg = loadCustomProgression()
    expect(cfg.degrees.length).toBeGreaterThanOrEqual(2)
    expect(cfg.length).toBeGreaterThanOrEqual(1)
    expect(cfg.length).toBeLessThanOrEqual(4)
  })
})
