'use client'
import { Fragment } from 'react'
import type { TutorialProgress } from '@/src/types/quiz'
import { TUTORIAL_LESSONS } from '@/src/data/tutorialLessons'
import { isLevelUnlocked, isLevelCompleted } from '@/src/utils/tutorialUtils'

interface Props {
  progress: TutorialProgress
  onSelectLevel: (id: number) => void
}

// Phase headers shown before the first lesson of each group (matches the
// practice tab's 기초/중급/고급 ladder).
const GROUP_STARTS: Record<number, string> = {
  1: '기초 · 음과 조표',
  5: '중급 · 코드 만들기',
  7: '고급 · 진행 분석·응용',
}

export default function TutorialHome({ progress, onSelectLevel }: Props) {
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
        <h2 className="text-base font-semibold text-fg">학습 로드맵</h2>
        <p className="text-sm text-muted leading-relaxed">
          순서대로 따라가면 어떤 major key에서도<br />
          <span className="text-primary-bright font-medium">Key + 도수 = 음 → 음 + 타입 = 코드</span>를<br />
          자동으로 떠올릴 수 있게 됩니다.
        </p>
        {progress.completed && (
          <div className="bg-success/10 border border-success/40 rounded-xl p-3 text-sm text-success-bright text-center font-medium glow-success">
            🎉 튜토리얼 완료! 이제 연습 탭에서 실력을 다져보세요.
          </div>
        )}
      </div>

      {/* Level list */}
      <div className="space-y-2">
        {TUTORIAL_LESSONS.map(lesson => {
          const unlocked = isLevelUnlocked(lesson.id, progress)
          const completed = isLevelCompleted(lesson.id, progress)
          const isCurrent = lesson.id === progress.unlockedLevel && !completed
          const bestScore = progress.scores[lesson.id] ?? null

          return (
            <Fragment key={lesson.id}>
              {GROUP_STARTS[lesson.id] && (
                <p className="text-[11px] text-faint font-semibold uppercase tracking-wider pt-2 first:pt-0">
                  {GROUP_STARTS[lesson.id]}
                </p>
              )}
            <button
              onClick={() => unlocked && onSelectLevel(lesson.id)}
              disabled={!unlocked}
              className={`w-full text-left rounded-2xl p-4 transition-colors ${
                !unlocked
                  ? 'bg-surface border border-border opacity-50 cursor-not-allowed'
                  : isCurrent
                  ? 'bg-primary/10 border border-primary/50 hover:bg-primary/15'
                  : 'bg-surface border border-border hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  completed
                    ? 'bg-success text-bg'
                    : isCurrent
                    ? 'bg-primary text-bg'
                    : unlocked
                    ? 'bg-surface-2 text-muted'
                    : 'bg-surface-2 text-faint'
                }`}>
                  {completed ? '✓' : !unlocked ? '🔒' : lesson.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${!unlocked ? 'text-faint' : 'text-fg'}`}>
                      {lesson.title}
                    </span>
                    {isCurrent && (
                      <span className="text-xs bg-primary/20 text-primary-bright px-1.5 py-0.5 rounded-full">진행중</span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${!unlocked ? 'text-faint' : 'text-muted'}`}>
                    {lesson.shortDescription}
                  </p>
                </div>

                {/* Score */}
                {unlocked && (
                  <div className="text-right shrink-0">
                    {bestScore !== null ? (
                      <div className="text-xs">
                        <span className={`font-bold ${bestScore >= lesson.passingScore ? 'text-success-bright' : 'text-muted'}`}>
                          {bestScore}
                        </span>
                        <span className="text-faint">/{lesson.totalQuestions}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-faint">미시작</span>
                    )}
                    <div className="text-xs text-faint">기준 {lesson.passingScore}개</div>
                  </div>
                )}
              </div>
            </button>
            </Fragment>
          )
        })}
      </div>

      {/* Overall progress */}
      <div className="bg-surface border border-border rounded-xl p-3">
        <div className="flex justify-between text-xs text-muted mb-2">
          <span>전체 진행</span>
          <span>{progress.completedLevels.length} / {TUTORIAL_LESSONS.length} 완료</span>
        </div>
        <div className="w-full bg-surface-2 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary to-primary-bright h-2 rounded-full transition-all"
            style={{ width: `${(progress.completedLevels.length / TUTORIAL_LESSONS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
