import {
  getScale,
  getKeySignature,
  getDiatonicChords,
  getAccidentalType,
} from '@/src/utils/musicTheoryUtils'

interface StudyPanelProps {
  questionKey: string
}

export default function StudyPanel({ questionKey }: StudyPanelProps) {
  const scale = getScale(questionKey)
  const sig = getKeySignature(questionKey)
  const chords = getDiatonicChords(questionKey)
  const accType = getAccidentalType(questionKey)

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">학습 패널</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">{questionKey} major scale:</span>
          <span className="text-blue-300 font-mono">{scale.join('  ')}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">조표:</span>
          {sig.length === 0 ? (
            <span className="text-gray-500">없음</span>
          ) : (
            <span className="text-yellow-300 font-mono">
              {sig.join(', ')} ({accType === 'flat' ? '♭' : '♯'} {sig.length}개)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-gray-400 shrink-0">다이어토닉 코드:</span>
          <span className="text-purple-300 font-mono text-xs leading-relaxed">
            {chords.map((chord, i) => `${i + 1}. ${chord}`).join('  ')}
          </span>
        </div>
      </div>
    </div>
  )
}
