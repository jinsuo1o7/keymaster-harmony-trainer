'use client'
import { useState, useEffect } from 'react'
import type { TutorialQuestion, TutorialProgress } from '@/src/types/quiz'
import { TUTORIAL_LESSONS } from '@/src/data/tutorialLessons'
import { generateTutorialQuestions, completeTutorialLevel } from '@/src/utils/tutorialUtils'
import TutorialLessonCard from './TutorialLessonCard'
import TutorialQuestionCard from './TutorialQuestionCard'
import TutorialCompletionPanel from './TutorialCompletionPanel'

type Phase = 'study' | 'practice' | 'complete'

interface Props {
  levelId: number
  progress: TutorialProgress
  onComplete: (levelId: number, correctCount: number, newProgress: TutorialProgress) => void
  onBack: () => void
}

export default function TutorialLevel({ levelId, progress, onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('study')
  const [questions, setQuestions] = useState<TutorialQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const lesson = TUTORIAL_LESSONS.find(l => l.id === levelId)!
  const nextLesson = TUTORIAL_LESSONS.find(l => l.id === levelId + 1)

  useEffect(() => {
    setPhase('study')
    setCurrentIdx(0)
    setCorrectCount(0)
    setQuestions([])
  }, [levelId])

  function startPractice() {
    const qs = generateTutorialQuestions(levelId)
    setQuestions(qs)
    setCurrentIdx(0)
    setCorrectCount(0)
    setPhase('practice')
  }

  function handleAnswer(correct: boolean) {
    if (correct) setCorrectCount(c => c + 1)
  }

  function handleNext() {
    if (currentIdx + 1 >= questions.length) {
      setPhase('complete')
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleComplete() {
    const newProgress = completeTutorialLevel(levelId, correctCount, progress)
    onComplete(levelId, correctCount, newProgress)
  }

  function handleRetry() {
    startPractice()
  }

  function handleNextLevel() {
    handleComplete()
  }

  const passed = correctCount >= lesson.passingScore
  const isFinalLevel = levelId === TUTORIAL_LESSONS.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { handleComplete(); onBack() }}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← 목록
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              Level {levelId}
            </span>
            <h2 className="text-sm font-semibold text-white">{lesson.title}</h2>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {phase === 'practice' ? `${currentIdx + 1}/${questions.length}` : ''}
        </span>
      </div>

      {/* Phase: Study */}
      {phase === 'study' && (
        <TutorialLessonCard lesson={lesson} onStart={startPractice} />
      )}

      {/* Phase: Practice */}
      {phase === 'practice' && questions.length > 0 && (
        <TutorialQuestionCard
          key={currentIdx}
          question={questions[currentIdx]}
          questionNum={currentIdx + 1}
          totalQuestions={questions.length}
          correctCount={correctCount}
          passingScore={lesson.passingScore}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      )}

      {/* Phase: Complete */}
      {phase === 'complete' && (
        <TutorialCompletionPanel
          correctCount={correctCount}
          totalQuestions={questions.length}
          passingScore={lesson.passingScore}
          passed={passed}
          nextLevelTitle={nextLesson?.title}
          isFinalLevel={isFinalLevel}
          onNext={handleNextLevel}
          onRetry={handleRetry}
          onBack={() => { handleComplete(); onBack() }}
        />
      )}

      {/* Study phase: pass condition reminder */}
      {phase === 'study' && (
        <div className="text-xs text-gray-500 text-center">
          통과 조건: {lesson.totalQuestions}문제 중 {lesson.passingScore}개 이상 정답
        </div>
      )}
    </div>
  )
}
