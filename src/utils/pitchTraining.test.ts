import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPitchSession, pitchChoices, pitchNotes, missedQuestions, loadPitchRecords, savePitchRecord, type PitchLevel, type PitchMode } from './pitchTraining'

afterEach(() => { vi.unstubAllGlobals() })

describe('pitch curriculum', () => {
  for (const mode of ['direction', 'interval', 'degree'] as PitchMode[]) {
    for (const level of [0, 1, 2] as PitchLevel[]) {
      it(`${mode}/${level} covers every answer and stays within the pitch range`, () => {
        const session = createPitchSession(mode, level)
        expect(session).toHaveLength(10)
        expect(new Set(session.map(q => q.answer))).toEqual(new Set(pitchChoices(mode, level).map(c => c.id)))
        for (const question of session) {
          const notes = pitchNotes(question)
          expect(notes.at(-1)).toBe(question.root + question.offset)
          expect(notes.every(midi => midi >= 43 && midi <= 78)).toBe(true)
          if (mode === 'direction') {
            expect(Math.sign(question.offset) || 0).toBe(question.answer)
            expect([[0, 5, 7, 12], [0, 2, 3, 4], [0, 1, 2]][level]).toContain(Math.abs(question.offset))
          }
          if (mode === 'degree') expect(notes.slice(0, 4)).toEqual([question.root, question.root + 4, question.root + 7, question.root])
        }
      })
    }
  }

  it('compares a wrong answer against the same reference', () => {
    const question = createPitchSession('interval', 0)[0]
    expect(pitchNotes(question, 7)).toEqual([question.root, question.root + 7])
    const same = { ...createPitchSession('direction', 0)[0], answer: 0, offset: 0 }
    expect(pitchNotes(same, -1)).toEqual([same.root, same.root - 2])
  })

  it('reviews mistakes and reveals, excluding correct answers', () => {
    const [a, b, c] = createPitchSession('degree', 0)
    expect(missedQuestions([{ question: a, selected: a.answer }, { question: b, selected: -1 }, { question: c, selected: null }])).toEqual([b, c])
  })
})

describe('pitch history', () => {
  it('handles unavailable storage', () => {
    expect(loadPitchRecords()).toEqual([])
    expect(savePitchRecord({ mode: 'direction', level: 0, correct: 5, total: 10, date: new Date().toISOString() })).toBe(false)
  })
  it('validates old data and caps history at 20 completed sessions', () => {
    let data = '[null, {"mode":"unknown"}]'
    vi.stubGlobal('localStorage', { getItem: () => data, setItem: (_key: string, value: string) => { data = value } })
    expect(loadPitchRecords()).toEqual([])
    for (let i = 0; i < 25; i++) savePitchRecord({ mode: 'degree', level: 2, correct: i % 11, total: 10, date: new Date().toISOString() })
    expect(loadPitchRecords()).toHaveLength(20)
    expect(loadPitchRecords()[0].correct).toBe(2)
    data = '{broken'
    expect(loadPitchRecords()).toEqual([])
  })
})
