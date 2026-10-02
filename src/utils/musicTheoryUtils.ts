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

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, 'E#': 5, Fb: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, 'B#': 0, Cb: 11,
}
const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// 완전 5도 위 음을 음이름(letter) 기준으로 철자한다.
// 5도 위 = 음이름 4칸 위, 반음차로 임시표(#/b/x/bb)를 붙여 정확한 표기를 만든다.
// (예: A# → E#, Gb → Db) 열두 키 전체에서 이명동음 오표기 없이 동작한다.
function p5Above(note: string): string {
  const letterIdx = LETTER_ORDER.indexOf(note[0])
  const targetLetter = LETTER_ORDER[(letterIdx + 4) % 7]
  const targetSemitone = ((NOTE_SEMITONES[note] ?? 0) + 7) % 12
  const diff = ((targetSemitone - NATURAL_SEMITONES[targetLetter]) % 12 + 12) % 12
  const accidental =
    diff === 0 ? '' : diff === 1 ? '#' : diff === 11 ? 'b' : diff === 2 ? 'x' : diff === 10 ? 'bb' : ''
  return targetLetter + accidental
}

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

function randomDegree(min = 1): number {
  return Math.floor(Math.random() * (8 - min)) + min
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
    .map(ca => `${ca.degree} = ${ca.chordName}`)
    .join('\n')

  return {
    mode: 1,
    key,
    text: `${key} key에서 ${progressionText} 진행의 코드명을 적어주세요.`,
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
  const degree = randomDegree(2)
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

  const hint =
    `flat key의 조표 순서: ${FLAT_ORDER.join(' → ')}\n` +
    `sharp key의 조표 순서: ${SHARP_ORDER.join(' → ')}`

  if (count === 0) {
    return {
      mode: 5,
      key,
      text: `C major key에는 어떤 조표가 붙나요?`,
      hint,
      explanation: `C major는 조표가 없습니다. 정답: 없음`,
      answerList: [],
    }
  }
  return {
    mode: 5,
    key,
    text: `${key} major key에는 어떤 조표가 붙나요?`,
    hint,
    explanation: `${key} major는 조표가 ${count}개 붙습니다.\n정답: ${sig.join(', ')}`,
    answerList: sig,
  }
}

const SEC_DOM_DEGREES = [2, 3, 4, 5, 6] as const

export function generateSecondaryDominantQuestion(key: string): Question {
  const degree = randomItem([...SEC_DOM_DEGREES])
  const targetRoot = getScaleDegree(key, degree)
  const dominantRoot = p5Above(targetRoot)
  const dominant = dominantRoot + '7'
  const target = getDiatonicChord(key, degree)

  const degreeNames: Record<number, string> = {
    2: 'ii도', 3: 'iii도', 4: 'IV도', 5: 'V도', 6: 'vi도',
  }
  const degreeName = degreeNames[degree] ?? `${degree}도`

  if (Math.random() < 0.5) {
    // Subtype A: given the target, find its secondary dominant
    return {
      mode: 6,
      key,
      text: `${key}키에서 ___ → ${target} (${degreeName})의 세컨더리 도미넌트는?`,
      hint: `${target}의 루트 ${targetRoot}에서 완전 5도 위의 음을 찾으세요`,
      explanation: `완전 5도 위: ${targetRoot} → ${dominantRoot}\n세컨더리 도미넌트: ${dominant} → ${target} (V7/${degreeName} in ${key})`,
      answer: dominant,
    }
  } else {
    // Subtype B: given the secondary dominant, find the target it resolves to
    return {
      mode: 6,
      key,
      text: `${key}키에서 ${dominant} → ___ 로 해결됩니다. 타겟 코드는? (${degreeName})`,
      hint: `${dominant}은 어떤 코드의 V7인가요? (${dominantRoot}에서 완전 4도 아래 = ${targetRoot})`,
      explanation: `${dominant}은 ${target}의 세컨더리 도미넌트 (V7/${degreeName})\n${dominant} → ${target} (${key} key 기준)`,
      answer: target,
    }
  }
}

export function generateQuestionForKey(mode: QuizMode, key: string): Question {
  switch (mode) {
    case 1: return generateProgressionQuestion(key)
    case 2: return generateProgressionAnalysisQuestion(key)
    case 3: return generateDegreeNoteQuestion(key)
    case 4: return generateDegreeChordQuestion(key)
    case 5: return generateKeySignatureQuestion(key)
    case 6: return generateSecondaryDominantQuestion(key)
  }
}

export function generateQuestion(mode: QuizMode, selectedKeys: string[]): Question {
  const keys = selectedKeys.length > 0 ? selectedKeys : KEY_GROUPS.all
  return generateQuestionForKey(mode, randomItem(keys))
}
