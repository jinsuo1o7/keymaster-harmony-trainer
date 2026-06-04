'use client'

interface Props {
  correctCount: number
  totalQuestions: number
  passingScore: number
  passed: boolean
  nextLevelTitle?: string
  isFinalLevel: boolean
  onNext: () => void
  onRetry: () => void
  onBack: () => void
}

export default function TutorialCompletionPanel({
  correctCount,
  totalQuestions,
  passingScore,
  passed,
  nextLevelTitle,
  isFinalLevel,
  onNext,
  onRetry,
  onBack,
}: Props) {
  const pct = Math.round((correctCount / totalQuestions) * 100)

  if (isFinalLevel && passed) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 space-y-5 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-white">튜토리얼 완료!</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          축하합니다! 이제 major key에서<br />
          도수를 코드로 바꾸는 기본 흐름을 이해했습니다.
        </p>
        <div className="bg-indigo-950 border border-indigo-700 rounded-xl p-4 text-sm font-mono text-indigo-200">
          조표 → 스케일 → 도수 → 코드 타입 → 코드 진행
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <ScoreStat label="맞힌 수" value={`${correctCount}/${totalQuestions}`} />
          <ScoreStat label="정답률" value={`${pct}%`} />
          <ScoreStat label="기준" value={`${passingScore}/${totalQuestions}`} />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={onRetry} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 rounded-xl transition-colors">
            다시 연습하기
          </button>
          <button onClick={onBack} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors">
            튜토리얼 목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 space-y-5">
      {/* Result header */}
      <div className={`text-center py-3 rounded-xl ${passed ? 'bg-green-950 border border-green-700' : 'bg-red-950 border border-red-700'}`}>
        <div className="text-3xl mb-1">{passed ? '🎯' : '💪'}</div>
        <p className={`font-bold text-lg ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? '레벨 통과!' : '아직 조금 더!'}
        </p>
        {passed && nextLevelTitle && (
          <p className="text-sm text-green-300 mt-1">다음 레벨 해금: {nextLevelTitle}</p>
        )}
      </div>

      {/* Score */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <ScoreStat label="맞힌 수" value={`${correctCount}/${totalQuestions}`} />
        <ScoreStat label="정답률" value={`${pct}%`} />
        <ScoreStat label="기준" value={`${passingScore}/${totalQuestions}`} />
      </div>

      {!passed && (
        <p className="text-sm text-gray-400 text-center">
          {passingScore}개 이상 정답이면 다음 레벨이 해금됩니다. ({correctCount}/{passingScore})
        </p>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {passed && !isFinalLevel && (
          <button onClick={onNext} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
            다음 레벨로 →
          </button>
        )}
        <button onClick={onRetry} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 rounded-xl transition-colors">
          다시 연습하기
        </button>
        <button onClick={onBack} className="w-full text-gray-500 hover:text-gray-300 font-medium py-2 rounded-xl transition-colors text-sm">
          ← 튜토리얼 목록
        </button>
      </div>
    </div>
  )
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-700 rounded-xl py-3 px-2">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}
