'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BPM_MIN, BPM_MAX, BPM_STEP, BPM_VALUES, BPM_QUIZ_STEPS, type BpmQuizStep, getBpmValues, nextBpm, playBpm } from '@/src/utils/bpmTraining'

const primaryButton = 'w-full rounded-xl bg-primary py-3 font-semibold text-bg transition-colors hover:bg-primary-bright disabled:opacity-40'

export default function BpmTraining() {
  const [target, setTarget] = useState<number | null>(null)
  const [guess, setGuess] = useState('')
  const [answered, setAnswered] = useState(false)
  const [playingBpm, setPlayingBpm] = useState<number | null>(null)
  const [heard, setHeard] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 })
  const [rangeStart, setRangeStart] = useState(BPM_MIN)
  const [rangeEnd, setRangeEnd] = useState(BPM_MAX)
  const [quizStep, setQuizStep] = useState<BpmQuizStep>(BPM_STEP)
  const playback = useRef<AbortController | null>(null)
  const submitted = useRef(false)
  const quizValues = useMemo(
    () => getBpmValues(rangeStart, rangeEnd, quizStep),
    [rangeStart, rangeEnd, quizStep],
  )

  useEffect(() => () => { playback.current?.abort() }, [])

  async function listen(bpm: number) {
    playback.current?.abort()
    const controller = new AbortController()
    playback.current = controller
    setPlayingBpm(bpm)
    setError('')
    try {
      await playBpm(bpm, controller.signal, () => {
        if (!controller.signal.aborted) setHeard(true)
      })
    } catch {
      if (!controller.signal.aborted) setError('소리를 재생하지 못했어요. 소리 듣기를 다시 눌러주세요.')
    } finally {
      if (!controller.signal.aborted) setPlayingBpm(null)
    }
  }

  function stopListening() {
    playback.current?.abort()
    setPlayingBpm(null)
  }

  function askNext() {
    const bpm = nextBpm(target, quizValues)
    setTarget(bpm)
    setGuess('')
    setAnswered(false)
    setHeard(false)
    submitted.current = false
    void listen(bpm)
  }

  function submit() {
    if (target === null || !heard || submitted.current || !quizValues.includes(Number(guess))) return
    submitted.current = true
    stopListening()
    setAnswered(true)
    const correct = Number(guess) === target
    setStats(s => ({
      correct: s.correct + Number(correct),
      total: s.total + 1,
      streak: correct ? s.streak + 1 : 0,
    }))
  }

  return (
    <section className="bg-surface border border-border rounded-2xl p-5 space-y-5" aria-labelledby="bpm-title">
      <div className="space-y-2">
        <h2 id="bpm-title" className="text-lg font-bold">BPM 맞추기</h2>
        <p className="text-sm text-muted">
          메트로놈의 박자를 듣고 빠르기를 맞혀보세요. 원하는 범위와 단위로 문제를 낼 수 있어요.
          4분음표 한 박씩 계속 들려드려요. 들으면서 답을 입력해 보세요.
        </p>
      </div>

      {target === null ? (
        <div className="space-y-5">
          <fieldset className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
            <legend className="px-1 text-sm font-medium text-fg">문제 설정</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm text-muted">
                <span>시작 BPM</span>
                <select
                  value={rangeStart}
                  onChange={event => {
                    const value = Number(event.target.value)
                    setRangeStart(value)
                    if (value > rangeEnd) setRangeEnd(value)
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {BPM_VALUES.map(bpm => <option key={bpm} value={bpm}>{bpm} BPM</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm text-muted">
                <span>끝 BPM</span>
                <select
                  value={rangeEnd}
                  onChange={event => {
                    const value = Number(event.target.value)
                    setRangeEnd(value)
                    if (value < rangeStart) setRangeStart(value)
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {BPM_VALUES.map(bpm => <option key={bpm} value={bpm}>{bpm} BPM</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <p id="bpm-step-label" className="text-sm text-muted">출제 단위</p>
              <div role="group" aria-labelledby="bpm-step-label" className="grid grid-cols-2 gap-2">
                {BPM_QUIZ_STEPS.map(step => (
                  <button
                    key={step}
                    type="button"
                    aria-pressed={quizStep === step}
                    onClick={() => setQuizStep(step)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      quizStep === step
                        ? 'border-primary bg-primary/15 text-primary-bright'
                        : 'border-border bg-surface text-muted hover:bg-border hover:text-fg'
                    }`}
                  >
                    {step} BPM 단위
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted">{rangeStart}~{rangeEnd} BPM · {quizStep} BPM 단위 · {quizValues.length}개 후보</p>
          </fieldset>
          <button onClick={askNext} className={primaryButton}>시작하고 소리 듣기</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
            <span>{stats.total + (answered ? 0 : 1)}번째 문제</span>
            <span>정답 {stats.correct}/{stats.total} · 연속 {stats.streak}</span>
          </div>
          <div className="rounded-xl bg-surface-2 p-5 text-center space-y-3">
            <p className="text-3xl font-bold font-mono text-primary-bright">
              {answered ? target : '?'} <span className="text-base">BPM</span>
            </p>
            <p role="status" className="text-sm text-muted">
              {playingBpm !== null
                ? answered
                  ? `♩ ${playingBpm === target ? '정답' : '내 답'} ${playingBpm} BPM 재생 중…`
                  : '♩ 4분음표로 한 박씩 재생 중…'
                : answered ? '다시 들으며 빠르기를 익혀보세요.' : heard ? '몇 BPM으로 들렸나요?' : '소리를 듣고 박자를 느껴보세요.'}
            </p>
            <button
              onClick={() => playingBpm !== null ? stopListening() : void listen(target)}
              className="rounded-xl border border-border px-5 py-2 text-sm hover:bg-border disabled:opacity-40"
            >
              {playingBpm !== null ? '정지' : answered ? '정답 다시 듣기' : heard ? '다시 듣기' : '소리 듣기'}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-danger-bright">{error}</p>}
          <form onSubmit={event => { event.preventDefault(); submit() }} className="space-y-3">
            <label htmlFor="bpm-guess" className="block text-sm text-muted">예상 BPM ({quizStep}단위)</label>
            <input
              id="bpm-guess"
              type="number"
              inputMode="numeric"
              min={rangeStart}
              max={rangeEnd}
              step={quizStep}
              required
              value={guess}
              onChange={event => setGuess(event.target.value)}
              disabled={answered}
              placeholder="예: 100"
              className="w-full rounded-xl border border-border bg-surface-2 p-3 text-lg font-mono text-fg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            {!answered && (
              <button type="submit" disabled={!heard || !quizValues.includes(Number(guess))} className={primaryButton}>
                정답 확인
              </button>
            )}
          </form>
          {answered && (
            <div className="space-y-3">
              <div role="status" className={`rounded-xl border p-4 ${Number(guess) === target ? 'border-success/40 bg-success/10 text-success-bright' : 'border-danger/40 bg-danger/10 text-danger-bright'}`}>
                <p className="font-semibold">{Number(guess) === target ? '정답이에요!' : `정답은 ${target} BPM이에요.`}</p>
                <p className="text-sm mt-1">
                  내 답: {guess} BPM · 오차: {Math.abs(Number(guess) - target)} BPM
                  {Number(guess) !== target && (Number(guess) > target ? ' (더 빠르게 예상했어요)' : ' (더 느리게 예상했어요)')}
                </p>
              </div>
              {Number(guess) !== target && (
                <div className="rounded-xl bg-surface-2 p-4 space-y-3">
                  <p className="text-sm text-muted">정답과 내 답을 번갈아 들으며 비교해 보세요.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: '정답', bpm: target },
                      { label: '내 답', bpm: Number(guess) },
                    ].map(({ label, bpm }) => (
                      <button
                        key={label}
                        aria-pressed={playingBpm === bpm}
                        onClick={() => playingBpm === bpm ? stopListening() : void listen(bpm)}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          playingBpm === bpm
                            ? 'border-primary bg-primary/15 text-primary-bright'
                            : 'border-border text-fg hover:bg-border'
                        }`}
                      >
                        {label} {bpm} BPM · {playingBpm === bpm ? '정지' : '듣기'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={askNext} className={primaryButton}>다음 문제</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
