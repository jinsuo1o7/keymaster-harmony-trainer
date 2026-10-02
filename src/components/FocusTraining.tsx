'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { KEY_PRIORITY, KEY_PRESETS } from '@/src/data/musicTheory'
import {
  getScale, getScaleDegree, getDiatonicChord,
  getAccidentalType, getAccidentalCount,
} from '@/src/utils/musicTheoryUtils'
import { validateDegreeAnswer, validateChordAnswer } from '@/src/utils/answerValidation'

type PracticeType = 'scale' | 'chord'
type QueueItem = { key: string; degree: number }

const ALL_KEYS = [...KEY_PRIORITY]
const SCALE_DEGREES = [2, 3, 4, 5, 6, 7]
const CHORD_DEGREES = [1, 2, 3, 4, 5, 6, 7]

/** 조표 배지: C → '', G → '♯1', Eb → '♭3' */
function keyBadge(k: string): string {
  const type = getAccidentalType(k)
  if (type === 'none') return ''
  return (type === 'sharp' ? '♯' : '♭') + getAccidentalCount(k)
}

/** 두 키 목록이 (순서 무관) 같은 집합인지 */
function sameKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every(k => setB.has(k))
}

function buildQueue(keys: string[], type: PracticeType): QueueItem[] {
  const degrees = type === 'scale' ? SCALE_DEGREES : CHORD_DEGREES
  const pairs: QueueItem[] = []
  for (const key of keys) {
    for (const degree of degrees) {
      pairs.push({ key, degree })
    }
  }
  return pairs.sort(() => Math.random() - 0.5)
}

export default function FocusTraining() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['C'])
  const [practiceType, setPracticeType] = useState<PracticeType>('scale')
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState<QueueItem>({ key: 'C', degree: 2 })
  const [userInput, setUserInput] = useState('')
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null)
  const [round, setRound] = useState(1)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const [showScale, setShowScale] = useState(false)

  const queueRef = useRef<QueueItem[]>([])
  const nextReadyRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function toggleKey(k: string) {
    setSelectedKeys(prev => {
      if (prev.includes(k)) {
        return prev.length > 1 ? prev.filter(x => x !== k) : prev
      }
      return [...prev, k]
    })
  }

  const handleNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = buildQueue(selectedKeys, practiceType)
      setRound(r => r + 1)
    }
    setCurrent(queueRef.current.pop()!)
    setUserInput('')
    setResult(null)
    nextReadyRef.current = false
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [selectedKeys, practiceType])

  useEffect(() => {
    if (!result) {
      nextReadyRef.current = false
      return
    }
    nextReadyRef.current = false
    const timer = setTimeout(() => { nextReadyRef.current = true }, 300)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && nextReadyRef.current) handleNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
    }
  }, [result, handleNext])

  function start() {
    const queue = buildQueue(selectedKeys, practiceType)
    queueRef.current = queue
    setCurrent(queueRef.current.pop()!)
    setRound(1)
    setStats({ correct: 0, total: 0 })
    setUserInput('')
    setResult(null)
    setShowScale(false)
    setStarted(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSubmit() {
    if (result) return
    let correct = false
    let answer = ''
    if (practiceType === 'scale') {
      answer = getScaleDegree(current.key, current.degree)
      correct = validateDegreeAnswer(userInput.trim(), answer)
    } else {
      answer = getDiatonicChord(current.key, current.degree)
      correct = validateChordAnswer(userInput.trim(), answer)
    }
    setResult({ correct, answer })
    setStats(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
  }

  const scale = getScale(current.key)
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null

  if (!started) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
        <h2 className="text-base font-bold text-fg">집중 훈련</h2>

        <div className="space-y-3">
          <p className="text-xs text-muted font-medium">
            키 선택 <span className="text-faint">({selectedKeys.length}개)</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {KEY_PRESETS.map(preset => {
              const active = sameKeySet(selectedKeys, preset.keys)
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedKeys([...preset.keys])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary/15 text-primary-bright border-primary/50'
                      : 'bg-surface-2 text-muted border-transparent hover:bg-border hover:text-fg'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_KEYS.map(k => {
              const badge = keyBadge(k)
              return (
                <button
                  key={k}
                  onClick={() => toggleKey(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-colors ${
                    selectedKeys.includes(k)
                      ? 'bg-primary text-bg'
                      : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                  }`}
                >
                  {k}
                  {badge && <span className="ml-1 text-[10px] opacity-60 align-super">{badge}</span>}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-faint">
            왼쪽일수록 조표가 적고 자주 쓰이는 키입니다. 배지는 조표 수(♯/♭).
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">훈련 유형</p>
          <div className="flex gap-2">
            {(['scale', 'chord'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPracticeType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  practiceType === t
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                {t === 'scale' ? '스케일 음' : '다이어토닉 코드'}
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
        <div className="flex items-center gap-2">
          <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
            Round {round}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {accuracy !== null && (
            <span className="text-xs text-muted">
              {accuracy}% ({stats.correct}/{stats.total})
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

      <button
        onClick={() => setShowScale(s => !s)}
        className="text-xs text-faint hover:text-fg transition-colors"
      >
        {showScale ? '스케일 숨기기 ▲' : '스케일 보기 ▼'}
      </button>

      {showScale && (
        <div className="bg-surface-2 rounded-xl px-4 py-3 flex gap-3 justify-center">
          {scale.map((note, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className={`text-sm font-mono font-semibold ${
                i + 1 === current.degree ? 'text-primary-bright' : 'text-muted'
              }`}>{note}</span>
              <span className={`text-xs ${
                i + 1 === current.degree ? 'text-primary' : 'text-faint'
              }`}>{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-center py-4">
        <div className="text-2xl font-bold font-mono text-primary-bright mb-1">{current.key} key</div>
        <div className="text-5xl font-bold text-fg mb-2">{current.degree}도</div>
        <div className="text-sm text-muted">
          {practiceType === 'scale' ? '스케일 음은?' : '다이어토닉 7화음은?'}
        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !result) handleSubmit() }}
        disabled={!!result}
        placeholder="답 입력"
        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-fg text-center text-xl font-mono placeholder-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-60"
        autoComplete="off"
      />

      {result && (
        <div className={`rounded-xl p-3 text-center text-sm font-medium animate-reveal ${
          result.correct
            ? 'bg-success/10 border border-success/40 text-success-bright glow-success'
            : 'bg-danger/10 border border-danger/40 text-danger-bright glow-danger'
        }`}>
          {result.correct
            ? '✅ 정답!'
            : <>❌ 오답 — 정답: <span className="font-mono font-bold">{result.answer}</span></>
          }
        </div>
      )}

      {!result ? (
        <button
          onClick={handleSubmit}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 rounded-xl glow-primary transition-all active:scale-[.99]"
        >
          제출
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-2.5 rounded-xl glow-primary transition-all active:scale-[.99]"
        >
          다음 →
        </button>
      )}
    </div>
  )
}
