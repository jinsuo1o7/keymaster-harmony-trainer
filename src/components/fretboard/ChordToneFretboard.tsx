'use client'
import { useState, useCallback, useRef, useMemo } from 'react'
import Fretboard, { type Marker } from './Fretboard'
import {
  type Quality,
  type Stage,
  type Degree,
  MAX_FRET,
  TAP_ORDER,
  pickAnchor,
  expectedPosition,
  chordLabel,
  rootPcAt,
  degreePc,
  pitchClassAt,
  midiAt,
} from '@/src/utils/fretboardUtils'
import { playMidiSequence } from '@/src/utils/audioUtils'
import {
  loadEarProgress,
  recordEarResult,
  stageAccuracy,
  type EarProgress,
} from '@/src/utils/earTrainingProgress'

type Phase = 'answering' | 'feedback'
type Pos = { string: number; fret: number }
type DonePos = { string: number; fret: number; degree: Degree }

// The open A string pitch class — the root always sits on the A string, so its
// lowest fretted position drives the visible window in "find" mode.
const OPEN_A_PC = 9

const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'guided', label: '가이드', hint: '자리 표시' },
  { id: 'anchor', label: '시작점만', hint: '시작만 강조' },
  { id: 'find', label: '시작점 찾기', hint: '스스로' },
]

const QUAL_OPTIONS: { id: 'maj7' | 'min7' | 'both'; label: string; quals: Quality[] }[] = [
  { id: 'maj7', label: 'Maj7', quals: ['maj7'] },
  { id: 'min7', label: 'min7', quals: ['min7'] },
  { id: 'both', label: '둘 다', quals: ['maj7', 'min7'] },
]

const DEGREE_LABEL: Record<Degree, string> = { 1: '1', 3: '3', 5: '5', 7: '7' }

const LS = 'keymaster_fretboardConfig'

interface FretboardConfig {
  stage: Stage
  quals: Quality[]
}

const DEFAULT_CONFIG: FretboardConfig = { stage: 'guided', quals: ['maj7'] }

function load<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const val = localStorage.getItem(key)
    return val === null ? defaultValue : (JSON.parse(val) as T)
  } catch {
    return defaultValue
  }
}

function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// Which of the 3-way toggle options the persisted `quals` matches, for restoring
// the start-screen selection.
function qualOptionFor(quals: Quality[]): 'maj7' | 'min7' | 'both' {
  if (quals.length === 2) return 'both'
  return quals[0] === 'min7' ? 'min7' : 'maj7'
}

export default function ChordToneFretboard() {
  const [initialConfig] = useState<FretboardConfig>(() => load<FretboardConfig>(LS, DEFAULT_CONFIG))

  const [started, setStarted] = useState(false)
  const [stage, setStage] = useState<Stage>(initialConfig.stage)
  const [qualOption, setQualOption] = useState<'maj7' | 'min7' | 'both'>(
    qualOptionFor(initialConfig.quals),
  )
  const quals = useMemo<Quality[]>(
    () => QUAL_OPTIONS.find(o => o.id === qualOption)?.quals ?? ['maj7'],
    [qualOption],
  )

  // per-question state
  const [quality, setQuality] = useState<Quality>('maj7')
  const [anchor, setAnchor] = useState<number | null>(null)
  const [targetRootPc, setTargetRootPc] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState<DonePos[]>([])
  const [wrong, setWrong] = useState<Pos | null>(null)
  const [phase, setPhase] = useState<Phase>('answering')
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const [lifetime, setLifetime] = useState<EarProgress | null>(null)
  const [clean, setClean] = useState(true)

  const missedRef = useRef(false)
  const lastRef = useRef<{ quality: Quality; rootPc: number } | null>(null)

  const askNext = useCallback(() => {
    const pool = quals
    let nextQuality: Quality = pool.length === 1
      ? pool[0]
      : pool[Math.floor(Math.random() * pool.length)]
    if (pool.length > 1 && lastRef.current) {
      let guard = 0
      while (nextQuality === lastRef.current.quality && guard < 8) {
        nextQuality = pool[Math.floor(Math.random() * pool.length)]
        guard++
      }
    }

    let nextRootPc: number

    if (stage === 'find') {
      nextRootPc = Math.floor(Math.random() * 12)
      if (lastRef.current) {
        let guard = 0
        while (
          nextRootPc === lastRef.current.rootPc &&
          nextQuality === lastRef.current.quality &&
          guard < 12
        ) {
          nextRootPc = Math.floor(Math.random() * 12)
          guard++
        }
      }
      // Reference position for the window only — the lowest A-string fret of the
      // root. Grading is by relative degree (pitch class), not this position.
      setAnchor(((nextRootPc - OPEN_A_PC) % 12 + 12) % 12)
      setStepIndex(0)
    } else {
      const a = pickAnchor(stage)
      nextRootPc = rootPcAt(nextQuality, a)
      setAnchor(a)
      setStepIndex(1)
    }

    lastRef.current = { quality: nextQuality, rootPc: nextRootPc }
    setQuality(nextQuality)
    setTargetRootPc(nextRootPc)
    setDone([])
    setWrong(null)
    missedRef.current = false
    setPhase('answering')
  }, [quals, stage])

  function start() {
    save(LS, { stage, quals })
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setStarted(true)
    askNext()
  }

  const complete = useCallback(
    async (finalDone: DonePos[], resolvedAnchor: number, resolvedQuality: Quality) => {
      const isClean = !missedRef.current
      const newStreak = isClean ? streak + 1 : 0
      setClean(isClean)
      setStreak(newStreak)
      setSession(x => ({ correct: x.correct + (isClean ? 1 : 0), total: x.total + 1 }))
      setLifetime(
        recordEarResult({
          stage: 'fretboard',
          correct: isClean,
          streak: newStreak,
          missKey: 'fretboardMisses',
          missItems: [resolvedQuality],
        }),
      )
      setPhase('feedback')
      // Play back exactly what's on the board: each tapped note in 7→1→3→5 order,
      // falling back to the shown 7 (guided/anchor never tap it).
      const midis = TAP_ORDER.map(deg => {
        const placed = finalDone.find(d => d.degree === deg)
        const pos = placed ?? expectedPosition(resolvedQuality, resolvedAnchor, deg)
        return midiAt(pos.string, pos.fret)
      })
      await playMidiSequence(midis, { noteDur: 0.42, gap: 0.05 })
    },
    [streak],
  )

  const handleClick = useCallback(
    (s: number, f: number) => {
      if (phase !== 'answering' || anchor === null) return
      setWrong(null)

      // Grade by relative degree: any note whose pitch class is the required
      // chord tone (from the fixed root) counts — position/string/octave free.
      const degree = TAP_ORDER[stepIndex]
      const correct = pitchClassAt(s, f) === degreePc(quality, targetRootPc, degree)
      if (!correct) {
        setWrong({ string: s, fret: f })
        missedRef.current = true
        return
      }

      const entry: DonePos = { string: s, fret: f, degree }
      const nextDone = [...done, entry]
      setDone(nextDone)
      const nextStep = stepIndex + 1
      setStepIndex(nextStep)
      if (nextStep === 4) {
        complete(nextDone, anchor, quality)
      }
    },
    [phase, stepIndex, anchor, quality, targetRootPc, done, complete],
  )

  const nextDegree = TAP_ORDER[stepIndex]

  // Visible fret window: a focused region around the reference position (in find
  // mode, the root's lowest A-string fret). Grading is position-free, but the
  // window keeps the board readable and scroll-free.
  const focusFret = anchor ?? 5
  const windowSpan = stage === 'find' ? 6 : 4
  const loFret = Math.max(0, Math.min(focusFret - 1, MAX_FRET - windowSpan))
  const hiFret = loFret + windowSpan

  const buildMarkers = (): Marker[] => {
    const isDone = (s: number, f: number) => done.some(d => d.string === s && d.fret === f)

    const markers: Marker[] = done.map(pos => ({
      string: pos.string,
      fret: pos.fret,
      kind: 'done',
      label: DEGREE_LABEL[pos.degree],
    }))

    // guided/anchor reveal the 7 as the starting reference.
    if (stage !== 'find' && anchor !== null) {
      const startPos = expectedPosition(quality, anchor, 7)
      if (!isDone(startPos.string, startPos.fret)) {
        markers.push({ ...startPos, kind: 'start', label: DEGREE_LABEL[7] })
      }
    }

    // guided: highlight every spot in view where the CURRENT degree can go,
    // since any correct chord-tone position is accepted.
    if (stage === 'guided' && phase === 'answering' && stepIndex < TAP_ORDER.length) {
      const wantPc = degreePc(quality, targetRootPc, nextDegree)
      for (let s = 0; s < 6; s++) {
        for (let f = loFret; f <= hiFret; f++) {
          if (pitchClassAt(s, f) === wantPc && !isDone(s, f)) {
            markers.push({ string: s, fret: f, kind: 'hint', label: DEGREE_LABEL[nextDegree] })
          }
        }
      }
    }

    if (wrong) {
      const idx = markers.findIndex(m => m.string === wrong.string && m.fret === wrong.fret)
      if (idx !== -1) markers.splice(idx, 1)
      markers.push({ ...wrong, kind: 'wrong' })
    }

    return markers
  }

  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : null
  const lifeStats = lifetime?.fretboard
  const lifeAcc = lifeStats ? stageAccuracy(lifeStats) : null

  const stageInfo = STAGES.find(s => s.id === stage)!
  const targetLabel = `${chordLabel(quality, targetRootPc)} · 7→1→3→5`

  if (!started) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-fg">코드톤 지판</h2>
          <p className="text-sm text-muted">
            지판 위에서 <span className="text-primary-bright font-medium">코드톤(1·3·5·7도)</span>의
            위치를 짚어보세요. 7도는 짚는 음이 아니라 <span className="text-primary-bright font-medium">시작점</span>입니다 —
            7도의 위치를 기준으로 나머지 코드톤이 이어집니다.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {STAGES.map(st => (
              <button
                key={st.id}
                onClick={() => setStage(st.id)}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  stage === st.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{st.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{st.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">퀄리티</p>
          <div className="grid grid-cols-3 gap-2">
            {QUAL_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setQualOption(opt.id)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  qualOption === opt.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={start}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-3 rounded-xl glow-primary transition-all active:scale-[.99]"
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
          {stageInfo.label} · {stageInfo.hint}
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

      <div className="text-center py-2 space-y-1">
        <p className="text-base font-medium text-fg">{targetLabel}</p>
        {phase === 'answering' && (
          <p className="text-sm text-muted">
            {stage === 'find' && anchor === null
              ? '루트는 A현에서 · 7도를 먼저 찾으세요'
              : `다음: ${DEGREE_LABEL[nextDegree]}도`}
          </p>
        )}
      </div>

      {wrong && phase === 'answering' && (
        <div className="bg-danger/10 border border-danger/40 rounded-xl px-4 py-2.5 text-sm text-danger-bright text-center">
          ❌ 다시 짚어보세요.
        </div>
      )}

      <Fretboard
        markers={buildMarkers()}
        loFret={loFret}
        hiFret={hiFret}
        onFretClick={handleClick}
        disabled={phase !== 'answering'}
      />

      {phase === 'feedback' && (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-4 space-y-1 animate-reveal ${
              clean
                ? 'bg-success/10 border border-success/40 glow-success'
                : 'bg-danger/10 border border-danger/40'
            }`}
          >
            <p className={`font-semibold ${clean ? 'text-success-bright' : 'text-danger-bright'}`}>
              {clean ? '✅ 정답!' : `완료: ${targetLabel}`}
            </p>
          </div>
          <button
            onClick={askNext}
            className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 rounded-xl glow-primary transition-all active:scale-[.99]"
          >
            다음 →
          </button>
        </div>
      )}

      {lifeAcc !== null && (
        <p className="text-xs text-faint text-center">
          누적 {lifeAcc}% · 최고 연속 {lifeStats!.bestStreak}
        </p>
      )}
    </div>
  )
}
