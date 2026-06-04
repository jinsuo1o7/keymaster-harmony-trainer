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
