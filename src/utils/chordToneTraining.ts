export const OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const
export const MAX_FRET = 12
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const FIFTH_CIRCLE_ROOTS = [
  { pc: 0, label: 'C' }, { pc: 5, label: 'F' }, { pc: 10, label: 'B♭' }, { pc: 3, label: 'E♭' },
  { pc: 8, label: 'A♭' }, { pc: 1, label: 'D♭' }, { pc: 6, label: 'G♭' }, { pc: 11, label: 'B' },
  { pc: 4, label: 'E' }, { pc: 9, label: 'A' }, { pc: 2, label: 'D' }, { pc: 7, label: 'G' },
] as const

export type ChordQuality = 'maj7' | 'min7' | 'dom7'
export type ChordToneStage = 'roots' | 'build' | 'guide'
export type Degree = 1 | 3 | 5 | 7
export interface ChordToneQuestion { rootPc: number; quality: ChordQuality; stage: ChordToneStage; degrees: Degree[] }
export interface Position { string: number; fret: number }
export interface ChordToneResult { question: ChordToneQuestion; clean: boolean }
export interface ChordToneRecord { stage: ChordToneStage; qualities: ChordQuality[]; correct: number; total: number; date: string }

export const QUALITY_LABEL: Record<ChordQuality, string> = { maj7: 'Maj7', min7: 'm7', dom7: '7' }
export const QUALITY_INTERVALS: Record<ChordQuality, Record<Degree, number>> = {
  maj7: { 1: 0, 3: 4, 5: 7, 7: 11 },
  min7: { 1: 0, 3: 3, 5: 7, 7: 10 },
  dom7: { 1: 0, 3: 4, 5: 7, 7: 10 },
}

export function pitchClassAt(string: number, fret: number): number { return (OPEN_MIDI[string] + fret) % 12 }
export function noteNameAt(string: number, fret: number): string { return NOTE_NAMES[pitchClassAt(string, fret)] }
export function chordName(rootPc: number, quality: ChordQuality): string { return `${NOTE_NAMES[rootPc]}${QUALITY_LABEL[quality]}` }
export function fifthCircleRootName(rootPc: number): string { return FIFTH_CIRCLE_ROOTS.find(root => root.pc === rootPc)?.label ?? NOTE_NAMES[rootPc] }
export function degreePitchClass(rootPc: number, quality: ChordQuality, degree: Degree): number {
  return (rootPc + QUALITY_INTERVALS[quality][degree]) % 12
}
export function degreesFor(stage: ChordToneStage): Degree[] {
  return stage === 'roots' ? [1, 1, 1, 1, 1, 1] : stage === 'guide' ? [3, 7] : [1, 3, 5, 7]
}
export function createChordToneSession(stage: ChordToneStage, qualities: ChordQuality[], random = Math.random): ChordToneQuestion[] {
  const pool = qualities.length ? qualities : ['maj7'] as ChordQuality[]
  return Array.from({ length: 8 }, (_, index) => ({
    stage,
    rootPc: stage === 'roots' ? FIFTH_CIRCLE_ROOTS[index % FIFTH_CIRCLE_ROOTS.length].pc : Math.floor(random() * 12),
    quality: stage === 'roots' ? 'maj7' : pool[index % pool.length],
    degrees: degreesFor(stage),
  }))
}
export function isCorrectPosition(question: ChordToneQuestion, degree: Degree, position: Position): boolean {
  return pitchClassAt(position.string, position.fret) === degreePitchClass(question.rootPc, question.quality, degree)
}
export function chordMidi(rootPc: number, quality: ChordQuality): number[] {
  return ([1, 3, 5, 7] as Degree[]).map(degree => 48 + rootPc + QUALITY_INTERVALS[quality][degree])
}
export function allTonePositions(question: ChordToneQuestion): { position: Position; degree: Degree }[] {
  return ([1, 3, 5, 7] as Degree[]).flatMap(degree => {
    const pc = degreePitchClass(question.rootPc, question.quality, degree)
    return OPEN_MIDI.flatMap((_, string) => Array.from({ length: MAX_FRET + 1 }, (_, fret) => ({ position: { string, fret }, degree }))
      .filter(item => pitchClassAt(string, item.position.fret) === pc))
  })
}
export function hasDistinctPositions(positions: Position[]): boolean {
  return new Set(positions.map(position => `${position.string}:${position.fret}`)).size === positions.length
}

const STORAGE_KEY = 'keymaster_chord_tone_v2'
export function loadChordToneRecords(): ChordToneRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is ChordToneRecord => {
      if (item === null || typeof item !== 'object') return false
      const candidate = item as Partial<ChordToneRecord>
      return ['roots', 'build', 'guide'].includes(candidate.stage ?? '') && Array.isArray(candidate.qualities)
        && candidate.qualities.every((quality: unknown) => ['maj7', 'min7', 'dom7'].includes(String(quality)))
        && Number.isInteger(candidate.correct) && candidate.correct! >= 0 && candidate.correct! <= 8 && candidate.total === 8
        && typeof candidate.date === 'string' && Number.isFinite(Date.parse(candidate.date))
    }).slice(0, 20)
  } catch { return [] }
}
export function saveChordToneRecord(record: ChordToneRecord): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...loadChordToneRecords()].slice(0, 20)))
    return true
  } catch { return false }
}
