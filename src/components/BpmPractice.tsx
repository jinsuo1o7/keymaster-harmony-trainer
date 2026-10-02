'use client'

import { useEffect, useRef, useState } from 'react'
import { BPM_MIN, BPM_MAX, BPM_STEP, BPM_VALUES, BPM_RHYTHMS, type BpmSubdivision, playBpm } from '@/src/utils/bpmTraining'

const focusStyle = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export default function BpmPractice() {
  const [bpm, setBpm] = useState(100)
  const [subdivision, setSubdivision] = useState<BpmSubdivision>(1)
  const rhythmLabel = BPM_RHYTHMS.find(rhythm => rhythm.subdivision === subdivision)!.label
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const playback = useRef<AbortController | null>(null)

  useEffect(() => () => { playback.current?.abort() }, [])

  function stop() {
    playback.current?.abort()
    setPlaying(false)
  }

  async function listen(tempo: number, rhythm: BpmSubdivision = subdivision) {
    playback.current?.abort()
    const controller = new AbortController()
    playback.current = controller
    setPlaying(true)
    setError('')
    try {
      await playBpm(tempo, controller.signal, undefined, rhythm)
    } catch {
      if (!controller.signal.aborted) setError('소리를 재생하지 못했어요. 재생 버튼을 다시 눌러주세요.')
    } finally {
      if (!controller.signal.aborted) setPlaying(false)
    }
  }

  function selectTempo(tempo: number) {
    if (!BPM_VALUES.includes(tempo)) return
    setBpm(tempo)
    if (playing && tempo !== bpm) void listen(tempo)
  }

  function selectRhythm(rhythm: BpmSubdivision) {
    setSubdivision(rhythm)
    if (playing && rhythm !== subdivision) void listen(bpm, rhythm)
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-6" aria-labelledby="bpm-practice-title">
      <div className="space-y-2">
        <h2 id="bpm-practice-title" className="text-lg font-bold">BPM 미리 듣기</h2>
        <p className="text-sm leading-relaxed text-muted">
          빠르기를 골라 귀에 익혀보세요. {BPM_MIN}~{BPM_MAX} BPM을 {BPM_STEP}단위로 조절하고,
          음표를 바꿔 같은 BPM에서 리듬을 비교할 수 있어요. BPM은 항상 4분음표 한 박 기준이에요.
        </p>
      </div>

      <div className="space-y-5 border-y border-border py-6">
        <div className="space-y-3">
          <p id="rhythm-choices-label" className="text-sm font-medium text-muted">음표 선택</p>
          <div role="group" aria-labelledby="rhythm-choices-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BPM_RHYTHMS.map(rhythm => (
              <button
                key={rhythm.subdivision}
                aria-pressed={subdivision === rhythm.subdivision}
                onClick={() => selectRhythm(rhythm.subdivision)}
                className={`rounded-lg border px-2 py-3 text-sm transition-colors ${focusStyle} ${
                  subdivision === rhythm.subdivision
                    ? 'border-primary bg-primary/15 text-primary-bright'
                    : 'border-border text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <span className="block font-medium">{rhythm.label}</span>
                <span className="block mt-1 text-xs">한 박에 {rhythm.subdivision}번</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-5 sm:gap-10">
          <button
            onClick={() => selectTempo(bpm - BPM_STEP)}
            disabled={bpm === BPM_MIN}
            aria-label="5 BPM 느리게"
            className={`h-12 w-12 shrink-0 rounded-full border border-border text-lg hover:bg-surface-2 disabled:opacity-30 ${focusStyle}`}
          >−5</button>
          <div className="min-w-28 text-center">
            <p className="text-5xl font-semibold tabular-nums tracking-tight">{bpm}</p>
            <p className="mt-2 text-sm text-muted">♩ BPM</p>
          </div>
          <button
            onClick={() => selectTempo(bpm + BPM_STEP)}
            disabled={bpm === BPM_MAX}
            aria-label="5 BPM 빠르게"
            className={`h-12 w-12 shrink-0 rounded-full border border-border text-lg hover:bg-surface-2 disabled:opacity-30 ${focusStyle}`}
          >+5</button>
        </div>
        <button
          onClick={() => playing ? stop() : void listen(bpm)}
          className={`w-full rounded-xl bg-primary py-3 font-semibold text-bg hover:bg-primary-bright ${focusStyle}`}
        >
          {playing ? '정지' : `${bpm} BPM · ${rhythmLabel} 재생`}
        </button>
        <p role="status" className="text-center text-sm text-muted">
          {playing ? `${bpm} BPM · ${rhythmLabel} 재생 중` : '재생을 누르면 선택한 빠르기와 음표로 시작해요.'}
        </p>
        {error && <p role="alert" className="text-sm text-danger-bright">{error}</p>}
      </div>

      <div className="space-y-3">
        <p id="tempo-choices-label" className="text-sm font-medium text-muted">빠르기 선택</p>
        <div role="group" aria-labelledby="tempo-choices-label" className="grid grid-cols-5 gap-2">
          {BPM_VALUES.map(tempo => (
            <button
              key={tempo}
              aria-label={`${tempo} BPM`}
              aria-pressed={bpm === tempo}
              onClick={() => selectTempo(tempo)}
              className={`min-h-11 rounded-lg border py-2 text-sm font-medium tabular-nums transition-colors ${focusStyle} ${
                bpm === tempo
                  ? 'border-primary bg-primary/15 text-primary-bright'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >{tempo}</button>
          ))}
        </div>
      </div>
    </section>
  )
}
