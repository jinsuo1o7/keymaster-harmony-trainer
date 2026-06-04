export const SUPPORTED_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'G', 'D', 'A', 'E'] as const

export const MAJOR_SCALES: Record<string, string[]> = {
  C:  ['C',  'D',  'E',  'F',  'G',  'A',  'B' ],
  F:  ['F',  'G',  'A',  'Bb', 'C',  'D',  'E' ],
  Bb: ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A' ],
  Eb: ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D' ],
  Ab: ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G' ],
  G:  ['G',  'A',  'B',  'C',  'D',  'E',  'F#'],
  D:  ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'],
  A:  ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'],
  E:  ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'],
}

// Index 0 = 1st degree, index 6 = 7th degree
export const DIATONIC_7TH_QUALITIES = [
  'maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5',
] as const

export const COMMON_PROGRESSIONS: number[][] = [
  [2, 5, 1, 6],
  [3, 6, 2, 5],
  [1, 4, 5, 3],
]

// Index 0 unused; index 1–7 = degrees 1–7
export const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
export const ROMAN_NUMERALS_LOWER = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']

export const KEY_GROUPS: Record<string, string[]> = {
  all:   ['C', 'F', 'Bb', 'Eb', 'Ab', 'G', 'D', 'A', 'E'],
  flat:  ['Bb', 'Eb', 'Ab'],
  sharp: ['G', 'D', 'A', 'E'],
}

export const KEY_SIGNATURES: Record<string, string[]> = {
  C:  [],
  F:  ['Bb'],
  Bb: ['Bb', 'Eb'],
  Eb: ['Bb', 'Eb', 'Ab'],
  Ab: ['Bb', 'Eb', 'Ab', 'Db'],
  G:  ['F#'],
  D:  ['F#', 'C#'],
  A:  ['F#', 'C#', 'G#'],
  E:  ['F#', 'C#', 'G#', 'D#'],
}

export const FLAT_ORDER  = ['Bb', 'Eb', 'Ab', 'Db']
export const SHARP_ORDER = ['F#', 'C#', 'G#', 'D#']
