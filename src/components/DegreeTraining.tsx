'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KEY_PRESETS, KEY_PRIORITY } from '@/src/data/musicTheory'
import { validateDegreeAnswer } from '@/src/utils/answerValidation'
import { getAccidentalCount, getAccidentalType, getScale, getScaleDegree } from '@/src/utils/musicTheoryUtils'

type QueueItem = { key: string; degree: number }

interface DegreeTrainingProps {
  onAnswer: (correct: boolean) => void
}

function buildQueue(keys: string[], degrees: number[]): QueueItem[] {
  return keys.flatMap(key => degrees.map(degree => ({ key, degree }))).sort(() => Math.random() - 0.5)
}

function sameKeySet(left: string[], right: string[]) {
  return left.length === right.length && left.every(key => right.includes(key))
}

function keyBadge(key: string) {
  const type = getAccidentalType(key)
  return type === 'none' ? '' : `${type === 'sharp' ? '♯' : '♭'}${getAccidentalCount(key)}`
}

export default function DegreeTraining({ onAnswer }: DegreeTrainingProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['C', 'F', 'Bb', 'Eb', 'Ab', 'G', 'D'])
  const [selectedDegrees, setSelectedDegrees] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState<QueueItem>({ key: 'C', degree: 1 })
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<{ correct: boolean; note: string } | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const [round, setRound] = useState(1)
  const [showScale, setShowScale] = useState(false)
  const queue = useRef<QueueItem[]>([])
  const input = useRef<HTMLInputElement | null>(null)

  const next = useCallback(() => {
    if (queue.current.length === 0) {
      queue.current = buildQueue(selectedKeys, selectedDegrees)
      setRound(value => value + 1)
    }
    setCurrent(queue.current.pop()!)
    setAnswer('')
    setResult(null)
    setShowScale(false)
    window.setTimeout(() => input.current?.focus(), 0)
  }, [selectedDegrees, selectedKeys])

  function toggleKey(key: string) {
    setSelectedKeys(keys => keys.includes(key)
      ? (keys.length === 1 ? keys : keys.filter(item => item !== key))
      : [...keys, key])
  }

  function toggleDegree(degree: number) {
    setSelectedDegrees(degrees => degrees.includes(degree)
      ? (degrees.length === 1 ? degrees : degrees.filter(item => item !== degree))
      : [...degrees, degree].sort((left, right) => left - right))
  }

  function start() {
    queue.current = buildQueue(selectedKeys, selectedDegrees)
    setCurrent(queue.current.pop()!)
    setStats({ correct: 0, total: 0 })
    setRound(1)
    setAnswer('')
    setResult(null)
    setShowScale(false)
    setStarted(true)
    window.setTimeout(() => input.current?.focus(), 0)
  }

  function submit() {
    if (result || answer.trim() === '') return
    const note = getScaleDegree(current.key, current.degree)
    const correct = validateDegreeAnswer(answer, note)
    setResult({ correct, note })
    setStats(value => ({ correct: value.correct + Number(correct), total: value.total + 1 }))
    onAnswer(correct)
  }

  const scale = getScale(current.key)
  const accuracy = stats.total === 0 ? null : Math.round((stats.correct / stats.total) * 100)

  if (!started) {
    return <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-labelledby="degree-training-title">
      <header className="space-y-2">
        <h2 id="degree-training-title" className="text-2xl font-bold tracking-tight">키-도수 즉답 훈련</h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted">키와 도수를 보면 음이름이 바로 떠오르도록 반복합니다. 설명을 읽는 대신, 선택한 모든 조합을 한 번씩 풀어요.</p>
      </header>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">연습할 키</legend>
        <div className="flex flex-wrap gap-2">
          {KEY_PRESETS.map(preset => {
            const active = sameKeySet(selectedKeys, preset.keys)
            return <button key={preset.id} type="button" onClick={() => setSelectedKeys([...preset.keys])} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? 'border-primary bg-primary/15 text-primary-bright' : 'border-border bg-surface-2 text-muted hover:bg-border hover:text-fg'}`}>{preset.label}</button>
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {KEY_PRIORITY.map(key => {
            const badge = keyBadge(key)
            const selected = selectedKeys.includes(key)
            return <button key={key} type="button" aria-pressed={selected} onClick={() => toggleKey(key)} className={`rounded-lg px-3 py-2 font-mono text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'bg-primary text-bg' : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'}`}>{key}{badge && <span className="ml-1 text-[10px] opacity-60 align-super">{badge}</span>}</button>
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-border pt-5">
        <legend className="text-sm font-semibold">출제 도수</legend>
        <div className="grid grid-cols-7 gap-2" role="group" aria-label="출제할 도수">
          {[1, 2, 3, 4, 5, 6, 7].map(degree => {
            const selected = selectedDegrees.includes(degree)
            return <button key={degree} type="button" aria-pressed={selected} onClick={() => toggleDegree(degree)} className={`rounded-lg py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'bg-primary text-bg' : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'}`}>{degree}</button>
          })}
        </div>
        <p className="text-xs text-muted">한 라운드에 {selectedKeys.length * selectedDegrees.length}문제를 풉니다.</p>
      </fieldset>

      <button type="button" onClick={start} className="w-full rounded-xl bg-primary py-3 font-semibold text-bg transition-colors hover:bg-primary-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">훈련 시작</button>
    </section>
  }

  return <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-labelledby="degree-question-title">
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span>라운드 {round}</span>
      <div className="flex items-center gap-3"><span>{accuracy === null ? '첫 문제' : `정답 ${stats.correct}/${stats.total} · ${accuracy}%`}</span><button type="button" onClick={() => setStarted(false)} className="underline underline-offset-4 hover:text-fg">설정</button></div>
    </div>

    <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-8 text-center">
      <p className="text-sm text-primary-bright">이 키에서</p>
      <h2 id="degree-question-title" className="mt-1 font-mono text-4xl font-bold tracking-tight text-fg">{current.key} major</h2>
      <p className="mt-5 text-6xl font-bold tabular-nums text-primary-bright">{current.degree}<span className="ml-1 text-2xl">도</span></p>
      <p className="mt-3 text-sm text-muted">음이름은?</p>
    </div>

    <div className="space-y-3">
      <label htmlFor="degree-answer" className="sr-only">음이름 답</label>
      <input id="degree-answer" ref={input} type="text" value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') result ? next() : submit() }} disabled={result !== null} placeholder="예: F# 또는 Bb" autoComplete="off" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center font-mono text-2xl text-fg placeholder:text-base placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" />
      {!result ? <button type="button" onClick={submit} disabled={answer.trim() === ''} className="w-full rounded-xl bg-primary py-3 font-semibold text-bg transition-colors hover:bg-primary-bright disabled:opacity-40">정답 확인</button> : <button type="button" onClick={next} className="w-full rounded-xl bg-primary py-3 font-semibold text-bg transition-colors hover:bg-primary-bright">다음 문제</button>}
    </div>

    {result && <div role="status" className={`animate-reveal rounded-xl border p-4 text-center ${result.correct ? 'border-success/40 bg-success/10 text-success-bright' : 'border-danger/40 bg-danger/10 text-danger-bright'}`}><p className="font-semibold">{result.correct ? '정답이에요.' : `정답은 ${result.note}예요.`}</p><p className="mt-1 text-sm">{current.key} major의 {current.degree}도 = {result.note}</p></div>}

    <div className="border-t border-border pt-4"><button type="button" onClick={() => setShowScale(value => !value)} className="text-sm text-muted underline underline-offset-4 hover:text-fg">{showScale ? '음계 숨기기' : '막힐 때 음계 확인'}</button>{showScale && <div className="mt-3 grid grid-cols-7 rounded-xl bg-surface-2 px-2 py-3 text-center">{scale.map((note, index) => <div key={note} className={index + 1 === current.degree ? 'text-primary-bright' : 'text-muted'}><p className="font-mono text-sm font-semibold">{note}</p><p className="mt-1 text-xs">{index + 1}</p></div>)}</div>}</div>
  </section>
}
