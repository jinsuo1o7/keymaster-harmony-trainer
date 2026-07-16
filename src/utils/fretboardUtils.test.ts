import { describe, it, expect } from 'vitest'
import {
  OPEN_MIDI, MAX_FRET, SHAPES, TAP_ORDER, DEGREE_SEMITONES,
  midiAt, pitchClassAt, noteNameAt, chordLabel,
  expectedPosition, anchorFretRange, pickAnchor, shapeMidis, degreePc,
  type Quality,
} from './fretboardUtils'

describe('note mapping', () => {
  it('maps (string, fret) to midi via open strings', () => {
    expect(midiAt(1, 0)).toBe(45)   // open A
    expect(midiAt(1, 3)).toBe(48)   // C on A string
    expect(midiAt(5, 12)).toBe(76)  // high E + octave
  })
  it('reduces to pitch class', () => {
    expect(pitchClassAt(1, 3)).toBe(0) // C
    expect(pitchClassAt(0, 0)).toBe(4) // E
  })
  it('names notes with sharps', () => {
    expect(noteNameAt(1, 3)).toBe('C')
    expect(noteNameAt(0, 1)).toBe('F')
  })
})

describe('shapes are real chord tones', () => {
  const qualities: Quality[] = ['maj7', 'min7']
  it.each(qualities)('%s notes match degree semitones at any anchor', (q) => {
    for (const anchor of [0, 3, 7, 12]) {
      const rootMidi = midiAt(1, anchor) // root sits on A string at anchor
      for (const n of SHAPES[q]) {
        const interval = (midiAt(n.string, anchor + n.fretOffset) - rootMidi + 120) % 12
        expect(interval).toBe(DEGREE_SEMITONES[q][n.degree])
      }
    }
  })
  it('every shape has exactly degrees 1,3,5,7', () => {
    for (const q of qualities) {
      expect(SHAPES[q].map(n => n.degree).sort()).toEqual([1, 3, 5, 7])
    }
  })
})

describe('expectedPosition + shapeMidis follow TAP_ORDER', () => {
  it('gives absolute frets for a maj7 anchor', () => {
    // maj7: 1@A+0, 5@D+2, 7@G+1, 3@B+2
    expect(expectedPosition('maj7', 5, 1)).toEqual({ string: 1, fret: 5 })
    expect(expectedPosition('maj7', 5, 7)).toEqual({ string: 3, fret: 6 })
    expect(expectedPosition('maj7', 5, 3)).toEqual({ string: 4, fret: 7 })
    expect(expectedPosition('maj7', 5, 5)).toEqual({ string: 2, fret: 7 })
  })
  it('shapeMidis is ordered 7,1,3,5 ascending-ish and in range', () => {
    const midis = shapeMidis('maj7', 5)
    expect(midis).toHaveLength(4)
    expect(midis[0]).toBe(midiAt(3, 6)) // the 7th, tapped first
  })
})

describe('anchor selection stays on the board', () => {
  it.each(['guided', 'anchor', 'find'] as const)('%s keeps shape within 0..MAX_FRET', (stage) => {
    const { min, max } = anchorFretRange(stage)
    for (let i = 0; i < 200; i++) {
      const a = pickAnchor(stage)
      expect(a).toBeGreaterThanOrEqual(min)
      expect(a).toBeLessThanOrEqual(max)
      for (const q of ['maj7', 'min7'] as const) {
        for (const n of SHAPES[q]) {
          const f = a + n.fretOffset
          expect(f).toBeGreaterThanOrEqual(0)
          expect(f).toBeLessThanOrEqual(MAX_FRET)
        }
      }
    }
  })
})

describe('labels + degree pitch classes', () => {
  it('labels chords by root pitch class', () => {
    expect(chordLabel('maj7', 0)).toBe('Cmaj7')
    expect(chordLabel('min7', 9)).toBe('Am7')
  })
  it('degreePc computes the note pitch class for a target root', () => {
    expect(degreePc('maj7', 0, 7)).toBe(11) // B is the 7th of C
    expect(degreePc('min7', 9, 3)).toBe(0)  // C is the b3 of Am
  })
})

it('constants sanity', () => {
  expect(OPEN_MIDI).toEqual([40, 45, 50, 55, 59, 64])
  expect(TAP_ORDER).toEqual([7, 1, 3, 5])
})
