'use client'
import { useState, useEffect, useRef } from 'react'
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
  const mode1Refs = useRef<(HTMLInputElement | null)[]>([])
  const singleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setUserInput('')
    setShowHint(false)
    if (question.chordAnswers) {
      setMode1Inputs(question.chordAnswers.map(() => ''))
      setTimeout(() => mode1Refs.current[0]?.focus(), 0)
    } else {
      setTimeout(() => singleInputRef.current?.focus(), 0)
    }
  }, [question])

  useEffect(() => {
    if (!result) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result, onNext])

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

    if (question.mode === 6 && question.answer !== undefined) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation: expl }
    }

    return { correct: false, explanation: expl }
  }

  function handleSubmit() {
    if (result) return
    const { correct, explanation } = checkAnswer()
    onAnswer(correct, explanation)
  }

  function handleMode1Change(idx: number, value: string) {
    const total = question.chordAnswers?.length ?? 0
    if (value.endsWith(' ') && value.trim() !== '') {
      setMode1Inputs(prev => {
        const next = [...prev]
        next[idx] = value.trim()
        return next
      })
      if (idx < total - 1) {
        mode1Refs.current[idx + 1]?.focus()
      }
      return
    }
    setMode1Inputs(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  function handleMode1KeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    const total = question.chordAnswers?.length ?? 0
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < total - 1) {
        mode1Refs.current[idx + 1]?.focus()
      } else if (!answered) {
        handleSubmit()
      }
    }
    if (e.key === 'Backspace' && mode1Inputs[idx] === '' && idx > 0) {
      mode1Refs.current[idx - 1]?.focus()
    }
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
        <div className="flex gap-3 justify-center flex-wrap">
          {question.chordAnswers.map((ca, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <input
                ref={el => { mode1Refs.current[i] = el }}
                type="text"
                placeholder="?"
                value={mode1Inputs[i] ?? ''}
                onChange={e => handleMode1Change(i, e.target.value)}
                onKeyDown={e => handleMode1KeyDown(e, i)}
                disabled={answered}
                className="w-16 h-16 bg-gray-700 rounded-xl text-center text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              <span className="text-gray-400 text-xs font-mono">{ca.degree}</span>
            </div>
          ))}
        </div>
      )}

      {/* Other modes: single input */}
      {question.mode !== 1 && (
        <input
          ref={singleInputRef}
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
