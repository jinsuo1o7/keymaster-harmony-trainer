'use client'

import { useMemo, useState } from 'react'
import { playMidi, playMidiSequence } from '@/src/utils/audioUtils'
import { SCALE_MAX_FRET, SCALE_OPEN_MIDI, SCALES, isScaleTone, noteAt, scaleById, scaleMidi, scaleNoteNames, type ScaleId } from '@/src/utils/scaleLearning'

const button = 'rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-fg transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-40'
const STRING_ORDER = [5, 4, 3, 2, 1, 0]
const STRING_LINE_WIDTH = ['h-px', 'h-px', 'h-px', 'h-[1.5px]', 'h-[1.5px]', 'h-0.5'] as const

export default function ScaleLearning() {
  const [scaleId, setScaleId] = useState<ScaleId>('major')
  const [root, setRoot] = useState(0)
  const [notation, setNotation] = useState<'degree' | 'note'>('degree')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const scale = scaleById(scaleId)
  const notes = useMemo(() => scaleNoteNames(root, scale), [root, scale])

  async function hearScale() {
    if (playing) return
    setPlaying(true); setError('')
    try { await playMidiSequence(scaleMidi(root, scale), { noteDur: 0.42, gap: 0.08 }) }
    catch { setError('스케일을 재생하지 못했어요. 기기의 소리 설정을 확인하고 다시 눌러주세요.') }
    finally { setPlaying(false) }
  }
  async function hearNote(string: number, fret: number) {
    if (playing) return
    setPlaying(true); setError('')
    try { await playMidi(SCALE_OPEN_MIDI[string] + fret, 0.75) }
    catch { setError('음을 재생하지 못했어요. 기기의 소리 설정을 확인하고 다시 눌러주세요.') }
    finally { setPlaying(false) }
  }

  return <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-label="스케일 학습">
    <div className="space-y-7"><header><h2 className="text-2xl font-bold tracking-tight">스케일 지도</h2><p className="mt-2 text-sm leading-relaxed text-muted">공식, 구성음, 지판 위치를 같은 순서로 보세요.<br />각 점을 누르면 실제 음을 들을 수 있어요.</p></header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="스케일 선택">{SCALES.map(item => <button key={item.id} aria-pressed={scaleId === item.id} className={`${button} min-h-16 text-left ${scaleId === item.id ? 'border-primary bg-primary/10' : ''}`} onClick={() => setScaleId(item.id)}><span>{item.name}</span><span className="mt-1 block text-xs text-muted">{item.family === 'pentatonic' ? '5음' : '7음'}</span></button>)}</div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label className="space-y-2"><span className="block text-sm font-semibold">루트</span><select className={`${button} w-full`} value={root} onChange={event => setRoot(Number(event.target.value))}>{Array.from({ length: 12 }, (_, pc) => <option value={pc} key={pc}>{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc]}</option>)}</select></label><div className="flex items-end gap-2"><button className={`${button} flex-1 sm:flex-none`} aria-pressed={notation === 'degree'} onClick={() => setNotation('degree')}>음정도</button><button className={`${button} flex-1 sm:flex-none`} aria-pressed={notation === 'note'} onClick={() => setNotation('note')}>음 이름</button></div></div>
      <div className="border-y border-border py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xl font-semibold">{notes[0]} {scale.name}</p><p className="mt-1 text-sm text-muted">{scale.description}</p></div><button className={button} disabled={playing} onClick={() => void hearScale()}>스케일 듣기</button></div><ol className="mt-5 flex flex-wrap gap-2" aria-label="스케일 구성음">{scale.formula.map((degree, index) => <li key={degree} className={`min-w-11 rounded-full border px-3 py-2 text-center font-mono text-sm ${index === 0 ? 'border-primary bg-primary/10 text-primary-bright' : 'border-border text-fg'}`}><span className="block">{notation === 'degree' ? degree : notes[index]}</span><span className="mt-0.5 block font-sans text-[10px] text-muted">{notation === 'degree' ? notes[index] : degree}</span></li>)}</ol></div>
      <ScaleFretboard root={root} scaleId={scaleId} notation={notation} onTap={hearNote} disabled={playing} />
      <div className="rounded-xl bg-bg px-4 py-4 text-sm leading-relaxed text-muted"><p><span className="font-semibold text-fg">읽는 법.</span> 청록은 루트(1도), 호박은 스케일의 다른 음이에요. 음정도로 볼 때는 루트에서 몇 반음 떨어졌는지, 음 이름으로 볼 때는 실제 지판의 음을 확인하세요.</p></div>
      {error && <p role="alert" className="text-sm text-danger-bright">{error}</p>}
    </div>
  </section>
}

function ScaleFretboard({ root, scaleId, notation, onTap, disabled }: { root: number; scaleId: ScaleId; notation: 'degree' | 'note'; onTap: (string: number, fret: number) => void; disabled: boolean }) {
  const scale = scaleById(scaleId)
  const degreeAt = (string: number, fret: number) => scale.semitones.indexOf((SCALE_OPEN_MIDI[string] + fret - root + 120) % 12)
  const frets = Array.from({ length: SCALE_MAX_FRET }, (_, index) => index + 1)
  const positions = [0, ...frets]
  return <div className="w-full rounded-xl border border-border bg-bg p-1.5 sm:p-3"><div className="relative w-full"><FretInlays /><div className="relative z-10 grid grid-cols-[repeat(13,minmax(0,1fr))] text-center text-[10px] text-faint sm:text-xs"><span aria-hidden />{frets.map(fret => <span key={fret}>{fret}</span>)}</div><div className="relative z-10 mt-1 space-y-0.5">{STRING_ORDER.map((string, stringIndex) => <div key={string} className="relative grid grid-cols-[repeat(13,minmax(0,1fr))] items-center"><span aria-hidden className={`pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 bg-muted/70 ${STRING_LINE_WIDTH[stringIndex]}`} />{positions.map(fret => { const inScale = isScaleTone(root, scale, string, fret); const degreeIndex = inScale ? degreeAt(string, fret) : -1; const isRoot = degreeIndex === 0; const label = notation === 'degree' ? scale.formula[degreeIndex] : noteAt(string, fret); return <button key={fret} aria-label={`${6 - string}번 줄 ${fret === 0 ? '개방현' : `${fret}프렛`}${inScale ? ` ${label}` : ''}`} disabled={disabled || (!inScale && fret !== 0)} onClick={() => void onTap(string, fret)} className={`relative z-10 flex h-8 min-w-0 items-center justify-center border-l border-border/70 text-xs sm:h-11 focus-visible:outline-2 focus-visible:outline-primary ${fret === 0 ? 'border-l-2 border-l-muted/70' : ''} ${inScale || fret === 0 ? 'hover:bg-surface-2' : 'cursor-default'}`}>{fret === 0 ? <span className="font-mono text-[10px] text-muted sm:text-xs">{noteAt(string, fret)}</span> : inScale && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full border px-0.5 font-mono text-[10px] font-semibold sm:h-7 sm:min-w-7 sm:px-1 sm:text-xs ${isRoot ? 'border-primary bg-primary text-bg' : 'border-success bg-success/10 text-success-bright'}`}>{label}</span>}</button> })}</div>)}</div></div></div>
}

function FretInlays() {
  const center = (fret: number) => `${((fret + 0.5) / 13) * 100}%`
  return <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 opacity-45"><>{[3, 5, 7, 9].map(fret => <i key={fret} className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-faint" style={{ left: center(fret) }} />)}<span className="absolute flex -translate-x-1/2 gap-1" style={{ left: center(12) }}><i className="h-2 w-2 rounded-full bg-faint" /><i className="h-2 w-2 rounded-full bg-faint" /></span></></div>
}
