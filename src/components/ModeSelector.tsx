import type { QuizMode } from '@/src/types/quiz'
import { MODE_GROUPS, MODE_LADDER } from '@/src/data/quizModes'

interface ModeSelectorProps {
  selectedMode: QuizMode
  onModeChange: (mode: QuizMode) => void
}

export default function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <p className="text-xs text-muted font-medium uppercase tracking-wide">
        연습 모드 <span className="text-faint normal-case">· 학습 단계 순</span>
      </p>

      {MODE_GROUPS.map(group => (
        <div key={group} className="space-y-1.5">
          <p className="text-[11px] text-faint font-semibold uppercase tracking-wider">{group}</p>
          <div className="grid grid-cols-2 gap-2">
            {MODE_LADDER.filter(m => m.group === group).map(({ mode, step, label, description }) => (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                title={description}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors text-center ${
                  selectedMode === mode
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div className="text-xs opacity-60 mb-0.5">STEP {step}</div>
                <div>{label}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
