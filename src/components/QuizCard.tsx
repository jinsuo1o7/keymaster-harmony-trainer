'use client'
import { useState, useEffect } from 'react'
import type { Question, QuizResult } from '@/src/types/quiz'
import {
  validateDegreeAnswer,
  validateChordAnswer,
  validateProgressionAnswer,
  validateAccidentalsAnswer,
  validateAccidentalCountAnswer,
  validateScaleAnswer,
  validateKeyNameAnswer,
} from '@/src/utils/answerValidation'

interface QuizCardProps {
  question: Question
  result: QuizResult | null
  hintUsed: boolean
  onHint: () => void
  onAnswer: (correct: boolean, explanation: string) => void
  onNext: () => void
}

export default function QuizCard({
  question,
  result,
  hintUsed,
  onHint,
  onAnswer,
  onNext,
}: QuizCardProps) {
  const [userInput, setUserInput] = useState('')
  const [mode1Inputs, setMode1Inputs] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    setUserInput('')
    setShowHint(false)
    if (question.chordAnswers) {
      setMode1Inputs(question.chordAnswers.map(() => ''))
    }
  }, [question])

  function handleHint() {
    setShowHint(true)
    onHint()
  }

  function checkAnswer(): { correct: boolean; explanation: string } {
    const expl = question.explanation

    if (question.mode === 1 && question.chordAnswers) {
      const allCorrect = mode1Inputs.every((input, i) =>
        validateChordAnswer(input, question.chordAnswers![i].chordName)
      )
      return { correct: allCorrect, explanation: expl }
    }

    if (question.mode === 2 && question.answerDegrees) {
      return { correct: validateProgressionAnswer(userInput, question.answerDegrees), explanation: expl }
    }

    if (question.mode === 3 && question.answer !== undefined) {
      return { correct: validateDegreeAnswer(userInput, question.answer), explanation: expl }
    }

    if (question.mode === 4 && question.answer !== undefined) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation: expl }
    }

    if (question.mode === 5) {
      // type C: key name answer
      if (question.answer !== undefined) {
        return { correct: validateKeyNameAnswer(userInput, question.answer), explanation: expl }
      }
      // type B: count only (no answerList)
      if (question.answerCount !== undefined && question.answerList === undefined) {
        return { correct: validateAccidentalCountAnswer(userInput, question.answerCount), explanation: expl }
      }
      // type A (accidentals) or type D (scale): answerList only
      if (question.answerList !== undefined) {
        const isScale = question.text.includes('scale')
        if (isScale) {
          return { correct: validateScaleAnswer(userInput, question.answerList), explanation: expl }
        }
        return { correct: validateAccidentalsAnswer(userInput, question.answerList), explanation: expl }
      }
    }

    return { correct: false, explanation: expl }
  }

  function handleSubmit() {
    if (result) return
    const { correct, explanation } = checkAnswer()
    onAnswer(correct, explanation)
  }

  function handleMode1Change(idx: number, value: string) {
    setMode1Inputs(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  const answered = result !== null
  const hintVisible = showHint || hintUsed

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-4">
      {/* Mode badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
          모드 {question.mode}
        </span>
        <span className="text-xs text-gray-500 font-mono">{question.key} key</span>
      </div>

      {/* Question text */}
      <div className="text-base font-medium text-white leading-relaxed">
        {question.text}
      </div>

      {/* Hint */}
      {hintVisible && (
        <div className="bg-blue-950 border border-blue-700 rounded-xl p-3 text-sm text-blue-200 whitespace-pre-line">
          💡 {question.hint}
        </div>
      )}

      {/* Mode 1: chord name per degree */}
      {question.mode === 1 && question.chordAnswers && (
        <div className="space-y-2">
          {question.chordAnswers.map((ca, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-gray-400 text-sm w-4 shrink-0 text-center">{ca.degree}</span>
              <input
                type="text"
                placeholder="코드명 (예: Cm7)"
                value={mode1Inputs[i] ?? ''}
                onChange={e => handleMode1Change(i, e.target.value)}
                disabled={answered}
                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Other modes: single input */}
      {question.mode !== 1 && (
        <input
          type="text"
          placeholder="답을 입력하세요"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !answered) handleSubmit() }}
          disabled={answered}
          className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!answered && (
          <>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              제출
            </button>
            {!hintVisible && (
              <button
                onClick={handleHint}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2.5 px-4 rounded-xl transition-colors"
              >
                힌트 (-5점)
              </button>
            )}
          </>
        )}
        {answered && (
          <button
            onClick={onNext}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            다음 문제 →
          </button>
        )}
      </div>
    </div>
  )
}
