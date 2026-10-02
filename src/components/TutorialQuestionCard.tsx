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

  useEffect(() => {
    if (result === null) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result, onNext])

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
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>문제 {questionNum} / {totalQuestions}</span>
        <span>
          맞힌 수: <span className={`font-bold ${correctCount >= passingScore ? 'text-success-bright' : 'text-fg'}`}>{correctCount}</span>
          {' / '}
          <span className="text-muted">{passingScore}개 이상 통과</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-2 rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${((questionNum - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="text-base font-medium text-fg leading-relaxed whitespace-pre-line">
        {question.text}
      </div>

      {/* Key badge */}
      {question.key && (
        <span className="inline-block text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full font-mono">
          {question.key} key
        </span>
      )}

      {/* Hint */}
      {hintShown && (
        <div className="bg-surface-2 border border-border rounded-xl p-3 text-sm text-muted whitespace-pre-line">
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
          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-fg placeholder-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      )}

      {/* Result feedback */}
      {answered && (
        <div className={`rounded-xl p-3 space-y-2 animate-reveal ${result ? 'bg-success/10 border border-success/40 glow-success' : 'bg-danger/10 border border-danger/40 glow-danger'}`}>
          <div className={`font-semibold text-sm ${result ? 'text-success-bright' : 'text-danger-bright'}`}>
            {result ? '✓ 정답!' : '✗ 오답'}
          </div>
          <p className="text-sm text-muted whitespace-pre-line">{question.explanation}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!answered && (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 px-4 rounded-xl glow-primary transition-all active:scale-[.98]"
            >
              제출
            </button>
            {!hintShown && (
              <button
                onClick={() => setHintShown(true)}
                className="bg-surface-2 hover:bg-border text-muted font-medium py-2.5 px-4 rounded-xl transition-colors"
              >
                힌트
              </button>
            )}
          </>
        )}
        {answered && (
          <button
            onClick={onNext}
            className="flex-1 bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 px-4 rounded-xl glow-primary transition-all active:scale-[.98]"
          >
            {questionNum < totalQuestions ? '다음 문제 →' : '결과 보기 →'}
          </button>
        )}
      </div>

      {/* Pass warning */}
      {!answered && !canPass && (
        <p className="text-xs text-center text-danger-bright">
          남은 문제를 모두 맞혀도 통과 기준({passingScore}개)에 미달합니다.
        </p>
      )}
    </div>
  )
}
