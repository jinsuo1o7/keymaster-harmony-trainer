import { describe, expect, it } from 'vitest'
import { SCALE_MAX_FRET, SCALES, isScaleTone, noteAt, scaleMidi, scaleNoteNames, scalePitchClasses } from './scaleLearning'

describe('scale formulas', () => {
  it('contains six distinct formulas beginning on the root', () => {
    expect(SCALES).toHaveLength(6)
    for (const scale of SCALES) {
      expect(scale.semitones[0]).toBe(0)
      expect(new Set(scale.semitones).size).toBe(scale.semitones.length)
      expect(scale.semitones.every((semitone, index) => index === 0 || semitone > scale.semitones[index - 1])).toBe(true)
    }
  })
  it('spells C scales with the expected pitch classes', () => {
    expect(scaleNoteNames(0, SCALES[0])).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(scaleNoteNames(0, SCALES[1])).toEqual(['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'])
    expect(scaleNoteNames(0, SCALES[5])).toEqual(['C', 'D#', 'F', 'G', 'A#'])
  })
  it('maps every root to the board and plays an octave above the root', () => {
    for (const scale of SCALES) for (let root = 0; root < 12; root++) {
      const pcs = scalePitchClasses(root, scale)
      expect(pcs).toContain(root)
      expect(scaleMidi(root, scale).at(-1)).toBe(60 + root)
      expect(Array.from({ length: SCALE_MAX_FRET + 1 }, (_, fret) => isScaleTone(root, scale, 1, fret)).some(Boolean)).toBe(true)
    }
    expect(noteAt(1, 3)).toBe('C')
  })
})
