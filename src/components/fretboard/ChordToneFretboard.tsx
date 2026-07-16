'use client'
import { useState, useCallback, useRef, useMemo } from 'react'
import Fretboard, { type Marker } from './Fretboard'
import {
  type Quality,
  type Stage,
  type Degree,
  TAP_ORDER,
  pickAnchor,
  expectedPosition,
  shapeNoteFor,
  shapeMidis,
  chordLabel,
  rootPcAt,
  degreePc,
  pitchClassAt,
  anchorFretRange,
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
  const [done, setDone] = useState<Pos[]>([])
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
      setAnchor(null)
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
    async (resolvedAnchor: number, resolvedQuality: Quality) => {
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
      await playMidiSequence(shapeMidis(resolvedQuality, resolvedAnchor), {
        noteDur: 0.42,
        gap: 0.05,
      })
    },
    [streak],
  )

  const handleClick = useCallback(
    (s: number, f: number) => {
      if (phase !== 'answering') return
      setWrong(null)

      const degree = TAP_ORDER[stepIndex]

      if (anchor === null) {
        // find stage, first tap: locate the 7th.
        const seven = shapeNoteFor(quality, 7)
        const pitchMatches = pitchClassAt(s, f) === degreePc(quality, targetRootPc, 7) && s === seven.string
        const derived = f - seven.fretOffset
        const { min, max } = anchorFretRange('find')
        const correct = pitchMatches && derived >= min && derived <= max
        if (!correct) {
          setWrong({ string: s, fret: f })
          missedRef.current = true
          return
        }
        setAnchor(derived)
        setDone(d => [...d, { string: s, fret: f }])
        setStepIndex(1)
        return
      }

      const exp = expectedPosition(quality, anchor, degree)
      const correct = s === exp.string && f === exp.fret
      if (!correct) {
        setWrong({ string: s, fret: f })
        missedRef.current = true
        return
      }
      setDone(d => [...d, { string: s, fret: f }])
      const nextStep = stepIndex + 1
      setStepIndex(nextStep)
      if (nextStep === 4) {
        complete(anchor, quality)
      }
    },
    [phase, stepIndex, anchor, quality, targetRootPc, complete],
  )

  const buildMarkers = (): Marker[] => {
    const markers: Marker[] = done.map(pos => ({ ...pos, kind: 'done' }))

    if (stage !== 'find' && anchor !== null) {
      const startPos = expectedPosition(quality, anchor, 7)
      markers.push({ ...startPos, kind: 'start' })
    }

    if (stage === 'guided' && anchor !== null) {
      const hintDegrees: Degree[] = [1, 3, 5]
      for (const degree of hintDegrees) {
        const pos = expectedPosition(quality, anchor, degree)
        const already = done.some(d => d.string === pos.string && d.fret === pos.fret)
        if (!already) {
          markers.push({ ...pos, kind: 'hint', label: DEGREE_LABEL[degree] })
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
  const nextDegree = TAP_ORDER[stepIndex]

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

      <Fretboard markers={buildMarkers()} onFretClick={handleClick} disabled={phase !== 'answering'} />

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
