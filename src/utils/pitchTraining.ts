export type PitchMode = 'direction' | 'interval' | 'degree'
export type PitchLevel = 0 | 1 | 2
export interface PitchChoice { id: number; label: string; detail: string }
export interface PitchQuestion { mode: PitchMode; root: number; offset: number; answer: number; choices: PitchChoice[] }
export interface PitchResult { question: PitchQuestion; selected: number | null }
export interface PitchRecord { mode: PitchMode; level: PitchLevel; correct: number; total: number; date: string }

export const PITCH_MODES: { id: PitchMode; title: string; description: string; prompt: string }[] = [
  { id: 'direction', title: '높낮이', description: '두 번째 음이 어느 쪽으로 움직였는지 들어요.', prompt: '두 번째 음의 높이는?' },
  { id: 'interval', title: '음정', description: '첫 음에서 다음 음까지의 거리를 들어요.', prompt: '두 음 사이의 거리는?' },
  { id: 'degree', title: '계이름', description: '기준 도를 기억하고 조 안에서의 위치를 찾아요.', prompt: '기준 도에 대한 문제음의 계이름은?' },
]
export const PITCH_LEVELS: Record<PitchMode, string[]> = {
  direction: ['넓은 차이 · 5–12반음', '작은 차이 · 2–4반음', '미세한 차이 · 1–2반음'],
  interval: ['장3도 · 완전5도 · 옥타브', '장2도 · 장3도 · 완전4도 · 완전5도', '단2도부터 옥타브까지 7가지'],
  degree: ['도 · 미 · 솔', '도 · 레 · 미 · 솔 · 라', '도 · 레 · 미 · 파 · 솔 · 라 · 시'],
}
const intervals: PitchChoice[] = [
  { id: 1, label: '단2도', detail: '1반음' }, { id: 2, label: '장2도', detail: '2반음' },
  { id: 3, label: '단3도', detail: '3반음' }, { id: 4, label: '장3도', detail: '4반음' },
  { id: 5, label: '완전4도', detail: '5반음' }, { id: 7, label: '완전5도', detail: '7반음' },
  { id: 12, label: '옥타브', detail: '12반음' },
]
const degrees = ['도', '레', '미', '파', '솔', '라', '시'].map((label, index) => ({
  id: [0, 2, 4, 5, 7, 9, 11][index], label, detail: `${index + 1}도`,
}))

export function pitchChoices(mode: PitchMode, level: PitchLevel): PitchChoice[] {
  if (mode === 'direction') return [
    { id: -1, label: '더 낮아요', detail: '↓' }, { id: 0, label: '같아요', detail: '=' }, { id: 1, label: '더 높아요', detail: '↑' },
  ]
  const ids = mode === 'interval' ? [[4, 7, 12], [2, 4, 5, 7], [1, 2, 3, 4, 5, 7, 12]][level]
    : [[0, 4, 7], [0, 2, 4, 7, 9], [0, 2, 4, 5, 7, 9, 11]][level]
  return (mode === 'interval' ? intervals : degrees).filter(choice => ids.includes(choice.id))
}

// Complete shuffled answer sets give even coverage within a short session.
export function createPitchSession(mode: PitchMode, level: PitchLevel, random = Math.random): PitchQuestion[] {
  const choices = pitchChoices(mode, level)
  const answers: number[] = []
  while (answers.length < 10) {
    const batch = choices.map(choice => choice.id)
    for (let i = batch.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[batch[i], batch[j]] = [batch[j], batch[i]]
    }
    answers.push(...batch)
  }
  return answers.slice(0, 10).map(answer => {
    const distances = [[5, 7, 12], [2, 3, 4], [1, 2]][level]
    const offset = mode === 'direction' ? answer * distances[Math.floor(random() * distances.length)] : answer
    return { mode, root: 55 + Math.floor(random() * 12), offset, answer, choices }
  })
}

export function pitchNotes(question: PitchQuestion, answer = question.answer): number[] {
  const offset = question.mode === 'direction' ? answer * Math.abs(question.offset || 2) : answer
  return question.mode === 'degree'
    ? [question.root, question.root + 4, question.root + 7, question.root, question.root + offset]
    : [question.root, question.root + offset]
}

export function pitchFeedback(question: PitchQuestion): string {
  if (question.mode === 'direction') return question.offset === 0 ? '두 음의 높이가 같아요.'
    : `두 번째 음이 ${Math.abs(question.offset)}반음 더 ${question.offset > 0 ? '높아요' : '낮아요'}.`
  const choice = question.choices.find(item => item.id === question.answer)!
  return question.mode === 'interval' ? `${choice.label}는 ${question.offset}반음의 거리예요.`
    : `이 조의 도에서 ${question.offset}반음 위에 있는 ${choice.label}예요. 도는 문제마다 달라져요.`
}

export function missedQuestions(results: PitchResult[]): PitchQuestion[] {
  return results.filter(result => result.selected !== result.question.answer).map(result => result.question)
}

const STORAGE_KEY = 'keymaster_pitch_v1'
export function loadPitchRecords(): PitchRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is PitchRecord => item !== null && typeof item === 'object'
      && PITCH_MODES.some(mode => mode.id === item.mode) && [0, 1, 2].includes(item.level)
      && Number.isInteger(item.correct) && item.correct >= 0 && item.correct <= 10 && item.total === 10
      && typeof item.date === 'string' && Number.isFinite(Date.parse(item.date))).slice(0, 20)
  } catch { return [] }
}

export function savePitchRecord(record: PitchRecord): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...loadPitchRecords()].slice(0, 20)))
    return true
  } catch { return false }
}
