import type { QuizMode } from '../types/quiz'

// The learning ladder. `mode` is the internal id (used by question generation,
// validation, persistence, and tutorial links) and must NOT change. `step` is
// the display order — foundation → application — which is what the learner sees.
export type ModeGroup = '기초' | '중급' | '고급'

export interface ModeMeta {
  mode: QuizMode
  step: number
  group: ModeGroup
  label: string
  description: string
}

export const MODE_GROUPS: ModeGroup[] = ['기초', '중급', '고급']

export const MODE_LADDER: ModeMeta[] = [
  { mode: 5, step: 1, group: '기초', label: '조표',              description: '조표 순서 · 각 키의 조표 암기' },
  { mode: 3, step: 2, group: '기초', label: '도수 음',           description: 'Key + 도수 = 음' },
  { mode: 4, step: 3, group: '중급', label: '도수 코드',         description: '음 + 코드 타입 = 코드' },
  { mode: 1, step: 4, group: '중급', label: '진행 코드톤',       description: '숫자 진행 → 코드와 구성음' },
  { mode: 2, step: 5, group: '고급', label: '진행 분석',         description: '코드 진행 → 도수 진행' },
  { mode: 6, step: 6, group: '고급', label: '세컨더리 도미넌트', description: 'V7/x ↔ 타겟 코드' },
]

export const MODE_META: Record<QuizMode, ModeMeta> = Object.fromEntries(
  MODE_LADDER.map(m => [m.mode, m]),
) as Record<QuizMode, ModeMeta>

// New learners should start at the foundation, not mid-ladder.
export const DEFAULT_MODE: QuizMode = 5
