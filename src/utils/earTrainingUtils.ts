// Ear training is functional (solfège / scale-degree) based: the ear is grounded
// in a tonic, then each note is heard by its relationship to that tonic. This is
// the approach standard method sites recommend over raw interval drilling.

export type Solfege = 'do' | 're' | 'mi' | 'fa' | 'sol' | 'la' | 'si'

export interface SolfegeInfo {
  label: string   // 도, 레, 미 …
  offset: number  // semitones from the tonic 도 (so the key can be transposed)
  fn: string      // one-line function, shown as feedback
}

// Degrees are stored as semitone offsets from the tonic, not fixed pitches, so
// every question can be transposed to a random key. 시 sits just below the tonic
// (−1) to keep its "leading tone that pulls up to 도" character; the rest sit
// above, so 레 and 시 stay the immediate neighbours of 도.
export const SOLFEGE: Record<Solfege, SolfegeInfo> = {
  do:  { label: '도', offset: 0,  fn: '으뜸음 — 가장 안정적인 중심음.' },
  re:  { label: '레', offset: 2,  fn: '도 바로 위 — 도로 사뿐히 내려가려 해요.' },
  mi:  { label: '미', offset: 4,  fn: '으뜸화음 음 — 밝고 안정적.' },
  fa:  { label: '파', offset: 5,  fn: '미로 내려가려는 긴장음.' },
  sol: { label: '솔', offset: 7,  fn: '딸림음 — 안정적이고 든든해요.' },
  la:  { label: '라', offset: 9,  fn: '솔로 내려가려는 음.' },
  si:  { label: '시', offset: -1, fn: '이끔음 — 도로 강하게 올라가려 해요.' },
}

export const SOLFEGE_ORDER: Solfege[] = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']

// Random tonic range (MIDI): C4–G4. Comfortable octave where every degree
// (시 = tonic−1 up to the scale's tonic+12) stays audible.
const TONIC_MIN = 60
const TONIC_MAX = 67

export function randomTonic(): number {
  return TONIC_MIN + Math.floor(Math.random() * (TONIC_MAX - TONIC_MIN + 1))
}

// Actual MIDI pitch of a degree in the given key.
export function midiOf(deg: Solfege, tonic: number): number {
  return tonic + SOLFEGE[deg].offset
}

export function labelOf(deg: Solfege): string {
  return SOLFEGE[deg].label
}

// The pitch actually played for a degree question, plus the 도 it should resolve
// toward in feedback. 시(이끔음)는 도 아래(−1)로도, 위쪽 7음째(+11)로도 등장한다
// — 이끔음이 "도로 반음 해결"되는 성격을 위·아래 양방향에서 익히게 하려는 것.
// 위 시는 위 옥타브 도(+12)로, 아래 시·나머지 음은 기준 도로 해결한다.
export interface QuestionPitch {
  midi: number
  resolveTonic: number
}

export function degreeQuestionPitch(deg: Solfege, tonic: number): QuestionPitch {
  if (deg === 'si' && Math.random() < 0.5) {
    return { midi: tonic + 11, resolveTonic: tonic + 12 }
  }
  return { midi: midiOf(deg, tonic), resolveTonic: tonic }
}

// Stage 1 (음 구분) difficulty tiers — add one thing at a time.
export interface DegreeTier {
  id: 'basic' | 'mid' | 'all'
  label: string
  hint: string
  degrees: Solfege[]
}

export const DEGREE_TIERS: DegreeTier[] = [
  { id: 'basic', label: '기초', hint: '레 · 시',        degrees: ['re', 'si'] },
  { id: 'mid',   label: '중급', hint: '레 · 미 · 파 · 시', degrees: ['re', 'mi', 'fa', 'si'] },
  { id: 'all',   label: '전체', hint: '온음계 7음',      degrees: ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'] },
]

// Stage 2 (멜로디) lengths.
export const MELODY_LENGTHS = [2, 3, 4] as const
export type MelodyLength = (typeof MELODY_LENGTHS)[number]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Weighted random pick. Every item gets a base weight of 1 plus its accumulated
// "miss weight" (see earTrainingProgress), so items the learner keeps missing
// come up more often — spaced repetition steered toward weak spots. With an
// empty weights map this is just a uniform random pick.
export function weightedPick<T extends string>(pool: T[], weights: Record<string, number>): T {
  const scores = pool.map(item => 1 + Math.max(0, weights[item] ?? 0))
  const total = scores.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= scores[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function randomDegree(pool: Solfege[]): Solfege {
  return randomItem(pool)
}

// Build a short melody from the pool. Avoid immediately repeating the same note
// so each step is audible, but allow a note to recur later in the phrase.
// When `weights` is given, each note is drawn weighted toward missed degrees.
export function makeMelody(pool: Solfege[], length: number, weights?: Record<string, number>): Solfege[] {
  const pick = () => (weights ? weightedPick(pool, weights) : randomItem(pool))
  const melody: Solfege[] = []
  for (let i = 0; i < length; i++) {
    let next = pick()
    let guard = 0
    while (pool.length > 1 && next === melody[i - 1] && guard < 10) {
      next = pick()
      guard++
    }
    melody.push(next)
  }
  return melody
}

// The played MIDI sequence for a melody. Each 시 independently lands either below
// 도 (−1) or on the upper 7th degree (+11), matching the single-note degree quiz,
// so the leading tone is heard both above and below 도. Computed once per melody
// so replays keep the very same octaves.
export function melodyMidis(melody: Solfege[], tonic: number): number[] {
  return melody.map(d => (d === 'si' && Math.random() < 0.5 ? tonic + 11 : midiOf(d, tonic)))
}

export function identifyExplanation(deg: Solfege): string {
  return `${labelOf(deg)} 입니다. ${SOLFEGE[deg].fn}`
}

export function melodyAnswerLabels(melody: Solfege[]): string {
  return melody.map(labelOf).join(' - ')
}

// ─── Stage 3 (코드 청음) ──────────────────────────────────────────────────
// Chord-quality recognition. Unlike degree ID this is context-free: the quality
// is heard from the intervals inside the chord, so there's no tonic to establish
// — just play the chord from a random root. Intervals are semitones from the
// root, so any chord transposes by changing the root.

export type ChordQualityId = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'm7' | 'dom7' | 'm7b5'

export interface ChordQualityInfo {
  label: string       // shown on the answer button
  intervals: number[] // semitones from the root
  fn: string          // one-line character, shown as feedback
}

export const CHORD_QUALITIES: Record<ChordQualityId, ChordQualityInfo> = {
  maj:  { label: '메이저',    intervals: [0, 4, 7],     fn: '장3도 + 단3도 — 밝고 안정적.' },
  min:  { label: '마이너',    intervals: [0, 3, 7],     fn: '단3도 + 장3도 — 어둡고 서정적.' },
  dim:  { label: '디미니시',  intervals: [0, 3, 6],     fn: '단3도 두 개 — 불안하게 조여드는 긴장.' },
  aug:  { label: '어그멘티드', intervals: [0, 4, 8],    fn: '장3도 두 개 — 붕 뜬 듯한 긴장감.' },
  maj7: { label: 'maj7',      intervals: [0, 4, 7, 11], fn: '메이저 + 장7도 — 세련되고 부드러움.' },
  m7:   { label: 'm7',        intervals: [0, 3, 7, 10], fn: '마이너 + 단7도 — 차분한 마이너 7화음.' },
  dom7: { label: '7',         intervals: [0, 4, 7, 10], fn: '메이저 + 단7도 — 해결을 원하는 딸림7.' },
  m7b5: { label: 'm7♭5',      intervals: [0, 3, 6, 10], fn: '하프 디미니시 — 마이너 ii처럼 긴장.' },
}

// ─── 커스텀 모드: 코드 청음 ───────────────────────────────────────────────
export const ALL_CHORD_QUALITY_IDS: ChordQualityId[] = [
  'maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'm7b5',
]
export const MIN_CUSTOM_CHORD_QUALITIES = 2
export function isCustomChordValid(qualities: ChordQualityId[]): boolean {
  return qualities.length >= MIN_CUSTOM_CHORD_QUALITIES
}

export interface ChordTier {
  id: 'triad2' | 'triad4' | 'seventh'
  label: string
  hint: string
  qualities: ChordQualityId[]
}

// Tiers add one distinction at a time; the 7화음 tier is deliberately the four
// diatonic qualities the rest of the app already drills (maj7 · m7 · 7 · m7♭5).
export const CHORD_TIERS: ChordTier[] = [
  { id: 'triad2',  label: '기초',   hint: '메이저 · 마이너',    qualities: ['maj', 'min'] },
  { id: 'triad4',  label: '3화음',  hint: 'maj·min·dim·aug',    qualities: ['maj', 'min', 'dim', 'aug'] },
  { id: 'seventh', label: '7화음',  hint: 'maj7·m7·7·m7♭5',     qualities: ['maj7', 'm7', 'dom7', 'm7b5'] },
]

// Root range (MIDI): E3–C4, chosen so even a maj7's top note (root+11) stays in
// a warm, clearly audible register.
const CHORD_ROOT_MIN = 52
const CHORD_ROOT_MAX = 60

export function randomChordRoot(): number {
  return CHORD_ROOT_MIN + Math.floor(Math.random() * (CHORD_ROOT_MAX - CHORD_ROOT_MIN + 1))
}

export function chordMidis(quality: ChordQualityId, root: number): number[] {
  return CHORD_QUALITIES[quality].intervals.map(i => root + i)
}

export function chordLabel(id: ChordQualityId): string {
  return CHORD_QUALITIES[id].label
}

export function chordExplanation(id: ChordQualityId): string {
  return `${CHORD_QUALITIES[id].label} 입니다. ${CHORD_QUALITIES[id].fn}`
}

// ─── Stage 4 (진행 청음) ──────────────────────────────────────────────────
// Chord-progression recognition. The ear is grounded in the tonic (as in the
// degree stage), then a progression of diatonic triads is played; the learner
// names the scale-degree of each chord. This connects directly to the app's
// numeric-progression quiz modes.

// Semitone offset of a major-scale position, wrapping octaves (pos 7 = tonic+12).
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
function scalePosOffset(pos0: number): number {
  return MAJOR_STEPS[((pos0 % 7) + 7) % 7] + 12 * Math.floor(pos0 / 7)
}

// The diatonic triad built on a scale degree (1–7): root + third + fifth stacked
// within the major scale, so each degree's quality (I major, ii minor, vii° dim…)
// falls out naturally from the scale.
export function diatonicTriadMidis(tonic: number, degree: number): number[] {
  const base = degree - 1
  return [base, base + 2, base + 4].map(p => tonic + scalePosOffset(p))
}

// Major-key roman numerals, shown alongside the numeric answer as feedback.
const ROMAN = ['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
export function romanOf(degree: number): string {
  return ROMAN[degree] ?? String(degree)
}

export interface ProgressionTier {
  id: 'primary' | 'pop' | 'diatonic'
  label: string
  hint: string
  degrees: number[]          // answer buttons offered
  progressions: number[][]   // candidate progressions to quiz
}

// Tiers widen the chord vocabulary: primary triads (I·IV·V) → add the pop
// staples (vi·ii) → the full diatonic set. Progressions are the ones a learner
// actually meets, so the ear builds real-world pattern recognition.
export const PROGRESSION_TIERS: ProgressionTier[] = [
  {
    id: 'primary',
    label: '기초',
    hint: 'I · IV · V',
    degrees: [1, 4, 5],
    progressions: [
      [1, 4, 5, 1],
      [1, 5, 4, 1],
      [1, 4, 1, 5],
      [1, 5, 1, 4],
      [1, 4, 5],
      [1, 5, 1],
    ],
  },
  {
    id: 'pop',
    label: '팝',
    hint: 'I·IV·V·vi·ii',
    degrees: [1, 2, 4, 5, 6],
    progressions: [
      [1, 5, 6, 4],
      [6, 4, 1, 5],
      [1, 6, 4, 5],
      [1, 4, 6, 5],
      [2, 5, 1],
      [1, 6, 2, 5],
    ],
  },
  {
    id: 'diatonic',
    label: '전체',
    hint: '온음계 7도',
    degrees: [1, 2, 3, 4, 5, 6, 7],
    progressions: [
      [1, 6, 2, 5],
      [3, 6, 2, 5],
      [1, 4, 7, 3],
      [6, 2, 5, 1],
      [1, 3, 6, 4],
      [2, 5, 1, 6],
    ],
  },
]

export function progressionSignature(p: number[]): string {
  return p.join('-')
}

export function progressionAnswerLabels(p: number[]): string {
  return `${p.join(' - ')}  (${p.map(romanOf).join(' - ')})`
}

// Pick a progression, weighted toward ones the learner keeps missing (keyed by
// signature). Avoids immediately repeating the previous progression.
export function pickProgression(tier: ProgressionTier, weights: Record<string, number>, last: string | null): number[] {
  const sigs = tier.progressions.map(progressionSignature)
  let sig = weightedPick(sigs, weights)
  let guard = 0
  while (sigs.length > 1 && sig === last && guard < 8) {
    sig = weightedPick(sigs, weights)
    guard++
  }
  const idx = sigs.indexOf(sig)
  return tier.progressions[idx]
}

// ─── 커스텀 모드: 진행 청음 ───────────────────────────────────────────────
export const ALL_DEGREES: number[] = [1, 2, 3, 4, 5, 6, 7]
export const CUSTOM_PROGRESSION_LENGTHS = [1, 2, 3, 4] as const
export const MIN_CUSTOM_DEGREES = 2

export function isCustomProgressionValid(degrees: number[], length: number): boolean {
  return degrees.length >= MIN_CUSTOM_DEGREES && length >= 1 && length <= 4
}

// 선택한 도(degrees) 안에서 length개를 무작위로 뽑아 진행을 만든다.
// 직전과 완전히 같은 시퀀스는 (조합 다양성이 허용하는 한) 재시도해 피한다.
// length 1이면 단일 다이어토닉 코드 문제(선생님 2번)가 된다.
export function buildCustomProgression(
  degrees: number[],
  length: number,
  last: string | null,
): number[] {
  const pool = degrees.length > 0 ? degrees : [1]
  const len = Math.max(1, Math.min(4, Math.floor(length)))
  const gen = () =>
    Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)])
  let next = gen()
  let guard = 0
  const distinctPossible = Math.pow(pool.length, len) > 1
  while (distinctPossible && progressionSignature(next) === last && guard < 12) {
    next = gen()
    guard++
  }
  return next
}

export interface CustomChordConfig {
  qualities: ChordQualityId[]
}
export interface CustomProgressionConfig {
  degrees: number[]
  length: number
}

const CUSTOM_CHORD_KEY = 'keymaster_earCustom_chord'
const CUSTOM_PROG_KEY = 'keymaster_earCustom_progression'

const DEFAULT_CHORD_CONFIG: CustomChordConfig = { qualities: ['maj', 'min'] }
const DEFAULT_PROG_CONFIG: CustomProgressionConfig = { degrees: [1, 4, 5], length: 2 }

export function loadCustomChord(): CustomChordConfig {
  if (typeof window === 'undefined') return DEFAULT_CHORD_CONFIG
  try {
    const raw = window.localStorage.getItem(CUSTOM_CHORD_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { qualities?: unknown }
      const qualities = (Array.isArray(parsed.qualities) ? parsed.qualities : []).filter(
        (q): q is ChordQualityId => ALL_CHORD_QUALITY_IDS.includes(q as ChordQualityId),
      )
      if (isCustomChordValid(qualities)) return { qualities }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_CHORD_CONFIG
}

export function saveCustomChord(cfg: CustomChordConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_CHORD_KEY, JSON.stringify(cfg))
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function loadCustomProgression(): CustomProgressionConfig {
  if (typeof window === 'undefined') return DEFAULT_PROG_CONFIG
  try {
    const raw = window.localStorage.getItem(CUSTOM_PROG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { degrees?: unknown; length?: unknown }
      const degrees = (Array.isArray(parsed.degrees) ? parsed.degrees : []).filter(
        (d): d is number => typeof d === 'number' && d >= 1 && d <= 7,
      )
      const length = typeof parsed.length === 'number' ? parsed.length : DEFAULT_PROG_CONFIG.length
      if (isCustomProgressionValid(degrees, length)) return { degrees, length }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PROG_CONFIG
}

export function saveCustomProgression(cfg: CustomProgressionConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_PROG_KEY, JSON.stringify(cfg))
  } catch {
    // ignore quota / privacy-mode errors
  }
}
