import type { TutorialQuestion, TutorialLesson, TutorialProgress } from '@/src/types/quiz'
import { TUTORIAL_LESSONS } from '@/src/data/tutorialLessons'
import {
  DIATONIC_7TH_QUALITIES,
  COMMON_PROGRESSIONS,
  KEY_SIGNATURES,
  FLAT_ORDER,
  SHARP_ORDER,
} from '@/src/data/musicTheory'
import { getScale, getScaleDegree, getDiatonicChord } from '@/src/utils/musicTheoryUtils'
import {
  validateDegreeAnswer,
  validateChordAnswer,
  validateAccidentalsAnswer,
  validateAccidentalCountAnswer,
  validateScaleAnswer,
  validateKeyNameAnswer,
  validateProgressionAnswer,
} from '@/src/utils/answerValidation'

const TUTORIAL_KEYS = ['C', 'F', 'Bb', 'Eb', 'G', 'D', 'A'] as const
const KEY_WEIGHTS: Record<string, number> = { C: 5, F: 4, G: 4, Bb: 3, D: 3, Eb: 2, A: 2 }

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedRandomKey(): string {
  const keys = Object.keys(KEY_WEIGHTS)
  const weights = keys.map(k => KEY_WEIGHTS[k])
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < keys.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return keys[i]
  }
  return keys[keys.length - 1]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Level 1: Flat/Sharp Order ────────────────────────────────────────────

function makeFlatOrderQ(): TutorialQuestion {
  return {
    levelId: 1, questionType: 'flatOrder',
    text: 'Flat이 붙는 순서대로 입력하세요. (예: Bb Eb Ab Db)',
    hint: 'Bb → Eb → Ab → Db 순서로 누적됩니다.',
    explanation: `Flat key에서 flat은 Bb → Eb → Ab → Db 순서로 붙습니다.\n정답: Bb Eb Ab Db`,
    answerList: [...FLAT_ORDER],
  }
}

function makeSharpOrderQ(): TutorialQuestion {
  return {
    levelId: 1, questionType: 'sharpOrder',
    text: 'Sharp이 붙는 순서대로 입력하세요. (예: F# C# G# D#)',
    hint: 'F# → C# → G# → D# 순서로 누적됩니다.',
    explanation: `Sharp key에서 sharp은 F# → C# → G# → D# 순서로 붙습니다.\n정답: F# C# G# D#`,
    answerList: [...SHARP_ORDER],
  }
}

function makeOrderPositionQ(type: 'flat' | 'sharp', position: number): TutorialQuestion {
  const order = type === 'flat' ? FLAT_ORDER : SHARP_ORDER
  const label = type === 'flat' ? 'flat' : 'sharp'
  const answer = order[position - 1]
  const ordinals = ['첫 번째', '두 번째', '세 번째', '네 번째']
  return {
    levelId: 1, questionType: 'orderPosition',
    text: `${label} 순서에서 ${ordinals[position - 1]} 음은 무엇인가요?`,
    hint: `${label} 순서: ${order.join(' → ')}`,
    explanation: `${label} 순서는 ${order.join(' → ')}입니다.\n${ordinals[position - 1]} 음은 ${answer}입니다.`,
    answer,
  }
}

// ─── Level 2: Key Signatures ──────────────────────────────────────────────

function makeKeyAccidentalsQ(key: string): TutorialQuestion {
  const sig = KEY_SIGNATURES[key] ?? []
  const count = sig.length
  const accType = count > 0 ? (sig[0].includes('b') ? 'flat' : 'sharp') : ''
  if (count === 0) {
    return {
      levelId: 2, questionType: 'keyAccidentals', key,
      text: 'C major key에는 조표가 붙나요?',
      hint: 'C major는 특별히 조표가 없습니다.',
      explanation: 'C major는 조표가 없습니다. 정답: 없음',
      answerList: [],
    }
  }
  return {
    levelId: 2, questionType: 'keyAccidentals', key,
    text: `${key} major key에는 어떤 조표가 붙나요?`,
    hint: `조표 순서를 떠올려보세요.`,
    explanation: `${key} major는 조표가 ${count}개 붙습니다.\n정답: ${sig.join(', ')}`,
    answerList: sig,
  }
}

function makeAccidentalCountQ(key: string): TutorialQuestion {
  const sig = KEY_SIGNATURES[key] ?? []
  const count = sig.length
  return {
    levelId: 2, questionType: 'accidentalCount', key,
    text: `${key} major key에는 조표가 몇 개 붙나요?`,
    hint: count === 0 ? 'C major는 조표가 없습니다.' : `${key} major의 조표 순서를 생각해보세요.`,
    explanation: count === 0 ? 'C major는 조표가 없습니다. 정답: 0개' : `${key} major는 조표가 ${count}개 붙습니다.`,
    answerCount: count,
  }
}

function makeKeyFromSignatureQ(key: string): TutorialQuestion {
  const sig = KEY_SIGNATURES[key] ?? []
  if (sig.length === 0) {
    return {
      levelId: 2, questionType: 'keyFromSignature', key,
      text: '조표가 없는 major key는 무엇인가요?',
      hint: '기준이 되는 key입니다.',
      explanation: '조표가 없는 major key는 C major입니다.',
      answer: 'C',
    }
  }
  return {
    levelId: 2, questionType: 'keyFromSignature', key,
    text: `조표가 ${sig.join(', ')}인 major key는 무엇인가요?`,
    hint: '조표의 수와 종류(flat/sharp)로 key를 알 수 있습니다.',
    explanation: `${sig.join(', ')}이 붙는 major key는 ${key} major입니다.`,
    answer: key,
  }
}

// ─── Level 3: Major Scale ─────────────────────────────────────────────────

function makeFullScaleQ(key: string): TutorialQuestion {
  const scale = getScale(key)
  const sig = KEY_SIGNATURES[key] ?? []
  return {
    levelId: 3, questionType: 'fullScale', key,
    text: `${key} major scale을 순서대로 입력하세요. (예: C D E F G A B)`,
    hint: `${key} major 조표: ${sig.length === 0 ? '없음' : sig.join(', ')}`,
    explanation: `${key} major scale: ${scale.join(' ')}`,
    answerList: scale,
  }
}

function makeScalePositionQ(key: string, position: number): TutorialQuestion {
  const scale = getScale(key)
  const note = scale[position - 1]
  const ordinals = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째']
  return {
    levelId: 3, questionType: 'scalePosition', key, degree: position,
    text: `${key} major scale의 ${ordinals[position - 1]} 음은 무엇인가요?`,
    hint: `${key} major scale: ${scale.join(' ')}`,
    explanation: `${key} major scale은 ${scale.join(' ')}입니다.\n${ordinals[position - 1]} 음(${position}도)은 ${note}입니다.`,
    answer: note,
  }
}

// ─── Level 4: Degree Note ─────────────────────────────────────────────────

function makeDegreeNoteQ(key: string, degree: number): TutorialQuestion {
  const scale = getScale(key)
  const note = scale[degree - 1]
  const labeled = scale.map((n, i) => `${n}(${i + 1})`).join(' ')
  return {
    levelId: 4, questionType: 'degreeNote', key, degree,
    text: `${key} major key에서 ${degree}도는 무엇인가요?`,
    hint: `${key} major scale: ${scale.join(' ')}`,
    explanation: `${key} major scale: ${labeled}\n따라서 ${degree}도는 ${note}입니다.\n\n공식: Key + 도수 = 음`,
    answer: note,
  }
}

// ─── Level 5: Chord Type Pattern ─────────────────────────────────────────

function makeChordTypeByDegreeQ(degree: number): TutorialQuestion {
  const quality = DIATONIC_7TH_QUALITIES[degree - 1]
  const exampleKeys = ['C', 'Bb', 'F']
  const examples = exampleKeys.map(k => getDiatonicChord(k, degree)).join(', ')
  return {
    levelId: 5, questionType: 'chordTypeByDegree', degree,
    text: `Major key에서 ${degree}도 7화음의 타입은 무엇인가요?`,
    hint: '1,4=maj7 | 2,3,6=m7 | 5=7 | 7=m7b5',
    explanation: `Major key에서 ${degree}도 7화음의 타입은 ${quality}입니다.\n예: ${examples}\n\n패턴: 1,4=maj7 | 2,3,6=m7 | 5=7 | 7=m7b5`,
    answer: quality,
  }
}

function makeProgressionChordTypesQ(progression: number[]): TutorialQuestion {
  const types = progression.map(d => DIATONIC_7TH_QUALITIES[d - 1] as string)
  const progText = progression.join(' - ')
  const steps = progression.map((d, i) => `${d}도 → ${types[i]}`).join('\n')
  return {
    levelId: 5, questionType: 'progressionChordTypes', progression,
    text: `${progText} 진행의 코드 타입을 순서대로 입력하세요. (예: m7 - 7 - maj7)`,
    hint: '1,4=maj7 | 2,3,6=m7 | 5=7 | 7=m7b5',
    explanation: `${progText} 진행의 코드 타입:\n${steps}\n\n정답: ${types.join(' - ')}`,
    answerList: types,
  }
}

// ─── Level 6: Degree Chord ────────────────────────────────────────────────

function makeDegreeChordQ(key: string, degree: number): TutorialQuestion {
  const note = getScaleDegree(key, degree)
  const quality = DIATONIC_7TH_QUALITIES[degree - 1]
  const chord = getDiatonicChord(key, degree)
  const scale = getScale(key)
  return {
    levelId: 6, questionType: 'degreeChord', key, degree,
    text: `${key} major key에서 ${degree}도 7화음은 무엇인가요?`,
    hint: `${key} major scale: ${scale.join(' ')}\n${degree}도 음: ${note} / 타입: ${quality}`,
    explanation: `${key} major의 ${degree}도:\n→ 음: ${note}  (Key+도수=음)\n→ 타입: ${quality}  (1,4=maj7|2,3,6=m7|5=7|7=m7b5)\n→ 코드: ${chord}  (음+타입=코드)`,
    answer: chord,
  }
}

// ─── Level 7: Numeric to Chord ────────────────────────────────────────────

function makeNumericToChordQ(key: string, progression: number[]): TutorialQuestion {
  const scale = getScale(key)
  const chords = progression.map(d => getDiatonicChord(key, d))
  const progText = progression.join(' - ')
  const labeled = scale.map((n, i) => `${n}(${i + 1})`).join(' ')
  const steps = progression.map((d, i) => {
    const n = getScaleDegree(key, d)
    const q = DIATONIC_7TH_QUALITIES[d - 1]
    return `${d} = ${n} → ${n}${q}`
  }).join('\n')
  return {
    levelId: 7, questionType: 'numericToChord', key, progression,
    text: `${key} major key에서 ${progText} 진행을 코드로 바꾸세요.\n(예: Bbmaj7 - F7 - Cm7)`,
    hint: `${key} major scale: ${labeled}\n각 도수의 음을 찾고 코드 타입을 붙이세요.`,
    explanation: `${key} major scale: ${scale.join(' ')}\n\n${steps}\n\n정답: ${chords.join(' - ')}\n\n공식: 숫자→음→코드`,
    answerList: chords,
  }
}

// ─── Level 8: Chord to Numeric ────────────────────────────────────────────

function makeChordToNumericQ(key: string, progression: number[]): TutorialQuestion {
  const chords = progression.map(d => getDiatonicChord(key, d))
  const scale = getScale(key)
  const labeled = scale.map((n, i) => `${n}(${i + 1})`).join(' ')
  const steps = chords.map((chord, i) => {
    const d = progression[i]
    return `${chord} → 루트 ${getScaleDegree(key, d)} → ${d}도`
  }).join('\n')
  return {
    levelId: 8, questionType: 'chordToNumeric', key, progression,
    text: `${key} major key에서\n${chords.join(' - ')}\n는 어떤 도수 진행인가요? (예: 1 - 4 - 5 - 3)`,
    hint: `${key} major scale: ${labeled}\n각 코드의 루트음이 scale에서 몇 번째인지 세어보세요.`,
    explanation: `${key} major scale: ${scale.join(' ')}\n\n${steps}\n\n정답: ${progression.join(' - ')}\n\n공식: 코드→루트음→Scale 위치=도수`,
    answerDegrees: progression,
  }
}

// ─── Question Set Builders ────────────────────────────────────────────────

function buildLevel1Qs(): TutorialQuestion[] {
  const positions = shuffle<[('flat' | 'sharp'), number]>([
    ['flat', 1], ['flat', 2], ['flat', 3], ['flat', 4],
    ['sharp', 1], ['sharp', 2], ['sharp', 3], ['sharp', 4],
  ])
  return [
    makeFlatOrderQ(),
    makeSharpOrderQ(),
    makeOrderPositionQ(positions[0][0], positions[0][1]),
    makeOrderPositionQ(positions[1][0], positions[1][1]),
    makeOrderPositionQ(positions[2][0], positions[2][1]),
  ]
}

function buildLevel2Qs(): TutorialQuestion[] {
  const keys = shuffle([...TUTORIAL_KEYS] as string[])
  const qs: TutorialQuestion[] = keys.map(makeKeyAccidentalsQ)
  return shuffle(qs)
}

function buildLevel3Qs(): TutorialQuestion[] {
  const keys = shuffle([...TUTORIAL_KEYS] as string[])
  const positions = shuffle([2, 3, 4, 5, 6, 7])
  return shuffle([
    makeFullScaleQ(keys[0]),
    makeFullScaleQ(keys[1]),
    makeFullScaleQ(keys[2]),
    makeFullScaleQ(keys[3]),
    makeScalePositionQ(keys[4], positions[0]),
    makeScalePositionQ(keys[5], positions[1]),
    makeScalePositionQ(keys[6], positions[2]),
    makeScalePositionQ(shuffle([...TUTORIAL_KEYS] as string[])[0], positions[3]),
  ])
}

function buildLevel4Qs(): TutorialQuestion[] {
  const easyKeys = ['C', 'F', 'G', 'Bb', 'D', 'Eb', 'A']
  const guaranteed = [1, 2, 3, 4, 5, 6, 7].map((d, i) => makeDegreeNoteQ(easyKeys[i], d))
  const usedCombos = new Set(easyKeys.map((k, i) => `${k}_${i + 1}`))
  const extra: TutorialQuestion[] = []
  while (extra.length < 3) {
    const key = weightedRandomKey()
    const degree = Math.floor(Math.random() * 7) + 1
    const combo = `${key}_${degree}`
    if (!usedCombos.has(combo)) {
      usedCombos.add(combo)
      extra.push(makeDegreeNoteQ(key, degree))
    }
  }
  return shuffle([...guaranteed, ...extra])
}

function buildLevel5Qs(): TutorialQuestion[] {
  const degrees = shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, 5)
  const progs = shuffle([...COMMON_PROGRESSIONS]).slice(0, 3)
  return shuffle([
    ...degrees.map(makeChordTypeByDegreeQ),
    ...progs.map(makeProgressionChordTypesQ),
  ])
}

function buildLevel6Qs(): TutorialQuestion[] {
  const easyKeys = ['C', 'F', 'G', 'Bb', 'D', 'Eb', 'A']
  const guaranteed = [1, 2, 3, 4, 5, 6, 7].map((d, i) => makeDegreeChordQ(easyKeys[i], d))
  const usedCombos = new Set(easyKeys.map((k, i) => `${k}_${i + 1}`))
  const extra: TutorialQuestion[] = []
  while (extra.length < 3) {
    const key = weightedRandomKey()
    const degree = Math.floor(Math.random() * 7) + 1
    const combo = `${key}_${degree}`
    if (!usedCombos.has(combo)) {
      usedCombos.add(combo)
      extra.push(makeDegreeChordQ(key, degree))
    }
  }
  return shuffle([...guaranteed, ...extra])
}

function buildLevel7Qs(): TutorialQuestion[] {
  const keyPool = shuffle([...TUTORIAL_KEYS, ...TUTORIAL_KEYS] as string[])
  const qs: TutorialQuestion[] = []
  let ki = 0
  while (qs.length < 8) {
    const prog = COMMON_PROGRESSIONS[qs.length % COMMON_PROGRESSIONS.length]
    const key = keyPool[ki++ % keyPool.length]
    if (!qs.some(q => q.key === key && q.progression?.join('') === prog.join(''))) {
      qs.push(makeNumericToChordQ(key, prog))
    } else {
      qs.push(makeNumericToChordQ(keyPool[(ki + 3) % keyPool.length], prog))
    }
  }
  return shuffle(qs)
}

function buildLevel8Qs(): TutorialQuestion[] {
  const keyPool = shuffle([...TUTORIAL_KEYS, ...TUTORIAL_KEYS] as string[])
  const qs: TutorialQuestion[] = []
  let ki = 0
  while (qs.length < 8) {
    const prog = COMMON_PROGRESSIONS[qs.length % COMMON_PROGRESSIONS.length]
    const key = keyPool[ki++ % keyPool.length]
    if (!qs.some(q => q.key === key && q.progression?.join('') === prog.join(''))) {
      qs.push(makeChordToNumericQ(key, prog))
    } else {
      qs.push(makeChordToNumericQ(keyPool[(ki + 3) % keyPool.length], prog))
    }
  }
  return shuffle(qs)
}

// ─── Public: question generation ─────────────────────────────────────────

export function getTutorialLevels(): TutorialLesson[] {
  return TUTORIAL_LESSONS
}

export function generateTutorialQuestions(levelId: number): TutorialQuestion[] {
  switch (levelId) {
    case 1: return buildLevel1Qs()
    case 2: return buildLevel2Qs()
    case 3: return buildLevel3Qs()
    case 4: return buildLevel4Qs()
    case 5: return buildLevel5Qs()
    case 6: return buildLevel6Qs()
    case 7: return buildLevel7Qs()
    case 8: return buildLevel8Qs()
    default: return []
  }
}

// ─── Answer Validation ────────────────────────────────────────────────────

function normalizeChordType(s: string): string {
  const t = s.trim().toLowerCase().replace(/\s+/g, '')
  if (t === 'maj7' || t === 'major7') return 'maj7'
  if (t === 'm7' || t === 'min7' || t === 'minor7') return 'm7'
  if (t === '7' || t === 'dom7' || t === 'dominant7') return '7'
  if (t === 'm7b5' || t === 'ø7' || t === 'halfdim' || t === 'm7♭5') return 'm7b5'
  return t
}

function parseChordList(input: string): string[] {
  return input.split(/\s*-\s*|\s*,\s*|\s+/).map(s => s.trim()).filter(Boolean)
}

function parseDegreesCompact(input: string): number[] | null {
  const t = input.trim()
  if (/^[1-7]+$/.test(t) && !t.includes(' ')) return t.split('').map(Number)
  return null
}

export function validateTutorialAnswer(question: TutorialQuestion, userInput: string): boolean {
  switch (question.questionType) {
    case 'flatOrder':
    case 'sharpOrder':
    case 'keyAccidentals':
      return validateAccidentalsAnswer(userInput, question.answerList ?? [])

    case 'orderPosition':
    case 'scalePosition':
    case 'degreeNote':
      return validateDegreeAnswer(userInput, question.answer ?? '')

    case 'accidentalCount':
      return validateAccidentalCountAnswer(userInput, question.answerCount ?? 0)

    case 'keyFromSignature':
      return validateKeyNameAnswer(userInput, question.answer ?? '')

    case 'fullScale':
      return validateScaleAnswer(userInput, question.answerList ?? [])

    case 'chordTypeByDegree':
      return normalizeChordType(userInput) === normalizeChordType(question.answer ?? '')

    case 'progressionChordTypes': {
      const expected = question.answerList ?? []
      const parsed = parseChordList(userInput).map(normalizeChordType)
      if (parsed.length !== expected.length) return false
      return parsed.every((t, i) => t === normalizeChordType(expected[i]))
    }

    case 'degreeChord':
      return validateChordAnswer(userInput, question.answer ?? '')

    case 'numericToChord': {
      const expected = question.answerList ?? []
      const parsed = parseChordList(userInput)
      if (parsed.length !== expected.length) return false
      return parsed.every((chord, i) => validateChordAnswer(chord, expected[i]))
    }

    case 'chordToNumeric': {
      const degrees = question.answerDegrees ?? []
      const compact = parseDegreesCompact(userInput)
      if (compact && compact.length === degrees.length) {
        return compact.every((d, i) => d === degrees[i])
      }
      return validateProgressionAnswer(userInput, degrees)
    }

    default:
      return false
  }
}

// ─── Progress Management ──────────────────────────────────────────────────

const DEFAULT_PROGRESS: TutorialProgress = {
  unlockedLevel: 1,
  completedLevels: [],
  scores: {},
  lastLevel: null,
  completed: false,
}

export function loadTutorialProgress(): TutorialProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS }
  try {
    const val = localStorage.getItem('keymaster_tutorialProgress')
    if (!val) return { ...DEFAULT_PROGRESS }
    return JSON.parse(val) as TutorialProgress
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function saveTutorialProgress(progress: TutorialProgress): void {
  try { localStorage.setItem('keymaster_tutorialProgress', JSON.stringify(progress)) } catch {}
}

export function isLevelUnlocked(levelId: number, progress: TutorialProgress): boolean {
  return levelId <= progress.unlockedLevel
}

export function isLevelCompleted(levelId: number, progress: TutorialProgress): boolean {
  return progress.completedLevels.includes(levelId)
}

export function completeTutorialLevel(
  levelId: number,
  correctCount: number,
  progress: TutorialProgress,
): TutorialProgress {
  const lesson = TUTORIAL_LESSONS.find(l => l.id === levelId)
  const passed = lesson ? correctCount >= lesson.passingScore : false

  const newCompleted = passed && !progress.completedLevels.includes(levelId)
    ? [...progress.completedLevels, levelId]
    : progress.completedLevels

  const newUnlocked = passed && levelId === progress.unlockedLevel && levelId < TUTORIAL_LESSONS.length
    ? progress.unlockedLevel + 1
    : progress.unlockedLevel

  const newScores = {
    ...progress.scores,
    [levelId]: Math.max(progress.scores[levelId] ?? 0, correctCount),
  }

  const allIds = TUTORIAL_LESSONS.map(l => l.id)
  const completed = allIds.every(id => newCompleted.includes(id))

  return {
    unlockedLevel: Math.max(progress.unlockedLevel, newUnlocked),
    completedLevels: newCompleted,
    scores: newScores,
    lastLevel: levelId,
    completed,
  }
}
