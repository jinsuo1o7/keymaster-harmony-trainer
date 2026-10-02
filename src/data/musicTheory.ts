export const SUPPORTED_KEYS = ['C', 'F', 'Bb', 'Eb', 'G', 'D', 'A'] as const

export const MAJOR_SCALES: Record<string, string[]> = {
  C:  ['C',  'D',  'E',  'F',  'G',  'A',  'B' ],
  F:  ['F',  'G',  'A',  'Bb', 'C',  'D',  'E' ],
  Bb: ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A' ],
  Eb: ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D' ],
  G:  ['G',  'A',  'B',  'C',  'D',  'E',  'F#'],
  D:  ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'],
  A:  ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'],
  E:  ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'],
  B:  ['B',  'C#', 'D#', 'E',  'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B',  'C#', 'D#', 'E#'],
  Ab: ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G' ],
  Db: ['Db', 'Eb', 'F',  'Gb', 'Ab', 'Bb', 'C' ],
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

// 학습 우선순위 순서. 조표가 적을수록(=쉽고 자주 쓰임) 앞에 오도록
// 5도권을 샤프/플랫 번갈아 정렬했다: C → ♯/♭1 → ♯/♭2 → ...
export const KEY_PRIORITY = [
  'C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab', 'B', 'Db', 'F#',
] as const

export const KEY_GROUPS: Record<string, string[]> = {
  all:   [...KEY_PRIORITY],                       // 전체 12키 (우선순위 순)
  flat:  ['F', 'Bb', 'Eb', 'Ab', 'Db'],           // 플랫 키 전체
  sharp: ['G', 'D', 'A', 'E', 'B', 'F#'],          // 샤프 키 전체
}

// 집중 훈련에서 한 번에 고를 수 있는 추천 키 세트
export const KEY_PRESETS: { id: string; label: string; keys: string[] }[] = [
  { id: 'jazz',  label: '재즈 핵심 7키',      keys: ['C', 'F', 'Bb', 'Eb', 'Ab', 'G', 'D'] },
  { id: 'basic', label: '기초 (조표 ≤1)',    keys: ['C', 'G', 'F'] },
  { id: 'core',  label: '핵심 7키 (조표 ≤3)', keys: ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'] },
  { id: 'all',   label: '전체 12키',          keys: [...KEY_PRIORITY] },
]

export const KEY_SIGNATURES: Record<string, string[]> = {
  C:  [],
  F:  ['Bb'],
  Bb: ['Bb', 'Eb'],
  Eb: ['Bb', 'Eb', 'Ab'],
  G:  ['F#'],
  D:  ['F#', 'C#'],
  A:  ['F#', 'C#', 'G#'],
  E:  ['F#', 'C#', 'G#', 'D#'],
  B:  ['F#', 'C#', 'G#', 'D#', 'A#'],
  'F#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  Ab: ['Bb', 'Eb', 'Ab', 'Db'],
  Db: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
}

export const FLAT_ORDER  = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb']
export const SHARP_ORDER = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#']
