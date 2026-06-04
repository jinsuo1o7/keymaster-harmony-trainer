'use client'
import type { TutorialLesson } from '@/src/types/quiz'

interface Props {
  lesson: TutorialLesson
  onStart: () => void
}

export default function TutorialLessonCard({ lesson, onStart }: Props) {
  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">학습 내용</h3>
        <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{lesson.explanation}</p>
      </div>

      {/* Memory Formula */}
      <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">핵심 공식</h3>
        <p className="text-base font-mono font-bold text-indigo-200 whitespace-pre-line">{lesson.memoryFormula}</p>
      </div>

      {/* Examples */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">예시</h3>
        <ul className="space-y-1">
          {lesson.examples.map((ex, i) => (
            <li key={i} className="text-sm text-gray-300 flex gap-2">
              <span className="text-purple-500 shrink-0">▸</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-gray-800 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-400">
          <span className="text-yellow-400 font-medium">목표:</span>{' '}
          {lesson.learningGoal}
        </p>
      </div>

      <button
        onClick={onStart}
        className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
      >
        연습 시작 →
      </button>
    </div>
  )
}
