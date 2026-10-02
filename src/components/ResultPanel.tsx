import type { QuizResult } from '@/src/types/quiz'

interface ResultPanelProps {
  result: QuizResult
}

export default function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div
      className={`rounded-2xl p-4 border animate-reveal ${
        result.correct
          ? 'bg-success/10 border-success/40 glow-success'
          : 'bg-danger/10 border-danger/40 glow-danger'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
        <span
          className={`font-bold text-lg ${
            result.correct ? 'text-success-bright' : 'text-danger-bright'
          }`}
        >
          {result.correct ? '정답!' : '오답'}
        </span>
      </div>
      <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
        {result.explanation}
      </p>
    </div>
  )
}
