import type { QuizResult } from '@/src/types/quiz'

interface ResultPanelProps {
  result: QuizResult
}

export default function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        result.correct
          ? 'bg-green-950 border-green-700'
          : 'bg-red-950 border-red-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
        <span
          className={`font-bold text-lg ${
            result.correct ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {result.correct ? '정답!' : '오답'}
        </span>
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
        {result.explanation}
      </p>
    </div>
  )
}
