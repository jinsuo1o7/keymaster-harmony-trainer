const EMPTY_ANSWERS = new Set([
  '없음', '0', '0개', 'none', 'no accidentals',
  '없음.', '없음!', '없습니다', '없어요',
])

/** Normalize a note name: "bb" → "Bb", "f#" → "F#", "db" → "Db" */
export function normalizeNote(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''

  // "b flat" / "e flat" style
  const flatWordMatch = trimmed.match(/^([a-gA-G])\s+flat$/i)
  if (flatWordMatch) return flatWordMatch[1].toUpperCase() + 'b'

  // "f sharp" / "g sharp" style
  const sharpWordMatch = trimmed.match(/^([a-gA-G])\s+sharp$/i)
  if (sharpWordMatch) return sharpWordMatch[1].toUpperCase() + '#'

  // Single letter natural note
  if (/^[a-gA-G]$/.test(trimmed)) return trimmed.toUpperCase()

  // Note + flat: "bb", "Bb", "eb", "Eb", "ab", "Ab", "db", "Db"
  if (/^[a-gA-G][bB]$/.test(trimmed)) return trimmed[0].toUpperCase() + 'b'

  // Note + sharp: "f#", "F#", "c#", "C#"
  if (/^[a-gA-G]#$/.test(trimmed)) return trimmed[0].toUpperCase() + '#'

  return trimmed
}

/** Normalize a chord name: "bbmaj7" → "Bbmaj7", "cm7" → "Cm7", "f7" → "F7" */
export function normalizeChord(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) return ''

  // Match: root letter + optional accidental (b or #) + quality suffix
  const match = trimmed.match(/^([a-gA-G])([b#])?(.*)$/i)
  if (!match) return trimmed

  const root = match[1].toUpperCase()
  const acc = match[2] ?? ''
  const quality = (match[3] ?? '').toLowerCase()
  return root + acc + quality
}

/** Normalize a key name: "bb major" → "Bb", "B flat" → "Bb", "Ebmaj" → "Eb" */
export function normalizeKeyName(input: string): string {
  const trimmed = input.trim()

  // Remove trailing major/maj/key (case insensitive)
  const cleaned = trimmed
    .replace(/\s*(major|maj|key)\s*$/i, '')
    .trim()

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
 * Accepts numeric "2-5-1", numeric with spaces "2 5 1",
 * and roman "ii-V-i" / "ii V i" (case insensitive).
 */
export function validateProgressionAnswer(
  userAnswer: string,
  correctDegrees: number[],
): boolean {
  const rawParts = userAnswer.trim().split(/[\s\-]+/).filter(s => s.length > 0)
  if (rawParts.length !== correctDegrees.length) return false

  const romanToNum: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
  }

  return rawParts.every((part, idx) => {
    const num = parseInt(part, 10)
    if (!isNaN(num)) return num === correctDegrees[idx]
    return (romanToNum[part.toLowerCase()] ?? -1) === correctDegrees[idx]
  })
}

/**
 * Validate mode 5 type A: list of accidentals.
 * Empty list (C major) accepts: "없음", "0", "none", etc.
 */
export function validateAccidentalsAnswer(
  userAnswer: string,
  correctAccidentals: string[],
): boolean {
  const trimmed = userAnswer.trim().toLowerCase()
  if (correctAccidentals.length === 0) {
    return EMPTY_ANSWERS.has(trimmed) || trimmed === '' || trimmed === '0'
  }
  const parsed = parseNoteList(userAnswer)
  if (parsed.length !== correctAccidentals.length) return false
  const normalized = correctAccidentals.map(normalizeNote)
  return (
    parsed.every(n => normalized.includes(n)) &&
    normalized.every(n => parsed.includes(n))
  )
}

/** Validate mode 5 type B: count of accidentals. */
export function validateAccidentalCountAnswer(
  userAnswer: string,
  correctCount: number,
): boolean {
  const trimmed = userAnswer.trim().toLowerCase()
  if (correctCount === 0 && EMPTY_ANSWERS.has(trimmed)) return true
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (digits === '') return false
  return parseInt(digits, 10) === correctCount
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
