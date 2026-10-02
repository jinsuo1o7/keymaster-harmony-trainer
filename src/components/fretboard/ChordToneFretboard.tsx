'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { playChord } from '@/src/utils/audioUtils'
import {
  MAX_FRET, QUALITY_LABEL, allTonePositions, chordMidi, chordName, createChordToneSession, fifthCircleRootName,
  degreePitchClass, loadChordToneRecords, pitchClassAt, saveChordToneRecord,
  type ChordQuality, type ChordToneQuestion, type ChordToneRecord, type ChordToneResult, type ChordToneStage, type Degree, type Position,
} from '@/src/utils/chordToneTraining'

const button = 'rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-medium text-fg transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary'
const primary = `${button} border-primary bg-primary text-bg hover:bg-primary-bright`
const STAGES: { id: ChordToneStage; label: string; description: string; detail: string }[] = [
  { id: 'roots', label: '루트 지도', description: '같은 루트를 여섯 줄에서 하나씩 찾아요.', detail: '음 이름과 지판 위치 연결' },
  { id: 'build', label: '코드 만들기', description: '1·3·5·7도를 하나씩 찾아 코드를 완성해요.', detail: '코드의 뼈대 익히기' },
  { id: 'guide', label: '가이드톤', description: '3도와 7도로 코드의 성질을 잡아요.', detail: '다음 코드로 연결하기' },
]
const QUALITIES: ChordQuality[] = ['maj7', 'min7', 'dom7']
const DEGREE_TEXT: Record<Degree, string> = { 1: '1', 3: '3', 5: '5', 7: '7' }
const STRING_ORDER = [5, 4, 3, 2, 1, 0]
const STRING_LINE_WIDTH = ['h-px', 'h-px', 'h-px', 'h-[1.5px]', 'h-[1.5px]', 'h-0.5'] as const
type Hit = Position & { degree: Degree }

function subscribeRecords(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('chord-tone-records', onChange)
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener('chord-tone-records', onChange) }
}
const recordSnapshot = () => JSON.stringify(loadChordToneRecords())
const emptyRecords = () => '[]'

export default function ChordToneFretboard() {
  const [stage, setStage] = useState<ChordToneStage>('roots')
  const [qualities, setQualities] = useState<ChordQuality[]>(['maj7'])
  const [screen, setScreen] = useState<'setup' | 'session' | 'result'>('setup')
  const [questions, setQuestions] = useState<ChordToneQuestion[]>([])
  const [results, setResults] = useState<ChordToneResult[]>([])
  const [hits, setHits] = useState<Hit[]>([])
  const [wrong, setWrong] = useState<Position[]>([])
  const [revealed, setRevealed] = useState(false)
  const [review, setReview] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [error, setError] = useState('')
  const question = questions[results.length]
  const records: ChordToneRecord[] = JSON.parse(useSyncExternalStore(subscribeRecords, recordSnapshot, emptyRecords))
  const submitted = useRef(false)
  const currentStage = STAGES.find(item => item.id === stage)!
  const complete = question !== undefined && hits.length === question.degrees.length
  const correct = results.filter(result => result.clean).length

  function toggleQuality(quality: ChordQuality) {
    setQualities(current => current.includes(quality)
      ? (current.length === 1 ? current : current.filter(item => item !== quality))
      : [...current, quality])
  }

  function start(items = createChordToneSession(stage, qualities), isReview = false) {
    setQuestions(items)
    setResults([])
    setHits([])
    setWrong([])
    setRevealed(false)
    setReview(isReview)
    setStorageError(false)
    setError('')
    submitted.current = false
    setScreen('session')
  }

  function next() {
    if (!question || !complete || submitted.current) return
    submitted.current = true
    const updated = [...results, { question, clean: wrong.length === 0 }]
    setResults(updated)
    if (updated.length === questions.length) {
      if (!review) {
        const saved = saveChordToneRecord({ stage, qualities, correct: updated.filter(item => item.clean).length, total: 8, date: new Date().toISOString() })
        setStorageError(!saved)
        window.dispatchEvent(new Event('chord-tone-records'))
      }
      setScreen('result')
    } else {
      setHits([])
      setWrong([])
      setRevealed(false)
      submitted.current = false
    }
  }

  function tap(position: Position) {
    if (!question || complete || revealed) return
    const key = `${position.string}:${position.fret}`
    if (hits.some(item => `${item.string}:${item.fret}` === key) || wrong.some(item => `${item.string}:${item.fret}` === key)) return
    if (question.stage === 'roots' && hits.some(item => item.string === position.string)) return
    const pitchClass = pitchClassAt(position.string, position.fret)
    const degree = ([1, 3, 5, 7] as Degree[]).find(item => pitchClass === degreePitchClass(question.rootPc, question.quality, item))
    if (degree === undefined || !question.degrees.includes(degree)) { setWrong(current => [...current, position]); return }
    // A repeated degree is still a chord tone. Keep the board quiet instead of
    // calling a musically correct tap wrong; the learner only needs each degree once.
    if (question.stage !== 'roots' && hits.some(item => item.degree === degree)) return
    setHits(current => [...current, { ...position, degree }])
  }

  async function hearChord(item = question) {
    if (!item || playing) return
    setPlaying(true)
    setError('')
    try { await playChord(chordMidi(item.rootPc, item.quality), 1.4) }
    catch { setError('코드를 재생하지 못했어요. 기기의 소리 설정을 확인하고 다시 눌러주세요.') }
    finally { setPlaying(false) }
  }

  const revealedTones = useMemo(() => question && (complete || revealed) ? allTonePositions(question) : [], [question, complete, revealed])
  const toneDegreeAt = (position: Position): Degree | undefined => revealedTones.find(item => item.position.string === position.string && item.position.fret === position.fret)?.degree
  const hitDegreeAt = (position: Position): Degree | undefined => hits.find(item => item.string === position.string && item.fret === position.fret)?.degree

  return <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-label="코드톤 지판">
    {screen === 'setup' && <div className="space-y-7">
      <header><h2 className="text-2xl font-bold tracking-tight">코드톤 지판</h2><p className="mt-2 text-sm leading-relaxed text-muted">그립 하나를 외우지 않고, 지판 전체에서<br />지금 코드에 필요한 음을 찾아요.</p></header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="훈련 단계">
        {STAGES.map((item, index) => <button key={item.id} aria-pressed={stage === item.id} className={`${button} min-h-28 text-left ${stage === item.id ? 'border-primary bg-primary/10' : ''}`} onClick={() => setStage(item.id)}><span className="text-xs text-muted">{index + 1}단계</span><span className="mt-1 block text-base">{item.label}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{item.detail}</span></button>)}
      </div>
      <p className="text-sm leading-relaxed text-muted">{currentStage.description}</p>
      {stage !== 'roots' && <><fieldset className="space-y-3"><legend className="text-sm font-semibold">연습할 코드 성질</legend><div className="grid grid-cols-3 gap-2">{QUALITIES.map(quality => <button key={quality} aria-pressed={qualities.includes(quality)} className={`${button} ${qualities.includes(quality) ? 'border-primary bg-primary/10' : ''}`} onClick={() => toggleQuality(quality)}>{QUALITY_LABEL[quality]}</button>)}</div><p className="text-xs text-muted">선택한 성질 안에서 문제가 섞여 나와요.</p></fieldset><div className="border-y border-border py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">예시: C{QUALITY_LABEL[qualities[0]]}</p><p className="mt-1 text-sm text-muted">코드의 울림을 먼저 들어보세요.</p></div><button className={button} disabled={playing} onClick={() => void hearChord({ rootPc: 0, quality: qualities[0], stage, degrees: [] })}>코드 듣기</button></div></div></>}
      <button className={`${primary} w-full`} onClick={() => start()}>8문제 시작하기</button>
      {records.length > 0 && <p className="text-xs text-muted">최근 완료: {STAGES.find(item => item.id === records[0].stage)?.label} · {records[0].correct}/8</p>}
    </div>}

    {screen === 'session' && question && <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">{review ? '오답 복습' : currentStage.label} · {results.length + 1}/{questions.length}</p><button className="text-sm text-muted underline underline-offset-4" onClick={() => setScreen('setup')}>끝내기</button></div>
      <progress className="h-1.5 w-full accent-primary" value={results.length} max={questions.length} aria-label="완료한 문제" />
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-3xl font-semibold tracking-tight">{question.stage === 'roots' ? fifthCircleRootName(question.rootPc) : chordName(question.rootPc, question.quality)}</h2><p className="mt-1 text-sm text-muted">{complete ? '코드톤을 모두 찾았어요.' : question.stage === 'roots' ? '5도권 순서예요. 여섯 줄에서 루트를 하나씩 찾아보세요.' : '코드톤을 원하는 순서로 모두 찾아보세요.'}</p></div>{question.stage !== 'roots' && <button className={button} disabled={playing} onClick={() => void hearChord()}>코드 듣기</button>}</div>
      <div className="flex gap-2" aria-label="찾아야 할 코드톤">{question.degrees.map((degree, index) => <span key={`${degree}-${index}`} className={`flex h-10 w-10 items-center justify-center rounded-full border font-mono font-semibold ${question.stage === 'roots' ? index < hits.length : hits.some(hit => hit.degree === degree) ? 'border-success bg-success/10 text-success-bright' : 'border-border text-muted'}`}>{DEGREE_TEXT[degree]}</span>)}</div>
      <FretboardGrid hits={hits} wrong={wrong} revealed={complete || revealed} toneDegreeAt={toneDegreeAt} hitDegreeAt={hitDegreeAt} onTap={tap} disabled={complete || revealed} />
      {wrong.length > 0 && !complete && <p role="status" className="text-sm text-danger-bright">빨간 점은 코드톤이 아니에요. 다음 음을 계속 찾아보세요.</p>}
      {!complete && <button className="w-full py-2 text-sm text-muted underline underline-offset-4" onClick={() => setRevealed(true)}>정답 위치 보기</button>}
      {(complete || revealed) && <div className="space-y-4 border-t border-border pt-5"><div role="status"><p className={`font-semibold ${complete && wrong.length === 0 ? 'text-success-bright' : 'text-fg'}`}>{complete ? wrong.length === 0 ? '정확하게 찾았어요.' : '위치를 모두 찾았어요.' : '전체 코드톤을 표시했어요.'}</p><p className="mt-1 text-sm leading-relaxed text-muted">루트는 청록, 찾은 음은 호박, 나머지 코드톤은 윤곽선으로 표시해요.</p></div>{complete && <button className={`${primary} w-full`} onClick={next}>{results.length + 1 === questions.length ? '결과 보기' : '다음 문제'}</button>}</div>}
    </div>}

    {screen === 'result' && <div className="space-y-6"><header><h2 className="text-xl font-semibold">{review ? '오답 복습을 마쳤어요' : '오늘의 지판 기록'}</h2><p className="mt-2 text-sm text-muted">{currentStage.label} · {qualities.map(quality => QUALITY_LABEL[quality]).join(', ')}</p></header><p className="text-5xl font-semibold tracking-tight">{correct}<span className="ml-2 text-xl font-normal text-muted">/ {results.length} 정답</span></p><p className="text-sm leading-relaxed text-muted">{review ? '복습 점수는 본 회차 기록에 합산하지 않아요.' : correct >= 6 ? '지판에서 코드톤을 잘 찾고 있어요. 다음 단계도 시도해 보세요.' : '틀린 문제를 다시 풀면서 루트와 3·7도의 위치를 연결해 보세요.'}</p>{results.some(result => !result.clean) && <button className={`${primary} w-full`} onClick={() => start(results.filter(result => !result.clean).map(result => result.question), true)}>틀린 {results.filter(result => !result.clean).length}문제 다시 풀기</button>}<div className="flex gap-2"><button className={`${button} flex-1`} onClick={() => start()}>같은 범위 8문제</button><button className={`${button} flex-1`} onClick={() => setScreen('setup')}>훈련 선택</button></div><p className="text-xs text-muted">{storageError ? '기기에 기록을 저장하지 못했어요. 이번 결과는 이 화면에서 확인할 수 있어요.' : review ? '복습 완료' : '완료 기록은 이 브라우저에 최근 20회까지 저장해요.'}</p></div>}
    {error && <p role="alert" className="mt-4 text-sm text-danger-bright">{error}</p>}
  </section>
}

function FretboardGrid({ hits, wrong, revealed, toneDegreeAt, hitDegreeAt, onTap, disabled }: { hits: Hit[]; wrong: Position[]; revealed: boolean; toneDegreeAt: (position: Position) => Degree | undefined; hitDegreeAt: (position: Position) => Degree | undefined; onTap: (position: Position) => void; disabled: boolean }) {
  const frets = Array.from({ length: MAX_FRET }, (_, index) => index + 1)
  const positions = [0, ...frets]
  return <div className="w-full rounded-xl border border-border bg-bg p-1.5 sm:p-3"><div className="relative w-full"><FretInlays /><div className="relative z-10 grid grid-cols-[repeat(13,minmax(0,1fr))] text-center text-[10px] text-faint sm:text-xs"><span aria-hidden />{frets.map(fret => <span key={fret}>{fret}</span>)}</div><div className="relative z-10 mt-1 space-y-0.5">{STRING_ORDER.map((string, stringIndex) => <div key={string} className="relative grid grid-cols-[repeat(13,minmax(0,1fr))] items-center"><span aria-hidden className={`pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 bg-muted/70 ${STRING_LINE_WIDTH[stringIndex]}`} />{positions.map(fret => { const position = { string, fret }; const key = `${string}:${fret}`; const isHit = hits.some(item => `${item.string}:${item.fret}` === key); const isWrong = wrong.some(item => `${item.string}:${item.fret}` === key); const tone = revealed ? toneDegreeAt(position) : undefined; const hitDegree = hitDegreeAt(position); const root = (tone ?? hitDegree) === 1; return <button key={key} aria-label={`${6 - string}번 줄 ${fret === 0 ? '개방현' : `${fret}프렛`}`} disabled={disabled || isHit || isWrong} onClick={() => onTap(position)} className={`relative z-10 flex h-8 min-w-0 items-center justify-center border-l border-border/70 text-xs sm:h-11 focus-visible:outline-2 focus-visible:outline-primary ${fret === 0 ? 'border-l-2 border-l-muted/70' : ''} ${isWrong ? 'bg-danger/20 text-danger-bright' : isHit ? 'bg-success/20 text-success-bright' : root ? 'bg-primary/20 text-primary-bright' : tone ? 'text-muted' : 'text-faint hover:bg-surface-2 hover:text-fg'}`}>{(isHit || isWrong || tone !== undefined) ? <span className={`flex h-5 min-w-5 items-center justify-center rounded-full border px-0.5 font-mono text-[10px] font-semibold sm:h-7 sm:min-w-7 sm:px-1 sm:text-xs ${isWrong ? 'border-danger bg-danger text-bg' : isHit ? 'border-success bg-success text-bg' : root ? 'border-primary bg-primary text-bg' : 'border-border text-muted'}`}>{isWrong ? '×' : DEGREE_TEXT[(tone ?? hitDegree)!]}</span> : null}</button> })}</div>)}</div></div></div>
}

function FretInlays() {
  const center = (fret: number) => `${((fret + 0.5) / 13) * 100}%`
  return <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 opacity-45"><>{[3, 5, 7, 9].map(fret => <i key={fret} className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-faint" style={{ left: center(fret) }} />)}<span className="absolute flex -translate-x-1/2 gap-1" style={{ left: center(12) }}><i className="h-2 w-2 rounded-full bg-faint" /><i className="h-2 w-2 rounded-full bg-faint" /></span></></div>
}
