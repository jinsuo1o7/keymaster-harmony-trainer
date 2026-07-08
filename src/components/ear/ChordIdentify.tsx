'use client'
import { useState, useCallback, useRef } from 'react'
import {
  CHORD_TIERS,
  type ChordTier,
  type ChordQualityId,
  chordLabel,
  chordMidis,
  chordExplanation,
  randomChordRoot,
  weightedPick,
  ALL_CHORD_QUALITY_IDS,
  isCustomChordValid,
  loadCustomChord,
  saveCustomChord,
} from '@/src/utils/earTrainingUtils'
import { playChord, playMidiSequence, silence } from '@/src/utils/audioUtils'
import {
  loadEarProgress,
  recordEarResult,
  stageAccuracy,
  type EarProgress,
} from '@/src/utils/earTrainingProgress'

type Phase = 'playing' | 'answering' | 'feedback'

export default function ChordIdentify() {
  const [started, setStarted] = useState(false)
  const [tier, setTier] = useState<ChordTier>(CHORD_TIERS[0])
  const [customMode, setCustomMode] = useState(false)
  const [customQ, setCustomQ] = useState<ChordQualityId[]>(() => loadCustomChord().qualities)
  const [isCustom, setIsCustom] = useState(false)
  const customRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('playing')
  const [target, setTarget] = useState<ChordQualityId>('maj')
  const [wrong, setWrong] = useState(false)
  const [clean, setClean] = useState(false)
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const [lifetime, setLifetime] = useState<EarProgress | null>(null)
  const [isReplaying, setIsReplaying] = useState(false)
  const missedRef = useRef(false)
  const rootRef = useRef(57)
  const lastRef = useRef<ChordQualityId | null>(null)
  const answerableAtRef = useRef(0)

  const activeQualities = customMode ? customQ : tier.qualities

  const askNext = useCallback(async (qualities: ChordQualityId[]) => {
    const weights = loadEarProgress().chordMisses
    let next = weightedPick(qualities, weights)
    let guard = 0
    while (qualities.length > 1 && next === lastRef.current && guard < 8) {
      next = weightedPick(qualities, weights)
      guard++
    }
    lastRef.current = next
    rootRef.current = randomChordRoot()
    setTarget(next)
    setWrong(false)
    missedRef.current = false
    setPhase('playing')
    await playChord(chordMidis(next, rootRef.current))
    // Ignore taps that land the instant the buttons appear (stray click-through).
    answerableAtRef.current = performance.now() + 350
    setPhase('answering')
  }, [])

  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setIsCustom(customMode)
    customRef.current = customMode
    setStarted(true)
    askNext(activeQualities)
  }

  const settle = useCallback((isClean: boolean) => {
    // Record the finished question and reveal the chord: arpeggio (to expose the
    // interval stack) then the block chord once more.
    const newStreak = isClean ? streak + 1 : 0
    setClean(isClean)
    setStreak(newStreak)
    setSession(s => ({ correct: s.correct + (isClean ? 1 : 0), total: s.total + 1 }))
    if (!customRef.current) {
      setLifetime(
        recordEarResult({
          stage: 'chord',
          correct: isClean,
          streak: newStreak,
          missKey: 'chordMisses',
          missItems: [target],
        }),
      )
    }
    setPhase('feedback')
  }, [streak, target])

  const handleAnswer = useCallback(async (q: ChordQualityId) => {
    if (phase !== 'answering' || performance.now() < answerableAtRef.current) return
    if (q !== target) {
      setWrong(true)
      missedRef.current = true
      return
    }
    settle(!missedRef.current)
    await playMidiSequence(chordMidis(target, rootRef.current), { noteDur: 0.42, gap: 0.04 })
    await silence(140)
    await playChord(chordMidis(target, rootRef.current))
  }, [phase, target, settle])

  const handleReveal = useCallback(async () => {
    if (phase !== 'answering') return
    missedRef.current = true
    settle(false)
    await playMidiSequence(chordMidis(target, rootRef.current), { noteDur: 0.42, gap: 0.04 })
    await silence(140)
    await playChord(chordMidis(target, rootRef.current))
  }, [phase, target, settle])

  const handleReplay = useCallback(async () => {
    if (isReplaying || phase !== 'answering') return
    setIsReplaying(true)
    await playChord(chordMidis(target, rootRef.current))
    setIsReplaying(false)
  }, [isReplaying, phase, target])

  const handleReplayArp = useCallback(async () => {
    if (isReplaying || phase !== 'answering') return
    setIsReplaying(true)
    await playMidiSequence(chordMidis(target, rootRef.current), { noteDur: 0.42, gap: 0.04 })
    setIsReplaying(false)
  }, [isReplaying, phase, target])

  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : null
  const lifeStats = lifetime?.chord
  const lifeAcc = lifeStats ? stageAccuracy(lifeStats) : null

  if (!started) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-fg">코드 청음</h2>
          <p className="text-sm text-muted">
            코드(화음)를 하나 들려줍니다. 화음의 <span className="text-primary-bright font-medium">성격(퀄리티)</span>이
            무엇인지 맞혀보세요. 여러 음이 동시에 울릴 때의 밝고 · 어둡고 · 긴장된 느낌으로 구분해요.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {CHORD_TIERS.map(t => (
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
            커스텀 — 나올 코드 직접 고르기
          </button>

          {customMode && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {ALL_CHORD_QUALITY_IDS.map(q => {
                  const on = customQ.includes(q)
                  return (
                    <button
                      key={q}
                      onClick={() => {
                        const nextQ = on ? customQ.filter(x => x !== q) : [...customQ, q]
                        setCustomQ(nextQ)
                        saveCustomChord({ qualities: nextQ })
                      }}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        on
                          ? 'bg-primary/20 text-primary-bright border border-primary/50'
                          : 'bg-surface-2 text-muted hover:bg-border hover:text-fg border border-transparent'
                      }`}
                    >
                      {chordLabel(q)}
                    </button>
                  )
                })}
              </div>
              {!isCustomChordValid(customQ) && (
                <p className="text-xs text-danger-bright text-center">
                  최소 2개 이상 골라주세요.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={start}
          disabled={customMode && !isCustomChordValid(customQ)}
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
          {isCustom ? `커스텀 · ${activeQualities.length}지선다` : `${tier.label} · ${tier.hint}`}
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
          <div className="text-4xl animate-pulse text-primary-bright">🎹</div>
          <p className="text-sm text-muted">코드 재생 중...</p>
        </div>
      ) : (
        <>
          <div className="text-center py-2">
            <p className="text-base font-medium text-fg">방금 들린 코드는?</p>
          </div>

          {wrong && phase === 'answering' && (
            <div className="bg-danger/10 border border-danger/40 rounded-xl px-4 py-2.5 text-sm text-danger-bright text-center">
              ❌ 다시 들어보세요.
            </div>
          )}

          <div className={`grid gap-2 ${
            activeQualities.length <= 2 ? 'grid-cols-2'
              : activeQualities.length === 3 ? 'grid-cols-3'
              : activeQualities.length === 4 ? 'grid-cols-2'
              : activeQualities.length <= 6 ? 'grid-cols-3'
              : 'grid-cols-4'
          }`}>
            {activeQualities.map(q => (
              <button
                key={q}
                onClick={() => handleAnswer(q)}
                disabled={phase !== 'answering'}
                className="bg-surface-2 hover:bg-border hover:text-fg text-fg font-semibold text-base py-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {chordLabel(q)}
              </button>
            ))}
          </div>

          {phase === 'answering' ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={handleReplay}
                  disabled={isReplaying}
                  className="flex-1 text-sm text-muted hover:text-fg bg-surface-2 hover:bg-border rounded-xl py-2 transition-colors disabled:opacity-40"
                >
                  ↩ 코드 다시
                </button>
                <button
                  onClick={handleReplayArp}
                  disabled={isReplaying}
                  className="flex-1 text-sm text-muted hover:text-fg bg-surface-2 hover:bg-border rounded-xl py-2 transition-colors disabled:opacity-40"
                >
                  🎵 한 음씩
                </button>
              </div>
              <button
                onClick={handleReveal}
                className="w-full text-xs text-faint hover:text-fg transition-colors"
              >
                정답 보기
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={`rounded-xl p-4 space-y-1 animate-reveal ${
                  clean
                    ? 'bg-success/10 border border-success/40 glow-success'
                    : 'bg-danger/10 border border-danger/40'
                }`}
              >
                <p className={`font-semibold ${clean ? 'text-success-bright' : 'text-danger-bright'}`}>
                  {clean ? '✅ 정답!' : `정답: ${chordLabel(target)}`}
                </p>
                <p className={`text-sm ${clean ? 'text-success' : 'text-muted'}`}>
                  {chordExplanation(target)}
                </p>
              </div>
              <button
                onClick={() => askNext(activeQualities)}
                className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 rounded-xl glow-primary transition-all active:scale-[.99]"
              >
                다음 →
              </button>
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
