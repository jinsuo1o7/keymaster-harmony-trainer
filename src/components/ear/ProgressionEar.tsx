'use client'
import { useState, useCallback, useRef } from 'react'
import {
  PROGRESSION_TIERS,
  type ProgressionTier,
  romanOf,
  diatonicTriadMidis,
  randomTonic,
  pickProgression,
  progressionSignature,
  progressionAnswerLabels,
  ALL_DEGREES,
  CUSTOM_PROGRESSION_LENGTHS,
  buildCustomProgression,
  isCustomProgressionValid,
  loadCustomProgression,
  saveCustomProgression,
} from '@/src/utils/earTrainingUtils'
import { establishKey, playChordProgression, playChord, silence } from '@/src/utils/audioUtils'
import {
  loadEarProgress,
  recordEarResult,
  stageAccuracy,
  type EarProgress,
} from '@/src/utils/earTrainingProgress'

type Phase = 'playing' | 'answering' | 'feedback'

export default function ProgressionEar() {
  const [started, setStarted] = useState(false)
  const [tier, setTier] = useState<ProgressionTier>(PROGRESSION_TIERS[0])
  const [customMode, setCustomMode] = useState(false)
  const [customDegrees, setCustomDegrees] = useState<number[]>(() => loadCustomProgression().degrees)
  const [customLength, setCustomLength] = useState<number>(() => loadCustomProgression().length)
  const [isCustom, setIsCustom] = useState(false)
  const [answerDegrees, setAnswerDegrees] = useState<number[]>(PROGRESSION_TIERS[0].degrees)
  const [phase, setPhase] = useState<Phase>('playing')
  const [progression, setProgression] = useState<number[]>([])
  const [input, setInput] = useState<number[]>([])
  const [correct, setCorrect] = useState(false)
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const [lifetime, setLifetime] = useState<EarProgress | null>(null)
  const [isReplaying, setIsReplaying] = useState(false)
  const tonicRef = useRef(60)
  const lastRef = useRef<string | null>(null)
  const answerableAtRef = useRef(0)

  const askNext = useCallback(async (next: number[], degrees: number[]) => {
    lastRef.current = progressionSignature(next)
    const tonic = randomTonic()
    tonicRef.current = tonic
    setProgression(next)
    setAnswerDegrees(degrees)
    setInput([])
    setPhase('playing')
    await establishKey(tonic)
    await silence(550)
    await playChordProgression(next.map(d => diatonicTriadMidis(tonic, d)))
    answerableAtRef.current = performance.now() + 350
    setPhase('answering')
  }, [])

  function nextProgression(): number[] {
    return customMode
      ? buildCustomProgression(customDegrees, customLength, lastRef.current)
      : pickProgression(tier, loadEarProgress().progressionMisses, lastRef.current)
  }
  function nextAnswerDegrees(): number[] {
    return customMode ? customDegrees : tier.degrees
  }

  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setIsCustom(customMode)
    setStarted(true)
    askNext(nextProgression(), nextAnswerDegrees())
  }

  const handleReplay = useCallback(async () => {
    if (isReplaying || phase === 'playing') return
    setIsReplaying(true)
    await playChordProgression(progression.map(d => diatonicTriadMidis(tonicRef.current, d)))
    setIsReplaying(false)
  }, [isReplaying, phase, progression])

  const handleReplayKey = useCallback(async () => {
    if (isReplaying || phase === 'playing') return
    setIsReplaying(true)
    await establishKey(tonicRef.current)
    setIsReplaying(false)
  }, [isReplaying, phase])

  const tap = useCallback((degree: number) => {
    if (phase !== 'answering' || performance.now() < answerableAtRef.current) return
    if (input.length >= progression.length) return
    playChord(diatonicTriadMidis(tonicRef.current, degree), 0.7)
    setInput(prev => [...prev, degree])
  }, [phase, input.length, progression.length])

  function undo() {
    if (phase !== 'answering') return
    setInput(prev => prev.slice(0, -1))
  }

  function submit() {
    if (phase !== 'answering' || input.length !== progression.length) return
    const ok = input.every((d, i) => d === progression[i])
    const newStreak = ok ? streak + 1 : 0
    setCorrect(ok)
    setStreak(newStreak)
    setSession(s => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }))
    if (!isCustom) {
      setLifetime(
        recordEarResult({
          stage: 'progression',
          correct: ok,
          streak: newStreak,
          missKey: 'progressionMisses',
          missItems: [progressionSignature(progression)],
        }),
      )
    }
    setPhase('feedback')
  }

  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : null
  const lifeStats = lifetime?.progression
  const lifeAcc = lifeStats ? stageAccuracy(lifeStats) : null

  if (!started) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-fg">진행 청음</h2>
          <p className="text-sm text-muted">
            스케일·기준 <span className="font-mono text-fg">도</span>로 조를 잡은 뒤,
            <span className="text-primary-bright font-medium"> 코드 진행</span>을 들려줍니다.
            각 코드가 <span className="text-primary-bright font-medium">몇 도</span>인지 순서대로 눌러 맞혀보세요.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {PROGRESSION_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTier(t); setCustomMode(false) }}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  !customMode && tier.id === t.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{t.hint}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setCustomMode(true)}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              customMode
                ? 'bg-primary text-bg glow-primary'
                : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
            }`}
          >
            커스텀 — 나올 코드·개수 직접 고르기
          </button>

          {customMode && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <p className="text-xs text-muted font-medium">나올 도 (degree)</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {ALL_DEGREES.map(deg => {
                    const on = customDegrees.includes(deg)
                    return (
                      <button
                        key={deg}
                        onClick={() => {
                          const next = on
                            ? customDegrees.filter(x => x !== deg)
                            : [...customDegrees, deg].sort((a, b) => a - b)
                          setCustomDegrees(next)
                          saveCustomProgression({ degrees: next, length: customLength })
                        }}
                        className={`py-2 rounded-lg font-mono font-semibold text-sm transition-colors ${
                          on
                            ? 'bg-primary/20 text-primary-bright border border-primary/50'
                            : 'bg-surface-2 text-muted hover:bg-border hover:text-fg border border-transparent'
                        }`}
                      >
                        {deg}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted font-medium">코드 개수</p>
                <div className="flex gap-2">
                  {CUSTOM_PROGRESSION_LENGTHS.map(len => (
                    <button
                      key={len}
                      onClick={() => {
                        setCustomLength(len)
                        saveCustomProgression({ degrees: customDegrees, length: len })
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        customLength === len
                          ? 'bg-primary text-bg glow-primary'
                          : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                      }`}
                    >
                      {len}개{len === 1 ? ' (단일)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {!isCustomProgressionValid(customDegrees, customLength) && (
                <p className="text-xs text-danger-bright text-center">
                  도를 최소 2개 이상 골라주세요.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={start}
          disabled={customMode && !isCustomProgressionValid(customDegrees, customLength)}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-3 rounded-xl glow-primary transition-all active:scale-[.99] disabled:opacity-40"
        >
          시작하기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
          {isCustom ? `커스텀 · 코드 ${customLength}개` : `${tier.label} · ${tier.hint}`}
        </span>
        <div className="flex items-center gap-3">
          {streak > 0 && <span className="text-xs text-primary-bright">🔥 {streak}</span>}
          {accuracy !== null && (
            <span className="text-xs text-muted">
              {accuracy}% ({session.correct}/{session.total})
            </span>
          )}
          <button
            onClick={() => setStarted(false)}
            className="text-xs text-faint hover:text-fg transition-colors"
          >
            종료
          </button>
        </div>
      </div>

      {phase === 'playing' ? (
        <div className="py-10 text-center space-y-3">
          <div className="text-4xl animate-pulse text-primary-bright">🎶</div>
          <p className="text-sm text-muted">진행 재생 중...</p>
        </div>
      ) : (
        <>
          {/* Answer slots */}
          <div className="flex gap-2 justify-center py-2 flex-wrap">
            {progression.map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono font-semibold text-lg ${
                  phase === 'feedback'
                    ? input[i] === progression[i]
                      ? 'border-success/50 text-success-bright bg-success/10'
                      : 'border-danger/50 text-danger-bright bg-danger/10'
                    : input[i]
                    ? 'border-primary/50 text-fg bg-surface-2'
                    : 'border-border text-faint bg-surface-2'
                }`}
              >
                {input[i] ?? '·'}
              </div>
            ))}
          </div>

          {phase === 'answering' ? (
            <>
              <button
                onClick={handleReplayKey}
                disabled={isReplaying}
                className="w-full text-xs text-muted hover:text-fg bg-surface-2 hover:bg-border rounded-xl py-2 transition-colors disabled:opacity-40"
              >
                🎼 조 다시 듣기
              </button>

              <div className={`grid gap-2 ${
                answerDegrees.length === 2 ? 'grid-cols-2'
                  : answerDegrees.length === 3 ? 'grid-cols-3'
                  : answerDegrees.length === 4 ? 'grid-cols-4'
                  : answerDegrees.length === 5 ? 'grid-cols-5'
                  : answerDegrees.length === 6 ? 'grid-cols-3'
                  : 'grid-cols-4'
              }`}>
                {answerDegrees.map(deg => (
                  <button
                    key={deg}
                    onClick={() => tap(deg)}
                    disabled={input.length >= progression.length}
                    className="bg-surface-2 hover:bg-border hover:text-fg text-fg py-3 rounded-xl transition-colors disabled:opacity-40 flex flex-col items-center gap-0.5"
                  >
                    <span className="font-mono font-semibold text-lg">{deg}</span>
                    <span className="text-xs text-faint">{romanOf(deg)}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={input.length === 0}
                  className="bg-surface-2 hover:bg-border text-muted font-medium py-2.5 px-4 rounded-xl transition-colors disabled:opacity-40"
                >
                  ⌫ 지우기
                </button>
                <button
                  onClick={handleReplay}
                  disabled={isReplaying}
                  className="bg-surface-2 hover:bg-border text-muted font-medium py-2.5 px-4 rounded-xl transition-colors disabled:opacity-40"
                >
                  ↩ 진행 다시
                </button>
                <button
                  onClick={submit}
                  disabled={input.length !== progression.length}
                  className="flex-1 bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 px-4 rounded-xl glow-primary transition-all active:scale-[.98] disabled:opacity-40"
                >
                  제출
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={`rounded-xl p-4 space-y-1 animate-reveal ${
                  correct
                    ? 'bg-success/10 border border-success/40 glow-success'
                    : 'bg-danger/10 border border-danger/40 glow-danger'
                }`}
              >
                <p className={`font-semibold ${correct ? 'text-success-bright' : 'text-danger-bright'}`}>
                  {correct ? '✅ 정답!' : '❌ 오답'}
                </p>
                <p className="text-sm text-muted">
                  정답 진행: <span className="font-mono text-fg">{progressionAnswerLabels(progression)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReplay}
                  disabled={isReplaying}
                  className="bg-surface-2 hover:bg-border text-muted font-medium py-2.5 px-4 rounded-xl transition-colors disabled:opacity-40"
                >
                  ↩ 진행 다시
                </button>
                <button
                  onClick={() => askNext(nextProgression(), nextAnswerDegrees())}
                  className="flex-1 bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 rounded-xl glow-primary transition-all active:scale-[.99]"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {!isCustom && lifeAcc !== null && (
            <p className="text-xs text-faint text-center">
              누적 {lifeAcc}% · 최고 연속 {lifeStats!.bestStreak}
            </p>
          )}
        </>
      )}
    </div>
  )
}
