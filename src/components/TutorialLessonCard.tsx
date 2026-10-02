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
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-primary-bright uppercase tracking-wide">학습 내용</h3>
        <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{lesson.explanation}</p>
      </div>

      {/* Memory Formula */}
      <div className="bg-primary/10 border border-primary/40 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-primary-bright uppercase tracking-wide mb-2">핵심 공식</h3>
        <p className="text-base font-mono font-bold text-primary-bright whitespace-pre-line">{lesson.memoryFormula}</p>
      </div>

      {/* Examples */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-primary-bright uppercase tracking-wide">예시</h3>
        <ul className="space-y-1">
          {lesson.examples.map((ex, i) => (
            <li key={i} className="text-sm text-muted flex gap-2">
              <span className="text-primary shrink-0">▸</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Goal */}
      <div className="bg-surface border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted">
          <span className="text-success-bright font-medium">목표:</span>{' '}
          {lesson.learningGoal}
        </p>
      </div>

      <button
        onClick={onStart}
        className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-3 px-4 rounded-xl glow-primary transition-all active:scale-[.99]"
      >
        연습 시작 →
      </button>
    </div>
  )
}
