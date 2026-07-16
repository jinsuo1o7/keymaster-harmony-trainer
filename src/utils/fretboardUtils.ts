// Pure fretboard model for the chord-tone practice.
// Everything is derived from open-string MIDI + relative shape offsets so a
// single shape per quality transposes to every key by shifting the anchor fret.

export const OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const // 6th(lowE)..1st(highE)
export const MAX_FRET = 15

export type Quality = 'maj7' | 'min7'
export type Degree = 1 | 3 | 5 | 7
export type Stage = 'guided' | 'anchor' | 'find'

export interface ShapeNote {
  string: number      // 0..5, index into OPEN_MIDI
  fretOffset: number  // relative to the root sitting on the A string (index 1)
  degree: Degree
}

// Compact A-shaped grips. Offsets are relative to the root on the A string
// (root = fretOffset 0). min7 = maj7 with the 3rd and 7th lowered one fret.
export const SHAPES: Record<Quality, ShapeNote[]> = {
  maj7: [
    { string: 1, fretOffset: 0, degree: 1 },
    { string: 3, fretOffset: 1, degree: 7 },
    { string: 4, fretOffset: 2, degree: 3 },
    { string: 2, fretOffset: 2, degree: 5 },
  ],
  min7: [
    { string: 1, fretOffset: 0, degree: 1 },
    { string: 3, fretOffset: 0, degree: 7 },
    { string: 4, fretOffset: 1, degree: 3 },
    { string: 2, fretOffset: 2, degree: 5 },
  ],
}

export const TAP_ORDER: Degree[] = [7, 1, 3, 5]

export const DEGREE_SEMITONES: Record<Quality, Record<Degree, number>> = {
  maj7: { 1: 0, 3: 4, 5: 7, 7: 11 },
  min7: { 1: 0, 3: 3, 5: 7, 7: 10 },
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiAt(string: number, fret: number): number {
  return OPEN_MIDI[string] + fret
}

export function pitchClassAt(string: number, fret: number): number {
  return midiAt(string, fret) % 12
}

export function noteNameAt(string: number, fret: number): string {
  return NOTE_NAMES[pitchClassAt(string, fret)]
}

export function chordLabel(quality: Quality, rootPc: number): string {
  const root = NOTE_NAMES[rootPc]
  return quality === 'maj7' ? `${root}maj7` : `${root}m7`
}

export function shapeNoteFor(quality: Quality, degree: Degree): ShapeNote {
  const n = SHAPES[quality].find(s => s.degree === degree)
  if (!n) throw new Error(`no ${degree} in ${quality}`)
  return n
}

export function expectedPosition(quality: Quality, anchorFret: number, degree: Degree) {
  const n = shapeNoteFor(quality, degree)
  return { string: n.string, fret: anchorFret + n.fretOffset }
}

export function anchorFretRange(stage: Stage): { min: number; max: number } {
  // Shape spans fretOffset 0..2, so the highest usable anchor is MAX_FRET - 2.
  const hi = MAX_FRET - 2
  return stage === 'guided' ? { min: 2, max: 9 } : { min: 0, max: hi }
}

export function pickAnchor(stage: Stage, rng: () => number = Math.random): number {
  const { min, max } = anchorFretRange(stage)
  return min + Math.floor(rng() * (max - min + 1))
}

export function rootPcAt(quality: Quality, anchorFret: number): number {
  return pitchClassAt(1, anchorFret) // root is on the A string at the anchor
}

export function degreePc(quality: Quality, rootPc: number, degree: Degree): number {
  return (rootPc + DEGREE_SEMITONES[quality][degree]) % 12
}

export function shapeMidis(quality: Quality, anchorFret: number): number[] {
  return TAP_ORDER.map(d => {
    const p = expectedPosition(quality, anchorFret, d)
    return midiAt(p.string, p.fret)
  })
}
