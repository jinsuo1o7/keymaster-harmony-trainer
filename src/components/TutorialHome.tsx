'use client'
import type { TutorialProgress } from '@/src/types/quiz'
import { TUTORIAL_LESSONS } from '@/src/data/tutorialLessons'
import { isLevelUnlocked, isLevelCompleted } from '@/src/utils/tutorialUtils'

interface Props {
  progress: TutorialProgress
  onSelectLevel: (id: number) => void
}

export default function TutorialHome({ progress, onSelectLevel }: Props) {
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
        <h2 className="text-base font-semibold text-white">학습 로드맵</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          순서대로 따라가면 어떤 major key에서도<br />
          <span className="text-indigo-300 font-medium">Key + 도수 = 음 → 음 + 타입 = 코드</span>를<br />
          자동으로 떠올릴 수 있게 됩니다.
        </p>
        {progress.completed && (
          <div className="bg-green-950 border border-green-700 rounded-xl p-3 text-sm text-green-300 text-center font-medium">
            🎉 튜토리얼 완료! 이제 퀴즈 모드에 도전해보세요.
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
            <button
              key={lesson.id}
              onClick={() => unlocked && onSelectLevel(lesson.id)}
              disabled={!unlocked}
              className={`w-full text-left rounded-2xl p-4 transition-colors ${
                !unlocked
                  ? 'bg-gray-800 opacity-50 cursor-not-allowed'
                  : isCurrent
                  ? 'bg-indigo-950 border border-indigo-600 hover:bg-indigo-900'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  completed
                    ? 'bg-green-700 text-green-100'
                    : isCurrent
                    ? 'bg-indigo-700 text-indigo-100'
                    : unlocked
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-700 text-gray-600'
                }`}>
                  {completed ? '✓' : !unlocked ? '🔒' : lesson.id}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${!unlocked ? 'text-gray-600' : 'text-white'}`}>
                      {lesson.title}
                    </span>
                    {isCurrent && (
                      <span className="text-xs bg-indigo-700 text-indigo-200 px-1.5 py-0.5 rounded-full">진행중</span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${!unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
                    {lesson.shortDescription}
                  </p>
                </div>

                {/* Score */}
                {unlocked && (
                  <div className="text-right shrink-0">
                    {bestScore !== null ? (
                      <div className="text-xs">
                        <span className={`font-bold ${bestScore >= lesson.passingScore ? 'text-green-400' : 'text-yellow-400'}`}>
                          {bestScore}
                        </span>
                        <span className="text-gray-600">/{lesson.totalQuestions}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">미시작</span>
                    )}
                    <div className="text-xs text-gray-600">기준 {lesson.passingScore}개</div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Overall progress */}
      <div className="bg-gray-800 rounded-xl p-3">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>전체 진행</span>
          <span>{progress.completedLevels.length} / {TUTORIAL_LESSONS.length} 완료</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${(progress.completedLevels.length / TUTORIAL_LESSONS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
