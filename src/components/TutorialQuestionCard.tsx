'use client'
import { useState, useEffect } from 'react'
import type { TutorialQuestion } from '@/src/types/quiz'
import { validateTutorialAnswer } from '@/src/utils/tutorialUtils'

interface Props {
  question: TutorialQuestion
  questionNum: number
  totalQuestions: number
  correctCount: number
  passingScore: number
  onAnswer: (correct: boolean) => void
  onNext: () => void
}

export default function TutorialQuestionCard({
  question,
  questionNum,
  totalQuestions,
  correctCount,
  passingScore,
  onAnswer,
  onNext,
}: Props) {
  const [userInput, setUserInput] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const [hintShown, setHintShown] = useState(false)

  useEffect(() => {
    setUserInput('')
    setResult(null)
    setHintShown(false)
  }, [question])

  function handleSubmit() {
    if (result !== null) return
    const correct = validateTutorialAnswer(question, userInput)
    setResult(correct)
    onAnswer(correct)
  }

  const answered = result !== null
  const remaining = totalQuestions - questionNum
  const canPass = correctCount + remaining >= passingScore

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>문제 {questionNum} / {totalQuestions}</span>
        <span>
          맞힌 수: <span className={`font-bold ${correctCount >= passingScore ? 'text-green-400' : 'text-white'}`}>{correctCount}</span>
          {' / '}
          <span className="text-yellow-400">{passingScore}개 이상 통과</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-purple-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((questionNum - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="text-base font-medium text-white leading-relaxed whitespace-pre-line">
        {question.text}
      </div>

      {/* Key badge */}
      {question.key && (
        <span className="inline-block text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-mono">
          {question.key} key
        </span>
      )}

      {/* Hint */}
      {hintShown && (
        <div className="bg-blue-950 border border-blue-700 rounded-xl p-3 text-sm text-blue-200 whitespace-pre-line">
          💡 {question.hint}
        </div>
      )}

      {/* Input */}
      {!answered && (
        <input
          type="text"
          placeholder="답을 입력하세요"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          autoFocus
          className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      )}

      {/* Result feedback */}
      {answered && (
        <div className={`rounded-xl p-3 space-y-2 ${result ? 'bg-green-950 border border-green-700' : 'bg-red-950 border border-red-700'}`}>
          <div className={`font-semibold text-sm ${result ? 'text-green-400' : 'text-red-400'}`}>
            {result ? '✓ 정답!' : '✗ 오답'}
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-line">{question.explanation}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!answered && (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              제출
            </button>
            {!hintShown && (
              <button
                onClick={() => setHintShown(true)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 px-4 rounded-xl transition-colors"
              >
                힌트
              </button>
            )}
          </>
        )}
        {answered && (
          <button
            onClick={onNext}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            {questionNum < totalQuestions ? '다음 문제 →' : '결과 보기 →'}
          </button>
        )}
      </div>

      {/* Pass warning */}
      {!answered && !canPass && (
        <p className="text-xs text-center text-red-400">
          남은 문제를 모두 맞혀도 통과 기준({passingScore}개)에 미달합니다.
        </p>
      )}
    </div>
  )
}
