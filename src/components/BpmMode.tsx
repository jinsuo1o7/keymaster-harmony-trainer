'use client'

import { useState } from 'react'
import BpmTraining from './BpmTraining'
import BpmPractice from './BpmPractice'

export default function BpmMode() {
  const [mode, setMode] = useState<'quiz' | 'practice'>('quiz')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1" role="group" aria-label="BPM 연습 방식">
        {([
          { id: 'quiz', label: 'BPM 맞추기' },
          { id: 'practice', label: '미리 듣기' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === id ? 'bg-primary text-bg' : 'text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'quiz' ? <BpmTraining /> : <BpmPractice />}
    </div>
  )
}
