# KeyMaster Harmony Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a music theory quiz web app (KeyMaster Harmony Trainer) with 5 quiz modes, covering diatonic chords, chord tones, key signatures, and progressions.

**Architecture:** Single-page client app in Next.js 16 App Router. `app/page.tsx` is a server component that renders `<App />`. `src/App.tsx` carries the `'use client'` boundary and all state via useState. Data → utils → components flow with no external state library.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript, Tailwind CSS 4, localStorage

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/quiz.ts` | Create | Types: QuizMode, KeyGroup, Question, QuizResult |
| `src/data/musicTheory.ts` | Create | All music constants |
| `src/utils/musicTheoryUtils.ts` | Create | Derived calculations + question generators |
| `src/utils/answerValidation.ts` | Create | Input normalization + answer validators |
| `src/components/Header.tsx` | Create | Score/bestScore/streak display |
| `src/components/KeyRangeSelector.tsx` | Create | Key group + custom key selection |
| `src/components/ModeSelector.tsx` | Create | Quiz mode 1–5 tabs |
| `src/components/StudyPanel.tsx` | Create | Current key: scale, accidentals, diatonic chords |
| `src/components/ResultPanel.tsx` | Create | Correct/wrong feedback + explanation |
| `src/components/QuizCard.tsx` | Create | Question text, inputs, submit/hint/next buttons |
| `src/App.tsx` | Create | Root client component, all state |
| `app/page.tsx` | Modify | Replace boilerplate with `<App />` |
| `app/layout.tsx` | Modify | Update title/description, Korean lang |
| `app/globals.css` | Modify | Dark mode base styles |
| `README.md` | Modify | App docs |

---

## Task 1: Types

**Files:**
- Create: `src/types/quiz.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/quiz.ts
export type QuizMode = 1 | 2 | 3 | 4 | 5
export type KeyGroup = 'all' | 'flat' | 'sharp' | 'custom'

export interface ChordAnswer {
  degree: number
  chordName: string
  tones: string[]
}

export interface Question {
  mode: QuizMode
  key: string
  text: string
  hint: string
  explanation: string
  answer?: string           // modes 3, 4
  answerList?: string[]     // mode 5 (accidentals or scale)
  answerCount?: number      // mode 5 type B
  answerDegrees?: number[]  // mode 2
  chordAnswers?: ChordAnswer[] // mode 1
  progression?: number[]    // modes 1, 2
}

export interface QuizResult {
  correct: boolean
  explanation: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors from `src/types/quiz.ts`

---

## Task 2: Music Theory Constants

**Files:**
- Create: `src/data/musicTheory.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// src/data/musicTheory.ts
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
  [2, 5, 1],
  [2, 5, 1, 6],
  [1, 6, 2, 5],
  [6, 2, 5, 1],
  [4, 5, 3, 6],
  [1, 4, 5, 1],
]

// Index 0 unused; index 1 = 1st degree
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

---

## Task 3: Music Theory Utils

**Files:**
- Create: `src/utils/musicTheoryUtils.ts`

- [ ] **Step 1: Create the utils file**

```typescript
// src/utils/musicTheoryUtils.ts
import type { Question, QuizMode, ChordAnswer } from '@/src/types/quiz'
import {
  MAJOR_SCALES,
  DIATONIC_7TH_QUALITIES,
  COMMON_PROGRESSIONS,
  ROMAN_NUMERALS_LOWER,
  KEY_GROUPS,
  KEY_SIGNATURES,
  FLAT_ORDER,
  SHARP_ORDER,
} from '@/src/data/musicTheory'

export function getScale(key: string): string[] {
  return MAJOR_SCALES[key] ?? []
}

export function getScaleDegree(key: string, degree: number): string {
  return getScale(key)[degree - 1] ?? ''
}

export function getDiatonicChord(key: string, degree: number): string {
  const root = getScaleDegree(key, degree)
  const quality = DIATONIC_7TH_QUALITIES[degree - 1]
  return root + quality
}

export function getChordTones(key: string, degree: number): string[] {
  const scale = getScale(key)
  const idx = degree - 1
  return [
    scale[idx],
    scale[(idx + 2) % 7],
    scale[(idx + 4) % 7],
    scale[(idx + 6) % 7],
  ]
}

export function getDiatonicChords(key: string): string[] {
  return [1, 2, 3, 4, 5, 6, 7].map(d => getDiatonicChord(key, d))
}

export function getKeySignature(key: string): string[] {
  return KEY_SIGNATURES[key] ?? []
}

export function getKeyGroupKeys(group: string): string[] {
  return KEY_GROUPS[group] ?? KEY_GROUPS.all
}

export function getAccidentalType(key: string): 'flat' | 'sharp' | 'none' {
  const sig = getKeySignature(key)
  if (sig.length === 0) return 'none'
  return sig[0].includes('b') ? 'flat' : 'sharp'
}

export function getAccidentalCount(key: string): number {
  return getKeySignature(key).length
}

export function findMajorKeyBySignature(accidentals: string[]): string {
  for (const [key, sig] of Object.entries(KEY_SIGNATURES)) {
    if (
      sig.length === accidentals.length &&
      sig.every((a, i) => a === accidentals[i])
    ) {
      return key
    }
  }
  return ''
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDegree(): number {
  return Math.floor(Math.random() * 7) + 1
}

export function generateProgressionQuestion(key: string): Question {
  const progression = randomItem(COMMON_PROGRESSIONS)
  const scale = getScale(key)
  const chordAnswers: ChordAnswer[] = progression.map(degree => ({
    degree,
    chordName: getDiatonicChord(key, degree),
    tones: getChordTones(key, degree),
  }))

  const progressionText = progression.join(' - ')
  const answerLines = chordAnswers
    .map(ca => `${ca.degree} = ${ca.chordName} = ${ca.tones.join(' ')}`)
    .join('\n')

  return {
    mode: 1,
    key,
    text: `${key} key에서 ${progressionText} 진행의 코드와 구성음을 적어주세요.`,
    hint: `먼저 ${key} major scale을 떠올려보세요: ${scale.join(' ')}`,
    explanation: `${key} major scale은 ${scale.join(' ')}입니다.\n\n${answerLines}`,
    chordAnswers,
    progression,
  }
}

export function generateProgressionAnalysisQuestion(key: string): Question {
  const progression = randomItem(COMMON_PROGRESSIONS)
  const chordNames = progression.map(d => getDiatonicChord(key, d)).join(' - ')
  const romanNumerals = progression.map(d => ROMAN_NUMERALS_LOWER[d]).join(' - ')
  const numeralAnswer = progression.join(' - ')
  const firstChord = getDiatonicChord(key, progression[0])
  const firstDegree = progression[0]

  return {
    mode: 2,
    key,
    text: `${chordNames} 진행은 어떤 도수 진행인가요? (${key} key)`,
    hint: `이 진행의 첫 코드는 ${firstChord}입니다. ${key} key에서 ${getScaleDegree(key, firstDegree)}는 ${firstDegree}도입니다.`,
    explanation: `${key} key의 스케일은 ${getScale(key).join(' ')}입니다.\n\n정답: ${numeralAnswer} 또는 ${romanNumerals}`,
    answerDegrees: progression,
    progression,
  }
}

export function generateDegreeNoteQuestion(key: string): Question {
  const degree = randomDegree()
  const note = getScaleDegree(key, degree)
  const scale = getScale(key)

  return {
    mode: 3,
    key,
    text: `${key} key에서 ${degree}도는 무엇인가요?`,
    hint: `${key} major scale을 순서대로 세어보세요: ${scale.join(' ')}`,
    explanation: `${key} major scale은 ${scale.join(' ')}입니다.\n${degree}도는 ${note}입니다.`,
    answer: note,
  }
}

export function generateDegreeChordQuestion(key: string): Question {
  const degree = randomDegree()
  const chord = getDiatonicChord(key, degree)
  const quality = DIATONIC_7TH_QUALITIES[degree - 1]
  const qualityNames: Record<string, string> = {
    maj7: 'Major 7th',
    m7: 'minor 7th',
    '7': 'Dominant 7th',
    m7b5: 'minor 7th flat 5 (half-diminished)',
  }

  return {
    mode: 4,
    key,
    text: `${key} key의 ${degree}도 7화음 코드는 무엇인가요?`,
    hint: `메이저 키에서 ${degree}도 7화음의 퀄리티는 ${qualityNames[quality] ?? quality}입니다.`,
    explanation: `${key} major scale: ${getScale(key).join(' ')}\n${degree}도 루트는 ${getScaleDegree(key, degree)}, 퀄리티는 ${quality}\n정답: ${chord}`,
    answer: chord,
  }
}

export function generateKeySignatureQuestion(key: string): Question {
  const sig = getKeySignature(key)
  const accType = getAccidentalType(key)
  const count = sig.length

  const typeOptions = ['A', 'B', 'C', 'D'] as const
  const qType = randomItem([...typeOptions])

  const flatHint = `flat key의 조표 순서: ${FLAT_ORDER.join(' → ')}`
  const sharpHint = `sharp key의 조표 순서: ${SHARP_ORDER.join(' → ')}`
  const hint = `${flatHint}\n${sharpHint}`

  if (qType === 'A') {
    const accLabel = accType === 'flat' ? 'flat' : accType === 'sharp' ? 'sharp' : 'sharp 또는 flat'
    if (count === 0) {
      return {
        mode: 5,
        key,
        text: `C major key에는 sharp이나 flat이 붙나요?`,
        hint,
        explanation: `C major는 조표가 없습니다. (없음)`,
        answerList: [],
        answerCount: 0,
      }
    }
    return {
      mode: 5,
      key,
      text: `${key} major key에는 어떤 ${accLabel}이 붙나요?`,
      hint,
      explanation: `${key} major는 ${accLabel}이 ${count}개 붙습니다.\n정답: ${sig.join(', ')}`,
      answerList: sig,
    }
  }

  if (qType === 'B') {
    return {
      mode: 5,
      key,
      text: `${key} major key에는 sharp 또는 flat이 몇 개 붙나요?`,
      hint,
      explanation: count === 0
        ? `C major는 조표가 없습니다. (0개)`
        : `${key} major는 ${accType === 'flat' ? 'flat' : 'sharp'}이 ${count}개 붙습니다.`,
      answerCount: count,
    }
  }

  if (qType === 'C') {
    if (count === 0) {
      return {
        mode: 5,
        key,
        text: `조표가 없는 major key는 무엇인가요?`,
        hint,
        explanation: `조표가 없는 major key는 C major입니다.`,
        answer: 'C',
      }
    }
    return {
      mode: 5,
      key,
      text: `${sig.join(', ')}이 붙는 major key는 무엇인가요?`,
      hint,
      explanation: `${sig.join(', ')}가 붙는 major key는 ${key} major입니다.`,
      answer: key,
    }
  }

  // qType === 'D'
  const scale = getScale(key)
  return {
    mode: 5,
    key,
    text: `${key} major scale을 순서대로 적어주세요.`,
    hint,
    explanation: `${key} major scale: ${scale.join(' ')}`,
    answerList: scale,
  }
}

export function generateQuestion(mode: QuizMode, selectedKeys: string[]): Question {
  const key = randomItem(selectedKeys.length > 0 ? selectedKeys : KEY_GROUPS.all)
  switch (mode) {
    case 1: return generateProgressionQuestion(key)
    case 2: return generateProgressionAnalysisQuestion(key)
    case 3: return generateDegreeNoteQuestion(key)
    case 4: return generateDegreeChordQuestion(key)
    case 5: return generateKeySignatureQuestion(key)
  }
}
```

- [ ] **Step 2: Internal verification — run in browser console or add to a temp file**

Verify these exact values before continuing:

```typescript
// Bb key 2-5-1-6
getChordTones('Bb', 2) // ['C', 'Eb', 'G', 'Bb']
getDiatonicChord('Bb', 2) // 'Cm7'
getChordTones('Bb', 5) // ['F', 'A', 'C', 'Eb']
getDiatonicChord('Bb', 5) // 'F7'
getChordTones('Bb', 1) // ['Bb', 'D', 'F', 'A']
getDiatonicChord('Bb', 1) // 'Bbmaj7'
getChordTones('Bb', 6) // ['G', 'Bb', 'D', 'F']
getDiatonicChord('Bb', 6) // 'Gm7'

// Key signatures
getKeySignature('Bb') // ['Bb', 'Eb']
getKeySignature('Eb') // ['Bb', 'Eb', 'Ab']
getKeySignature('Ab') // ['Bb', 'Eb', 'Ab', 'Db']
getKeySignature('G')  // ['F#']
getKeySignature('D')  // ['F#', 'C#']
getKeySignature('A')  // ['F#', 'C#', 'G#']
getKeySignature('E')  // ['F#', 'C#', 'G#', 'D#']
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

---

## Task 4: Answer Validation Utils

**Files:**
- Create: `src/utils/answerValidation.ts`

- [ ] **Step 1: Create the validation file**

```typescript
// src/utils/answerValidation.ts

/** Normalize a note name: "bb" → "Bb", "f#" → "F#", "db" → "Db" */
export function normalizeNote(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''

  // Handle natural notes (single letter)
  if (/^[a-gA-G]$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  // Handle flat notes: bb, Bb, B flat, Bflat
  const flatMatch = trimmed.match(/^([a-gA-G])\s*(?:b|flat)$/i)
  if (flatMatch) {
    return flatMatch[1].toUpperCase() + 'b'
  }

  // Handle sharp notes: f#, F#, F sharp, Fsharp
  const sharpMatch = trimmed.match(/^([a-gA-G])\s*(?:#|sharp)$/i)
  if (sharpMatch) {
    return sharpMatch[1].toUpperCase() + '#'
  }

  // Handle double-flat (db = Db, not double flat in this context)
  // The "b" suffix may look like double-flat only if the letter is "b"
  // e.g. "bb" means "Bb" (B-flat)
  if (/^[a-gA-G][bB]$/.test(trimmed)) {
    return trimmed[0].toUpperCase() + 'b'
  }

  if (/^[a-gA-G]#$/.test(trimmed)) {
    return trimmed[0].toUpperCase() + '#'
  }

  return trimmed
}

/** Normalize a chord name: "bbmaj7" → "Bbmaj7", "cm7" → "Cm7" */
export function normalizeChord(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''

  // Match root note + optional accidental + quality suffix
  const match = trimmed.match(/^([a-gA-G])(b|#|flat|sharp)?(.*)$/i)
  if (!match) return trimmed

  const root = match[1].toUpperCase()
  const accidental = match[2]
    ? (match[2].toLowerCase() === 'flat' || match[2].toLowerCase() === 'b' ? 'b' : '#')
    : ''
  const quality = match[3].toLowerCase()
  return root + accidental + quality
}

/** Normalize a key name: "bb major" → "Bb", "B flat" → "Bb", "Ebmaj" → "Eb" */
export function normalizeKeyName(input: string): string {
  const trimmed = input.trim().toLowerCase()

  // Remove common suffixes
  const cleaned = trimmed
    .replace(/\s*(major|maj)\s*$/i, '')
    .replace(/\s*(key)\s*$/i, '')
    .trim()

  // "b flat" → "Bb", "e flat" → "Eb"
  const flatWordMatch = cleaned.match(/^([a-g])\s+flat$/i)
  if (flatWordMatch) return flatWordMatch[1].toUpperCase() + 'b'

  // "f sharp" → "F#", "g sharp" → "G#"
  const sharpWordMatch = cleaned.match(/^([a-g])\s+sharp$/i)
  if (sharpWordMatch) return sharpWordMatch[1].toUpperCase() + '#'

  return normalizeNote(cleaned)
}

/** Parse a note list from any separator: "C Eb G Bb", "C,Eb,G,Bb", "C-Eb-G-Bb" */
export function parseNoteList(input: string): string[] {
  return input
    .split(/[\s,\-]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(normalizeNote)
}

const EMPTY_ANSWERS = new Set(['없음', '0', '0개', 'none', 'no accidentals', '없음.', '없음!'])

/** Validate mode 3: single note answer */
export function validateDegreeAnswer(userAnswer: string, correct: string): boolean {
  return normalizeNote(userAnswer) === normalizeNote(correct)
}

/** Validate mode 4: chord name answer */
export function validateChordAnswer(userAnswer: string, correct: string): boolean {
  return normalizeChord(userAnswer) === normalizeChord(correct)
}

/**
 * Validate chord tones.
 * @param ordered if false, order is ignored (default: true = order required)
 */
export function validateChordToneAnswer(
  userAnswer: string,
  correctTones: string[],
  ordered = true,
): boolean {
  const parsed = parseNoteList(userAnswer)
  if (parsed.length !== correctTones.length) return false
  const normalized = correctTones.map(normalizeNote)
  if (ordered) {
    return parsed.every((n, i) => n === normalized[i])
  }
  return (
    parsed.every(n => normalized.includes(n)) &&
    normalized.every(n => parsed.includes(n))
  )
}

/**
 * Validate mode 2: degree progression.
 * Accepts numeric "2-5-1" and roman "ii-V-i" (case insensitive).
 */
export function validateProgressionAnswer(
  userAnswer: string,
  correctDegrees: number[],
): boolean {
  const rawParts = userAnswer.split(/[\s\-]+/).filter(s => s.length > 0)
  if (rawParts.length !== correctDegrees.length) return false

  const romanToNum: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7,
  }

  return rawParts.every((part, idx) => {
    const num = parseInt(part, 10)
    if (!isNaN(num)) return num === correctDegrees[idx]
    const roman = part.toLowerCase()
    return (romanToNum[roman] ?? -1) === correctDegrees[idx]
  })
}

/**
 * Validate mode 5 type A: list of accidentals.
 * "Bb, Eb" or "Bb Eb" both valid.
 */
export function validateAccidentalsAnswer(
  userAnswer: string,
  correctAccidentals: string[],
): boolean {
  if (correctAccidentals.length === 0) {
    return EMPTY_ANSWERS.has(userAnswer.trim().toLowerCase()) ||
      userAnswer.trim() === '0' ||
      userAnswer.trim() === ''
  }
  const parsed = parseNoteList(userAnswer)
  if (parsed.length !== correctAccidentals.length) return false
  const normalized = correctAccidentals.map(normalizeNote)
  return parsed.every((n, i) => n === normalized[i])
}

/** Validate mode 5 type B: count of accidentals. */
export function validateAccidentalCountAnswer(
  userAnswer: string,
  correctCount: number,
): boolean {
  const trimmed = userAnswer.trim().toLowerCase()
  if (correctCount === 0 && EMPTY_ANSWERS.has(trimmed)) return true
  const parsed = parseInt(trimmed.replace(/[^0-9]/g, ''), 10)
  return parsed === correctCount
}

/** Validate mode 5 type D: full scale in order. */
export function validateScaleAnswer(
  userAnswer: string,
  correctScale: string[],
): boolean {
  const parsed = parseNoteList(userAnswer)
  if (parsed.length !== correctScale.length) return false
  return parsed.every((n, i) => n === normalizeNote(correctScale[i]))
}

/** Validate mode 5 type C: key name answer. */
export function validateKeyNameAnswer(userAnswer: string, correctKey: string): boolean {
  return normalizeKeyName(userAnswer) === normalizeNote(correctKey)
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

---

## Task 5: Header Component

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/Header.tsx
interface HeaderProps {
  currentScore: number
  bestScore: number
  streak: number
}

export default function Header({ currentScore, bestScore, streak }: HeaderProps) {
  return (
    <header className="bg-gray-800 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-purple-400 tracking-tight">
          🎹 KeyMaster
        </h1>
        <p className="text-xs text-gray-400">Harmony Trainer</p>
      </div>
      <div className="flex gap-4 text-center">
        <div>
          <div className="text-xs text-gray-400">점수</div>
          <div className="text-lg font-bold text-white">{currentScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">최고</div>
          <div className="text-lg font-bold text-yellow-400">{bestScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">연속</div>
          <div className="text-lg font-bold text-green-400">{streak}🔥</div>
        </div>
      </div>
    </header>
  )
}
```

---

## Task 6: KeyRangeSelector Component

**Files:**
- Create: `src/components/KeyRangeSelector.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/KeyRangeSelector.tsx
import type { KeyGroup } from '@/src/types/quiz'
import { KEY_GROUPS, SUPPORTED_KEYS } from '@/src/data/musicTheory'

interface KeyRangeSelectorProps {
  selectedGroup: KeyGroup
  customKeys: string[]
  onGroupChange: (group: KeyGroup) => void
  onCustomKeysChange: (keys: string[]) => void
}

const GROUP_LABELS: Record<KeyGroup, string> = {
  all: '전체 키',
  flat: '플랫 키 집중',
  sharp: '샵 키 집중',
  custom: '직접 선택',
}

export default function KeyRangeSelector({
  selectedGroup,
  customKeys,
  onGroupChange,
  onCustomKeysChange,
}: KeyRangeSelectorProps) {
  const activeKeys =
    selectedGroup === 'custom'
      ? customKeys
      : KEY_GROUPS[selectedGroup] ?? KEY_GROUPS.all

  function toggleCustomKey(key: string) {
    if (customKeys.includes(key)) {
      onCustomKeysChange(customKeys.filter(k => k !== key))
    } else {
      onCustomKeysChange([...customKeys, key])
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'flat', 'sharp', 'custom'] as KeyGroup[]).map(group => (
          <button
            key={group}
            onClick={() => onGroupChange(group)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGroup === group
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {GROUP_LABELS[group]}
          </button>
        ))}
      </div>

      {selectedGroup === 'custom' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {SUPPORTED_KEYS.map(key => (
            <button
              key={key}
              onClick={() => toggleCustomKey(key)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                customKeys.includes(key)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        현재 출제 범위:{' '}
        <span className="text-purple-300 font-medium">
          {GROUP_LABELS[selectedGroup]} — {activeKeys.join(', ') || '없음 (전체 키로 대체)'}
        </span>
      </p>
    </div>
  )
}
```

---

## Task 7: ModeSelector Component

**Files:**
- Create: `src/components/ModeSelector.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ModeSelector.tsx
import type { QuizMode } from '@/src/types/quiz'

interface ModeSelectorProps {
  selectedMode: QuizMode
  onModeChange: (mode: QuizMode) => void
}

const MODES: { mode: QuizMode; label: string; description: string }[] = [
  { mode: 1, label: '진행 코드톤', description: '숫자 진행 → 코드와 구성음' },
  { mode: 2, label: '진행 분석', description: '코드 진행 → 도수 진행' },
  { mode: 3, label: '도수 음', description: '특정 도수의 음 맞히기' },
  { mode: 4, label: '도수 코드', description: '특정 도수의 7화음 코드' },
  { mode: 5, label: '조표 암기', description: '조표 관련 훈련' },
]

export default function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">퀴즈 모드</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {MODES.map(({ mode, label, description }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            title={description}
            className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors text-center ${
              selectedMode === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs text-gray-400 mb-0.5">모드 {mode}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Task 8: StudyPanel Component

**Files:**
- Create: `src/components/StudyPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/StudyPanel.tsx
import { getScale, getKeySignature, getDiatonicChords, getAccidentalType } from '@/src/utils/musicTheoryUtils'

interface StudyPanelProps {
  questionKey: string
}

export default function StudyPanel({ questionKey }: StudyPanelProps) {
  const scale = getScale(questionKey)
  const sig = getKeySignature(questionKey)
  const chords = getDiatonicChords(questionKey)
  const accType = getAccidentalType(questionKey)

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">학습 패널</p>

      <div className="space-y-1.5 text-sm">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">{questionKey} major scale:</span>
          <span className="text-blue-300 font-mono">{scale.join('  ')}</span>
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">조표:</span>
          {sig.length === 0 ? (
            <span className="text-gray-500">없음</span>
          ) : (
            <span className="text-yellow-300 font-mono">
              {sig.join(', ')} ({accType === 'flat' ? '♭' : '♯'} {sig.length}개)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">다이어토닉 코드:</span>
          <span className="text-purple-300 font-mono text-xs leading-relaxed">
            {chords.map((chord, i) => `${i + 1}. ${chord}`).join('  ')}
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 9: ResultPanel Component

**Files:**
- Create: `src/components/ResultPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ResultPanel.tsx
import type { QuizResult } from '@/src/types/quiz'

interface ResultPanelProps {
  result: QuizResult
}

export default function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        result.correct
          ? 'bg-green-950 border-green-700'
          : 'bg-red-950 border-red-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
        <span className={`font-bold text-lg ${result.correct ? 'text-green-400' : 'text-red-400'}`}>
          {result.correct ? '정답!' : '오답'}
        </span>
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
        {result.explanation}
      </p>
    </div>
  )
}
```

---

## Task 10: QuizCard Component

**Files:**
- Create: `src/components/QuizCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/QuizCard.tsx
'use client'
import { useState, useEffect } from 'react'
import type { Question, QuizResult, ChordAnswer } from '@/src/types/quiz'
import {
  validateDegreeAnswer,
  validateChordAnswer,
  validateChordToneAnswer,
  validateProgressionAnswer,
  validateAccidentalsAnswer,
  validateAccidentalCountAnswer,
  validateScaleAnswer,
  validateKeyNameAnswer,
} from '@/src/utils/answerValidation'

interface QuizCardProps {
  question: Question
  result: QuizResult | null
  hintUsed: boolean
  onHint: () => void
  onAnswer: (correct: boolean, explanation: string) => void
  onNext: () => void
}

export default function QuizCard({
  question,
  result,
  hintUsed,
  onHint,
  onAnswer,
  onNext,
}: QuizCardProps) {
  const [userInput, setUserInput] = useState('')
  const [mode1Inputs, setMode1Inputs] = useState<{ chordName: string; tones: string }[]>([])
  const [showHint, setShowHint] = useState(false)

  // Reset on new question
  useEffect(() => {
    setUserInput('')
    setShowHint(false)
    if (question.chordAnswers) {
      setMode1Inputs(question.chordAnswers.map(() => ({ chordName: '', tones: '' })))
    }
  }, [question])

  function handleHint() {
    setShowHint(true)
    onHint()
  }

  function handleSubmit() {
    if (result) return
    const { correct, explanation } = checkAnswer()
    onAnswer(correct, explanation)
  }

  function checkAnswer(): { correct: boolean; explanation: string } {
    const { mode, explanation } = question

    if (mode === 1 && question.chordAnswers) {
      const allCorrect = mode1Inputs.every((input, i) => {
        const ca: ChordAnswer = question.chordAnswers![i]
        const chordOk = validateChordAnswer(input.chordName, ca.chordName)
        const tonesOk = validateChordToneAnswer(input.tones, ca.tones)
        return chordOk && tonesOk
      })
      return { correct: allCorrect, explanation }
    }

    if (mode === 2 && question.answerDegrees) {
      return { correct: validateProgressionAnswer(userInput, question.answerDegrees), explanation }
    }

    if (mode === 3 && question.answer) {
      return { correct: validateDegreeAnswer(userInput, question.answer), explanation }
    }

    if (mode === 4 && question.answer) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation }
    }

    if (mode === 5) {
      if (question.answer !== undefined) {
        // type C: key name, or type D with single answer
        return { correct: validateKeyNameAnswer(userInput, question.answer), explanation }
      }
      if (question.answerCount !== undefined && question.answerList === undefined) {
        // type B: count
        return { correct: validateAccidentalCountAnswer(userInput, question.answerCount), explanation }
      }
      if (question.answerList !== undefined && question.answerCount === undefined) {
        // type A: accidentals list, or type D: scale
        const isScale = question.text.includes('scale')
        if (isScale) {
          return { correct: validateScaleAnswer(userInput, question.answerList), explanation }
        }
        return { correct: validateAccidentalsAnswer(userInput, question.answerList), explanation }
      }
      if (question.answerCount !== undefined) {
        // type B with answerCount
        return { correct: validateAccidentalCountAnswer(userInput, question.answerCount), explanation }
      }
    }

    return { correct: false, explanation }
  }

  function handleMode1Change(idx: number, field: 'chordName' | 'tones', value: string) {
    setMode1Inputs(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const answered = result !== null

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-4">
      {/* Question text */}
      <div className="text-base font-medium text-white leading-relaxed">
        {question.text}
      </div>

      {/* Hint */}
      {showHint && (
        <div className="bg-blue-950 border border-blue-700 rounded-xl p-3 text-sm text-blue-200 whitespace-pre-line">
          💡 {question.hint}
        </div>
      )}

      {/* Mode 1: multiple inputs */}
      {question.mode === 1 && question.chordAnswers && (
        <div className="space-y-2">
          {question.chordAnswers.map((ca, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm w-4 shrink-0">{ca.degree}</span>
              <input
                type="text"
                placeholder="코드명 (예: Cm7)"
                value={mode1Inputs[i]?.chordName ?? ''}
                onChange={e => handleMode1Change(i, 'chordName', e.target.value)}
                disabled={answered}
                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <input
                type="text"
                placeholder="구성음 (예: C Eb G Bb)"
                value={mode1Inputs[i]?.tones ?? ''}
                onChange={e => handleMode1Change(i, 'tones', e.target.value)}
                disabled={answered}
                className="flex-2 min-w-0 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                style={{ flexGrow: 2 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Other modes: single input */}
      {question.mode !== 1 && (
        <input
          type="text"
          placeholder="답을 입력하세요"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !answered) handleSubmit() }}
          disabled={answered}
          className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!answered && (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-xl transition-colors"
            >
              제출
            </button>
            {!showHint && (
              <button
                onClick={handleHint}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-xl transition-colors"
              >
                힌트
              </button>
            )}
          </>
        )}
        {answered && (
          <button
            onClick={onNext}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl transition-colors"
          >
            다음 문제 →
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Task 11: App Component

**Files:**
- Create: `src/App.tsx`

- [ ] **Step 1: Create the App component**

```tsx
// src/App.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { QuizMode, KeyGroup, Question, QuizResult } from '@/src/types/quiz'
import { generateQuestion } from '@/src/utils/musicTheoryUtils'
import { KEY_GROUPS } from '@/src/data/musicTheory'
import Header from '@/src/components/Header'
import KeyRangeSelector from '@/src/components/KeyRangeSelector'
import ModeSelector from '@/src/components/ModeSelector'
import QuizCard from '@/src/components/QuizCard'
import ResultPanel from '@/src/components/ResultPanel'
import StudyPanel from '@/src/components/StudyPanel'

const LS = {
  currentScore: 'keymaster_currentScore',
  bestScore: 'keymaster_bestScore',
  streak: 'keymaster_streak',
  selectedKeyGroup: 'keymaster_selectedKeyGroup',
  customSelectedKeys: 'keymaster_customSelectedKeys',
  selectedQuizMode: 'keymaster_selectedQuizMode',
}

function load<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const val = localStorage.getItem(key)
    return val === null ? defaultValue : (JSON.parse(val) as T)
  } catch {
    return defaultValue
  }
}

function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export default function App() {
  const [currentScore, setCurrentScore] = useState(() => load(LS.currentScore, 0))
  const [bestScore, setBestScore]       = useState(() => load(LS.bestScore, 0))
  const [streak, setStreak]             = useState(() => load(LS.streak, 0))
  const [keyGroup, setKeyGroup]         = useState<KeyGroup>(() => load(LS.selectedKeyGroup, 'all'))
  const [customKeys, setCustomKeys]     = useState<string[]>(() => load(LS.customSelectedKeys, []))
  const [quizMode, setQuizMode]         = useState<QuizMode>(() => load(LS.selectedQuizMode, 1))
  const [question, setQuestion]         = useState<Question | null>(null)
  const [result, setResult]             = useState<QuizResult | null>(null)
  const [hintUsed, setHintUsed]         = useState(false)

  useEffect(() => { save(LS.currentScore, currentScore) }, [currentScore])
  useEffect(() => { save(LS.bestScore, bestScore) }, [bestScore])
  useEffect(() => { save(LS.streak, streak) }, [streak])
  useEffect(() => { save(LS.selectedKeyGroup, keyGroup) }, [keyGroup])
  useEffect(() => { save(LS.customSelectedKeys, customKeys) }, [customKeys])
  useEffect(() => { save(LS.selectedQuizMode, quizMode) }, [quizMode])

  const activeKeys = useCallback((): string[] => {
    if (keyGroup === 'custom') return customKeys.length > 0 ? customKeys : KEY_GROUPS.all
    return KEY_GROUPS[keyGroup] ?? KEY_GROUPS.all
  }, [keyGroup, customKeys])

  const nextQuestion = useCallback((mode: QuizMode = quizMode) => {
    setQuestion(generateQuestion(mode, activeKeys()))
    setResult(null)
    setHintUsed(false)
  }, [quizMode, activeKeys])

  // Generate initial question on mount
  useEffect(() => { nextQuestion() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer(correct: boolean, explanation: string) {
    if (correct) {
      const pts = hintUsed ? 5 : 10
      const newScore = currentScore + pts
      setCurrentScore(newScore)
      if (newScore > bestScore) setBestScore(newScore)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setResult({ correct, explanation })
  }

  function handleModeChange(mode: QuizMode) {
    setQuizMode(mode)
    nextQuestion(mode)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Header currentScore={currentScore} bestScore={bestScore} streak={streak} />
        <KeyRangeSelector
          selectedGroup={keyGroup}
          customKeys={customKeys}
          onGroupChange={setKeyGroup}
          onCustomKeysChange={setCustomKeys}
        />
        <ModeSelector selectedMode={quizMode} onModeChange={handleModeChange} />
        {question && (
          <>
            <QuizCard
              question={question}
              result={result}
              hintUsed={hintUsed}
              onHint={() => setHintUsed(true)}
              onAnswer={handleAnswer}
              onNext={() => nextQuestion()}
            />
            {result && <ResultPanel result={result} />}
            <StudyPanel questionKey={question.key} />
          </>
        )}
      </div>
    </div>
  )
}
```

---

## Task 12: Wire Next.js Entry Points

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace page.tsx**

```tsx
// app/page.tsx
import App from '@/src/App'

export default function Home() {
  return <App />
}
```

- [ ] **Step 2: Update layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KeyMaster Harmony Trainer',
  description: '음악 화성학 반복 훈련 퀴즈 앱',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-gray-900">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Update globals.css**

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  font-family: var(--font-geist-sans, Arial, Helvetica, sans-serif);
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Run dev server**

```bash
npm run dev
```
Expected: server starts on `http://localhost:3000`, app renders with dark background and quiz UI

---

## Task 13: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write README**

```markdown
# KeyMaster Harmony Trainer

음악 화성학(키, 조표, 다이어토닉 코드, 코드 진행, 코드톤)을 반복 훈련하는 웹 기반 퀴즈 앱.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 지원 퀴즈 모드

| 모드 | 이름 | 설명 |
|------|------|------|
| 1 | 진행 코드톤 | 숫자 진행(예: 2-5-1)을 보고 코드명과 구성음 맞히기 |
| 2 | 진행 분석 | 코드 진행을 보고 도수 진행 맞히기 |
| 3 | 도수 음 | 특정 키에서 특정 도수의 음 맞히기 |
| 4 | 도수 코드 | 특정 키에서 특정 도수의 7화음 코드 맞히기 |
| 5 | 조표 암기 | 키의 조표, 스케일, 조표 개수 훈련 |

## 지원 키

C, F, Bb, Eb, Ab (플랫 키) / G, D, A, E (샵 키) / C (조표 없음)

## 출제 범위 선택

- **전체 키**: 9개 모든 키
- **플랫 키 집중**: Bb, Eb, Ab
- **샵 키 집중**: G, D, A, E
- **직접 선택**: 원하는 키 체크박스로 선택

## 점수 규칙

| 상황 | 점수 |
|------|------|
| 정답 (힌트 미사용) | +10 |
| 정답 (힌트 사용) | +5 |
| 오답 | 0, 연속 정답 초기화 |

점수와 최고 점수는 localStorage에 자동 저장됩니다.

## 향후 확장 아이디어

- minor key 추가
- secondary dominant 훈련
- modal interchange 훈련
- 피아노 키보드 UI
- 코드 사운드 재생
- 약점 자동 복습 기능
- 타임어택 모드
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000` and manually verify:

1. ✅ 앱이 어두운 배경으로 렌더링됨
2. ✅ 모드 1: Bb key 선택 후 2-5-1-6 진행이 출제될 수 있음
3. ✅ 모드 1 정답: Cm7 / C Eb G Bb 입력 시 정답 처리
4. ✅ 모드 5: Bb key에서 조표 "Bb, Eb" 정답
5. ✅ 플랫 키 집중 모드: Bb, Eb, Ab만 출제됨
6. ✅ 샵 키 집중 모드: G, D, A, E만 출제됨
7. ✅ localStorage에 점수/모드/범위 저장됨 (새로고침 후 유지)
8. ✅ 힌트 사용 후 정답 시 +5점
9. ✅ 모바일 뷰에서 레이아웃 정상
