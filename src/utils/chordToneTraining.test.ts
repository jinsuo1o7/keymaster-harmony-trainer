import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIFTH_CIRCLE_ROOTS, MAX_FRET, OPEN_MIDI, QUALITY_INTERVALS, allTonePositions, chordMidi, createChordToneSession, degreePitchClass, degreesFor, fifthCircleRootName, hasDistinctPositions, isCorrectPosition, loadChordToneRecords, noteNameAt, pitchClassAt, saveChordToneRecord, type ChordQuality } from './chordToneTraining'

afterEach(() => { vi.unstubAllGlobals() })

describe('chord tone fretboard model', () => {
  it('maps the standard tuning through the twelfth fret', () => {
    expect(OPEN_MIDI).toEqual([40, 45, 50, 55, 59, 64])
    expect(noteNameAt(1, 3)).toBe('C')
    expect(pitchClassAt(0, 12)).toBe(pitchClassAt(0, 0))
  })
  it.each(['maj7', 'min7', 'dom7'] as ChordQuality[])('%s has correct chord-tone pitch classes', quality => {
    for (const degree of [1, 3, 5, 7] as const) expect(degreePitchClass(0, quality, degree)).toBe(QUALITY_INTERVALS[quality][degree])
    expect(chordMidi(0, quality).map(midi => midi % 12)).toEqual([0, QUALITY_INTERVALS[quality][3], 7, QUALITY_INTERVALS[quality][7]])
  })
  it('creates eight questions and assigns each stage its required tones', () => {
    for (const stage of ['roots', 'build', 'guide'] as const) {
      const session = createChordToneSession(stage, ['maj7', 'min7'], () => 0.4)
      expect(session).toHaveLength(8)
      expect(session.every(question => question.degrees.join() === degreesFor(stage).join())).toBe(true)
      if (stage === 'roots') expect(session.every(question => question.quality === 'maj7')).toBe(true)
    }
  })
  it('puts root lessons in descending-fifths order with flat spellings', () => {
    const session = createChordToneSession('roots', ['dom7'])
    expect(session.map(question => question.rootPc)).toEqual(FIFTH_CIRCLE_ROOTS.slice(0, 8).map(root => root.pc))
    expect(session[0].degrees).toHaveLength(6)
    expect(fifthCircleRootName(10)).toBe('B♭')
    expect(fifthCircleRootName(3)).toBe('E♭')
  })
  it('accepts every correct note anywhere on the board and rejects other tones', () => {
    const question = createChordToneSession('build', ['maj7'], () => 0)[0]
    const positions = allTonePositions(question)
    expect(positions.length).toBeGreaterThan(0)
    for (const item of positions) expect(isCorrectPosition(question, item.degree, item.position)).toBe(true)
    expect(isCorrectPosition(question, 3, { string: 1, fret: 3 })).toBe(false)
    expect(positions.every(item => item.position.fret <= MAX_FRET)).toBe(true)
    expect(hasDistinctPositions(positions.slice(0, 3).map(item => item.position))).toBe(true)
  })
})

describe('chord tone history', () => {
  it('fails safely without browser storage', () => {
    expect(loadChordToneRecords()).toEqual([])
    expect(saveChordToneRecord({ stage: 'roots', qualities: ['maj7'], correct: 8, total: 8, date: new Date().toISOString() })).toBe(false)
  })
  it('keeps valid recent records only', () => {
    let data = '[]'
    vi.stubGlobal('localStorage', { getItem: () => data, setItem: (_key: string, value: string) => { data = value } })
    for (let index = 0; index < 22; index++) saveChordToneRecord({ stage: 'guide', qualities: ['dom7'], correct: index % 9, total: 8, date: new Date().toISOString() })
    expect(loadChordToneRecords()).toHaveLength(20)
    data = '[{"stage":"oops"}]'
    expect(loadChordToneRecords()).toEqual([])
  })
})
