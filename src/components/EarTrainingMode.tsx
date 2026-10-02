'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  PITCH_MODES, PITCH_LEVELS, createPitchSession, pitchNotes, pitchChoices, pitchFeedback,
  missedQuestions, loadPitchRecords, savePitchRecord,
  type PitchMode, type PitchLevel, type PitchQuestion, type PitchResult, type PitchRecord,
} from '@/src/utils/pitchTraining'
import { playPitchNotes } from '@/src/utils/pitchAudio'

const button = 'rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-medium text-fg hover:border-primary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'
const primary = `${button} !bg-primary !text-bg !border-primary hover:!bg-primary-bright`

function subscribeRecords(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('pitch-records', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('pitch-records', onChange)
  }
}
const recordsSnapshot = () => JSON.stringify(loadPitchRecords())
const emptyRecords = () => '[]'

export default function EarTrainingMode() {
  const [mode, setMode] = useState<PitchMode>('direction')
  const [level, setLevel] = useState<PitchLevel>(0)
  const [screen, setScreen] = useState<'setup' | 'session' | 'result'>('setup')
  const [questions, setQuestions] = useState<PitchQuestion[]>([])
  const [results, setResults] = useState<PitchResult[]>([])
  const [selected, setSelected] = useState<number | null | undefined>(undefined)
  const [heard, setHeard] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [review, setReview] = useState(false)
  const records: PitchRecord[] = JSON.parse(useSyncExternalStore(subscribeRecords, recordsSnapshot, emptyRecords))
  const [storageError, setStorageError] = useState(false)
  const playback = useRef<AbortController | null>(null)
  const locked = useRef(false)
  const nextLocked = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const question = questions[results.length]
  const currentMode = PITCH_MODES.find(item => item.id === mode)!
  const answered = selected !== undefined
  const correct = results.filter(result => result.selected === result.question.answer).length

  useEffect(() => () => { playback.current?.abort() }, [])
  useEffect(() => { heading.current?.focus() }, [screen, results.length])

  function stop() {
    playback.current?.abort()
    playback.current = null
    setPlaying(null)
  }

  async function listen(notes: number[], label: string, isQuestion = false) {
    stop()
    const controller = new AbortController()
    playback.current = controller
    setPlaying(label)
    setError('')
    try {
      await playPitchNotes(notes, controller.signal)
      if (!controller.signal.aborted && isQuestion) setHeard(true)
    } catch {
      if (!controller.signal.aborted) setError('소리를 재생하지 못했어요. 기기의 소리 설정을 확인하고 다시 듣기를 눌러주세요.')
    } finally {
      if (!controller.signal.aborted) setPlaying(null)
    }
  }

  function resetAnswer() {
    locked.current = false
    setSelected(undefined)
    setHeard(false)
    setError('')
  }

  function start(items = createPitchSession(mode, level), isReview = false) {
    stop()
    setQuestions(items)
    setResults([])
    setReview(isReview)
    setStorageError(false)
    resetAnswer()
    setScreen('session')
    void listen(pitchNotes(items[0]), '문제 재생 중', true)
  }

  function answer(value: number | null) {
    if (!heard || playing || locked.current || !question) return
    locked.current = true
    nextLocked.current = false
    setSelected(value)
  }

  function next() {
    if (selected === undefined || !question || nextLocked.current) return
    nextLocked.current = true
    stop()
    const updated = [...results, { question, selected }]
    setResults(updated)
    if (updated.length === questions.length) {
      if (!review) {
        setStorageError(!savePitchRecord({ mode, level, correct: updated.filter(item => item.selected === item.question.answer).length, total: 10, date: new Date().toISOString() }))
      }
      window.dispatchEvent(new Event('pitch-records'))
      setScreen('result')
    } else {
      resetAnswer()
      void listen(pitchNotes(questions[updated.length]), '문제 재생 중', true)
    }
  }

  function setup() {
    stop()
    setError('')
    setScreen('setup')
  }

  function example() {
    const choice = pitchChoices(mode, level).find(item => item.id > 0)!
    const sample: PitchQuestion = { mode, root: 60, offset: mode === 'direction' ? [7, 3, 1][level] : choice.id, answer: choice.id, choices: pitchChoices(mode, level) }
    void listen(pitchNotes(sample), `예시: ${choice.label}`)
  }

  const exampleLabel = pitchChoices(mode, level).find(item => item.id > 0)!.label

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-label="피치 트레이닝">
      {screen === 'setup' && <div className="space-y-7">
        <header className="space-y-2">
          <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">피치 트레이닝</h2>
          <p className="text-sm leading-relaxed text-muted">소리의 높이부터, 조 안에서의 자리까지.<br />한 번에 10문제씩 듣고 익혀요.</p>
        </header>
        <div className="grid grid-cols-3 gap-2" aria-label="훈련 단계">
          {PITCH_MODES.map((item, index) => <button key={item.id} aria-pressed={mode === item.id} className={`${button} text-left ${mode === item.id ? '!border-primary !bg-primary/10' : ''}`} onClick={() => { stop(); setError(''); setMode(item.id); setLevel(0) }}>
            <span className="block text-xs text-muted">{index + 1}단계</span><span className="mt-1 block sm:text-lg">{item.title}</span>
          </button>)}
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted">{currentMode.description}</p>
          <label className="block space-y-2"><span className="text-sm font-semibold">연습 범위</span>
            <select className={`${button} w-full`} value={level} onChange={event => { stop(); setError(''); setLevel(Number(event.target.value) as PitchLevel) }}>
              {PITCH_LEVELS[mode].map((label, index) => <option value={index} key={label}>{index + 1}. {label}</option>)}
            </select>
          </label>
        </div>
        <div className="border-y border-border py-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">먼저 소리를 익혀요</p><p className="mt-1 text-sm text-muted">이번 예시의 답은 ‘{exampleLabel}’예요.</p></div><button className={button} onClick={example} disabled={playing !== null}>예시 듣기</button></div>
          <p className="text-xs leading-relaxed text-muted">{mode === 'degree' ? '도–미–솔–도로 조를 잡은 뒤, 잠깐 쉬고 문제음이 나와요. 기준 도는 문제마다 바뀌어요.' : '첫 음을 기억하고 두 번째 음과 비교하세요. 음색과 음량은 같게 들려줘요.'}</p>
        </div>
        <button className={`${primary} w-full`} onClick={() => start()}>10문제 시작하기</button>
        <p className="text-xs text-muted">시간 제한 없이 연습해요. 다시 듣기는 점수에 영향을 주지 않아요.</p>
        {records.length > 0 && <p className="text-xs text-muted">최근 완료: {PITCH_MODES.find(item => item.id === records[0].mode)?.title} · 범위 {records[0].level + 1} · {records[0].correct}/10</p>}
      </div>}

      {screen === 'session' && question && <div className="space-y-5">
        <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">{review ? '오답 복습' : currentMode.title} · {results.length + 1}/{questions.length}</p><button className="text-sm text-muted underline underline-offset-4" onClick={setup}>끝내기</button></div>
        <progress className="h-1.5 w-full accent-primary" value={results.length} max={questions.length} aria-label="완료한 문제" />
        <h2 ref={heading} tabIndex={-1} className="text-center text-xl font-semibold outline-none">{currentMode.prompt}</h2>
        <div className="rounded-xl bg-bg px-4 py-7 text-center space-y-5">
          <div className="flex items-center justify-center gap-4 text-muted" aria-hidden="true"><span className="rounded-full border border-border px-4 py-3">{mode === 'degree' ? '기준 도' : '첫 음'}</span><span>→</span><span className="rounded-full border border-primary/50 px-4 py-3 text-fg">문제음</span></div>
          <button className={button} disabled={playing !== null} onClick={() => { void listen(pitchNotes(question), '문제 재생 중', true) }}>{heard ? '다시 듣기' : '문제 듣기'}</button>
          <p className="text-xs text-muted">{mode === 'degree' ? '도–미–솔–도 → 잠깐 쉼 → 문제음' : '첫 음 → 두 번째 음'}</p>
        </div>
        <div className={`grid gap-2 ${question.choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {question.choices.map(choice => <button key={choice.id} disabled={!heard || playing !== null || answered} className={`${button} min-h-20 px-2 ${answered && choice.id === question.answer ? '!border-success !bg-success/10 !text-success-bright disabled:!opacity-100' : answered && choice.id === selected ? '!border-danger !text-danger-bright disabled:!opacity-100' : ''}`} onClick={() => answer(choice.id)}>
            <span className="block text-base">{choice.label}</span><span className="mt-1 block text-xs">{answered && choice.id === question.answer ? '정답' : answered && choice.id === selected ? '내 선택' : choice.detail}</span>
          </button>)}
        </div>
        {!answered ? <div className="space-y-3"><p className="text-center text-xs text-muted">{heard ? '가장 가깝게 들린 답을 골라주세요.' : '문제를 끝까지 들으면 답을 고를 수 있어요.'}</p><button className="w-full py-2 text-sm text-muted underline underline-offset-4 disabled:opacity-40" disabled={!heard || playing !== null} onClick={() => answer(null)}>모르겠어요 · 정답 보기</button><p className="text-center text-xs text-muted">끝내면 이번 회차 기록은 저장되지 않아요.</p></div>
          : <div className="space-y-4 border-t border-border pt-5">
            <div role="status"><p className={`font-semibold ${selected === question.answer ? 'text-success-bright' : 'text-fg'}`}>{selected === question.answer ? '정확하게 들었어요.' : `정답은 ‘${question.choices.find(item => item.id === question.answer)!.label}’예요.`}</p><p className="mt-1 text-sm leading-relaxed text-muted">{pitchFeedback(question)}</p></div>
            <div className="flex flex-wrap gap-2">{selected != null && selected !== question.answer && <button className={`${button} flex-1`} disabled={playing !== null} onClick={() => { void listen(pitchNotes(question, selected), '내가 고른 답 재생 중') }}>내가 고른 답 듣기</button>}<button className={`${button} flex-1`} disabled={playing !== null} onClick={() => { void listen(pitchNotes(question), '정답 재생 중') }}>정답 듣기</button></div>
            <button className={`${primary} w-full`} onClick={next}>{results.length + 1 === questions.length ? '결과 보기' : '다음 문제'}</button>
          </div>}
      </div>}

      {screen === 'result' && <div className="space-y-6">
        <header><h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{review ? '오답 복습을 마쳤어요' : '오늘의 듣기 기록'}</h2><p className="mt-2 text-sm text-muted">{currentMode.title} · {PITCH_LEVELS[mode][level]}</p></header>
        <p className="text-5xl font-semibold tracking-tight">{correct}<span className="ml-2 text-xl font-normal text-muted">/ {results.length} 정답</span></p>
        <p className="text-sm leading-relaxed text-muted">{review ? '복습 점수는 본 회차 기록에 합산하지 않아요.' : correct >= 8 ? level < 2 ? '잘 구별하고 있어요. 다음 범위에 도전해 보세요.' : '이 범위를 잘 구별했어요. 다른 단계에서도 연습해 보세요.' : '헷갈린 소리를 비교해서 듣고 같은 범위를 한 번 더 연습해 보세요.'}</p>
        {missedQuestions(results).length > 0 && <div className="space-y-3"><h3 className="text-sm font-semibold">다시 들을 소리</h3><ul className="divide-y divide-border">{results.map((result, index) => result.selected !== result.question.answer && <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{index + 1}번 · {result.question.choices.find(item => item.id === result.selected)?.label ?? '모르겠어요'} → <span className="text-success-bright">{result.question.choices.find(item => item.id === result.question.answer)!.label}</span></span><button className={button} disabled={playing !== null} aria-label={`${index + 1}번 정답 듣기`} onClick={() => { void listen(pitchNotes(result.question), `${index + 1}번 정답 재생 중`) }}>듣기</button></li>)}</ul><button className={`${primary} w-full`} onClick={() => start(missedQuestions(results), true)}>틀린 {missedQuestions(results).length}문제 다시 풀기</button></div>}
        <div className="flex flex-wrap gap-2"><button className={`${button} flex-1`} onClick={() => start()}>같은 범위 10문제</button><button className={`${button} flex-1`} onClick={setup}>훈련 선택</button></div>
        <p className="text-xs text-muted">{storageError ? '기기에 기록을 저장하지 못했어요. 이번 결과는 이 화면에서 확인할 수 있어요.' : review ? '복습 완료' : '완료 기록은 이 브라우저에 최근 20회까지 저장해요.'}</p>
      </div>}
      <div aria-live="polite" className="mt-4 text-center text-sm text-muted">{playing && <span>{playing}… <button className="ml-2 underline underline-offset-4" onClick={stop}>재생 중지</button></span>}</div>
      {error && <p role="alert" className="mt-3 text-sm text-danger-bright">{error}</p>}
    </section>
  )
}
