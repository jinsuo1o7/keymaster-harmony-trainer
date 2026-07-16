# 코드톤 지판 연습 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기타 지판 위에서 앱이 시작점을 강조하면 학습자가 코드톤을 7→1→3→5 순서로 짚어 Maj7/min7 아르페지오 모양을 완성하는 새 "지판" 탭을 추가한다.

**Architecture:** 순수 로직(튜닝·음 매핑·셰이프 전위·채점)은 `fretboardUtils.ts`에 모으고 vitest로 고정한다. 표현 전용 SVG `Fretboard.tsx`가 클릭만 위로 올리고, 컨테이너 `ChordToneFretboard.tsx`가 문제 생성·단계·채점·오디오·진도를 소유한다. 기존 음감훈련(`ChordIdentify`)의 "시작 화면 → 진행 → 피드백" 패턴과 `earTrainingProgress`·`audioUtils`를 그대로 재사용한다.

**Tech Stack:** Next.js(프로젝트 커스텀 빌드), React 클라이언트 컴포넌트(`'use client'`), TypeScript, Tailwind(커스텀 토큰), vitest, Web Audio(`audioUtils`).

## Global Constraints

- 코드 퀄리티는 **Maj7, min7** 두 개만. (Dom7·m7b5·삼화음 등은 비목표 — 셰이프 표 확장으로 후속.)
- 퀄리티당 셰이프는 **1개**만 정의.
- 짚는 순서는 항상 **7 → 1 → 3 → 5** 고정.
- 표준 튜닝 개방현 MIDI: `[40, 45, 50, 55, 59, 64]` (인덱스 0=저음 6번줄 E, 5=고음 1번줄 E).
- 지판 프렛 범위: 0–15 (`MAX_FRET = 15`).
- 난이도 3단계 고정: `guided`(가이드) · `anchor`(시작점만) · `find`(시작점 찾기).
- 새 파일은 앱 컨벤션을 따른다: 클라이언트 컴포넌트 상단 `'use client'`, 임포트는 `@/src/...` 별칭, Tailwind 토큰(`surface`, `surface-2`, `border`, `primary`, `primary-bright`, `muted`, `faint`, `success`, `success-bright`, `danger`, `danger-bright`, `glow-primary`, `bg`, `fg`).
- 커밋은 이 기능 파일만 `git add`로 명시(저장소에 관련 없는 dirty 변경이 많음). 작업은 전용 브랜치에서.

---

### Task 0: 브랜치 + 스펙 커밋

**Files:**
- Commit: `docs/superpowers/specs/2026-07-16-chord-tone-fretboard-design.md` (이미 작성됨)

- [ ] **Step 1: 기능 브랜치 생성**

Run:
```bash
git checkout -b feat/chord-tone-fretboard
```

- [ ] **Step 2: 스펙 문서만 커밋**

```bash
git add docs/superpowers/specs/2026-07-16-chord-tone-fretboard-design.md
git commit -m "docs: chord-tone fretboard practice design spec"
```

---

### Task 1: `fretboardUtils` — 데이터 + 순수 함수

**Files:**
- Create: `src/utils/fretboardUtils.ts`
- Test: `src/utils/fretboardUtils.test.ts`

**Interfaces:**
- Consumes: 없음(순수 상수/함수).
- Produces:
  - `OPEN_MIDI: readonly number[]`
  - `MAX_FRET: number`
  - `type Quality = 'maj7' | 'min7'`
  - `type Degree = 1 | 3 | 5 | 7`
  - `type Stage = 'guided' | 'anchor' | 'find'`
  - `interface ShapeNote { string: number; fretOffset: number; degree: Degree }`
  - `SHAPES: Record<Quality, ShapeNote[]>` (오프셋은 A현(인덱스1) 루트 기준, 루트 = fretOffset 0)
  - `TAP_ORDER: Degree[]` = `[7, 1, 3, 5]`
  - `DEGREE_SEMITONES: Record<Quality, Record<Degree, number>>`
  - `NOTE_NAMES: readonly string[]`
  - `midiAt(string: number, fret: number): number`
  - `pitchClassAt(string: number, fret: number): number`
  - `noteNameAt(string: number, fret: number): string`
  - `chordLabel(quality: Quality, rootPc: number): string`
  - `shapeNoteFor(quality: Quality, degree: Degree): ShapeNote`
  - `expectedPosition(quality: Quality, anchorFret: number, degree: Degree): { string: number; fret: number }`
  - `anchorFretRange(stage: Stage): { min: number; max: number }`
  - `pickAnchor(stage: Stage, rng?: () => number): number`
  - `shapeMidis(quality: Quality, anchorFret: number): number[]` (TAP_ORDER 순서)
  - `rootPcAt(quality: Quality, anchorFret: number): number`
  - `degreePc(quality: Quality, rootPc: number, degree: Degree): number`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/utils/fretboardUtils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  OPEN_MIDI, MAX_FRET, SHAPES, TAP_ORDER, DEGREE_SEMITONES,
  midiAt, pitchClassAt, noteNameAt, chordLabel,
  expectedPosition, anchorFretRange, pickAnchor, shapeMidis, degreePc,
  type Quality,
} from './fretboardUtils'

describe('note mapping', () => {
  it('maps (string, fret) to midi via open strings', () => {
    expect(midiAt(1, 0)).toBe(45)   // open A
    expect(midiAt(1, 3)).toBe(48)   // C on A string
    expect(midiAt(5, 12)).toBe(76)  // high E + octave
  })
  it('reduces to pitch class', () => {
    expect(pitchClassAt(1, 3)).toBe(0) // C
    expect(pitchClassAt(0, 0)).toBe(4) // E
  })
  it('names notes with sharps', () => {
    expect(noteNameAt(1, 3)).toBe('C')
    expect(noteNameAt(0, 1)).toBe('F')
  })
})

describe('shapes are real chord tones', () => {
  const qualities: Quality[] = ['maj7', 'min7']
  it.each(qualities)('%s notes match degree semitones at any anchor', (q) => {
    for (const anchor of [0, 3, 7, 12]) {
      const rootMidi = midiAt(1, anchor) // root sits on A string at anchor
      for (const n of SHAPES[q]) {
        const interval = (midiAt(n.string, anchor + n.fretOffset) - rootMidi + 120) % 12
        expect(interval).toBe(DEGREE_SEMITONES[q][n.degree])
      }
    }
  })
  it('every shape has exactly degrees 1,3,5,7', () => {
    for (const q of qualities) {
      expect(SHAPES[q].map(n => n.degree).sort()).toEqual([1, 3, 5, 7])
    }
  })
})

describe('expectedPosition + shapeMidis follow TAP_ORDER', () => {
  it('gives absolute frets for a maj7 anchor', () => {
    // maj7: 1@A+0, 5@D+2, 7@G+1, 3@B+2
    expect(expectedPosition('maj7', 5, 1)).toEqual({ string: 1, fret: 5 })
    expect(expectedPosition('maj7', 5, 7)).toEqual({ string: 3, fret: 6 })
    expect(expectedPosition('maj7', 5, 3)).toEqual({ string: 4, fret: 7 })
    expect(expectedPosition('maj7', 5, 5)).toEqual({ string: 2, fret: 7 })
  })
  it('shapeMidis is ordered 7,1,3,5 ascending-ish and in range', () => {
    const midis = shapeMidis('maj7', 5)
    expect(midis).toHaveLength(4)
    expect(midis[0]).toBe(midiAt(3, 6)) // the 7th, tapped first
  })
})

describe('anchor selection stays on the board', () => {
  it.each(['guided', 'anchor', 'find'] as const)('%s keeps shape within 0..MAX_FRET', (stage) => {
    const { min, max } = anchorFretRange(stage)
    for (let i = 0; i < 200; i++) {
      const a = pickAnchor(stage)
      expect(a).toBeGreaterThanOrEqual(min)
      expect(a).toBeLessThanOrEqual(max)
      for (const q of ['maj7', 'min7'] as const) {
        for (const n of SHAPES[q]) {
          const f = a + n.fretOffset
          expect(f).toBeGreaterThanOrEqual(0)
          expect(f).toBeLessThanOrEqual(MAX_FRET)
        }
      }
    }
  })
})

describe('labels + degree pitch classes', () => {
  it('labels chords by root pitch class', () => {
    expect(chordLabel('maj7', 0)).toBe('Cmaj7')
    expect(chordLabel('min7', 9)).toBe('Am7')
  })
  it('degreePc computes the note pitch class for a target root', () => {
    expect(degreePc('maj7', 0, 7)).toBe(11) // B is the 7th of C
    expect(degreePc('min7', 9, 3)).toBe(0)  // C is the b3 of Am
  })
})

it('constants sanity', () => {
  expect(OPEN_MIDI).toEqual([40, 45, 50, 55, 59, 64])
  expect(TAP_ORDER).toEqual([7, 1, 3, 5])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/fretboardUtils.test.ts`
Expected: FAIL — `fretboardUtils` 모듈/함수 미정의.

- [ ] **Step 3: 최소 구현 작성**

Create `src/utils/fretboardUtils.ts`:
```ts
// Pure fretboard model for the chord-tone practice.
// Everything is derived from open-string MIDI + relative shape offsets so a
// single shape per quality transposes to every key by shifting the anchor fret.

export const OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const // 6th(lowE)..1st(highE)
export const MAX_FRET = 15

export type Quality = 'maj7' | 'min7'
export type Degree = 1 | 3 | 5 | 7
export type Stage = 'guided' | 'anchor' | 'find'

export interface ShapeNote {
  string: number      // 0..5, index into OPEN_MIDI
  fretOffset: number  // relative to the root sitting on the A string (index 1)
  degree: Degree
}

// Compact A-shaped grips. Offsets are relative to the root on the A string
// (root = fretOffset 0). min7 = maj7 with the 3rd and 7th lowered one fret.
export const SHAPES: Record<Quality, ShapeNote[]> = {
  maj7: [
    { string: 1, fretOffset: 0, degree: 1 },
    { string: 3, fretOffset: 1, degree: 7 },
    { string: 4, fretOffset: 2, degree: 3 },
    { string: 2, fretOffset: 2, degree: 5 },
  ],
  min7: [
    { string: 1, fretOffset: 0, degree: 1 },
    { string: 3, fretOffset: 0, degree: 7 },
    { string: 4, fretOffset: 1, degree: 3 },
    { string: 2, fretOffset: 2, degree: 5 },
  ],
}

export const TAP_ORDER: Degree[] = [7, 1, 3, 5]

export const DEGREE_SEMITONES: Record<Quality, Record<Degree, number>> = {
  maj7: { 1: 0, 3: 4, 5: 7, 7: 11 },
  min7: { 1: 0, 3: 3, 5: 7, 7: 10 },
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiAt(string: number, fret: number): number {
  return OPEN_MIDI[string] + fret
}

export function pitchClassAt(string: number, fret: number): number {
  return midiAt(string, fret) % 12
}

export function noteNameAt(string: number, fret: number): string {
  return NOTE_NAMES[pitchClassAt(string, fret)]
}

export function chordLabel(quality: Quality, rootPc: number): string {
  const root = NOTE_NAMES[rootPc]
  return quality === 'maj7' ? `${root}maj7` : `${root}m7`
}

export function shapeNoteFor(quality: Quality, degree: Degree): ShapeNote {
  const n = SHAPES[quality].find(s => s.degree === degree)
  if (!n) throw new Error(`no ${degree} in ${quality}`)
  return n
}

export function expectedPosition(quality: Quality, anchorFret: number, degree: Degree) {
  const n = shapeNoteFor(quality, degree)
  return { string: n.string, fret: anchorFret + n.fretOffset }
}

export function anchorFretRange(stage: Stage): { min: number; max: number } {
  // Shape spans fretOffset 0..2, so the highest usable anchor is MAX_FRET - 2.
  const hi = MAX_FRET - 2
  return stage === 'guided' ? { min: 2, max: 9 } : { min: 0, max: hi }
}

export function pickAnchor(stage: Stage, rng: () => number = Math.random): number {
  const { min, max } = anchorFretRange(stage)
  return min + Math.floor(rng() * (max - min + 1))
}

export function rootPcAt(quality: Quality, anchorFret: number): number {
  return pitchClassAt(1, anchorFret) // root is on the A string at the anchor
}

export function degreePc(quality: Quality, rootPc: number, degree: Degree): number {
  return (rootPc + DEGREE_SEMITONES[quality][degree]) % 12
}

export function shapeMidis(quality: Quality, anchorFret: number): number[] {
  return TAP_ORDER.map(d => {
    const p = expectedPosition(quality, anchorFret, d)
    return midiAt(p.string, p.fret)
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/fretboardUtils.test.ts`
Expected: PASS (모든 케이스).

- [ ] **Step 5: 커밋**

```bash
git add src/utils/fretboardUtils.ts src/utils/fretboardUtils.test.ts
git commit -m "feat: fretboard pure utils — tuning, chord-tone shapes, grading helpers"
```

---

### Task 2: `earTrainingProgress`에 `fretboard` 스테이지 추가

**Files:**
- Modify: `src/utils/earTrainingProgress.ts`
- Test: `src/utils/fretboardProgress.test.ts` (Create)

**Interfaces:**
- Consumes: 기존 `recordEarResult`, `loadEarProgress`, `EarProgress`.
- Produces: `EarStage`에 `'fretboard'`, `MissMap`에 `'fretboardMisses'`, `EarProgress`에 `fretboard: EarStageStats` + `fretboardMisses: Record<string, number>`.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/utils/fretboardProgress.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadEarProgress, recordEarResult } from './earTrainingProgress'

beforeEach(() => localStorage.clear())

describe('fretboard progress', () => {
  it('starts blank with a fretboard stage', () => {
    const p = loadEarProgress()
    expect(p.fretboard).toEqual({ correct: 0, total: 0, bestStreak: 0 })
    expect(p.fretboardMisses).toEqual({})
  })
  it('records a fretboard result and weights misses per quality', () => {
    const p = recordEarResult({
      stage: 'fretboard', correct: false, streak: 0,
      missKey: 'fretboardMisses', missItems: ['maj7'],
    })
    expect(p.fretboard.total).toBe(1)
    expect(p.fretboard.correct).toBe(0)
    expect(p.fretboardMisses.maj7).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/utils/fretboardProgress.test.ts`
Expected: FAIL — `p.fretboard` undefined / 타입 에러.

- [ ] **Step 3: 최소 구현 작성**

Edit `src/utils/earTrainingProgress.ts`:

Line 8 union 확장:
```ts
export type EarStage = 'identify' | 'melody' | 'chord' | 'progression' | 'fretboard'
export type MissMap = 'degreeMisses' | 'chordMisses' | 'progressionMisses' | 'fretboardMisses'
```

`EarProgress` 인터페이스에 두 필드 추가(progression 다음):
```ts
  progression: EarStageStats
  fretboard: EarStageStats
  degreeMisses: Record<string, number>
  chordMisses: Record<string, number>
  progressionMisses: Record<string, number>
  fretboardMisses: Record<string, number>
```

`blankProgress()`에 추가:
```ts
    progression: blankStats(),
    fretboard: blankStats(),
    degreeMisses: {},
    chordMisses: {},
    progressionMisses: {},
    fretboardMisses: {},
```

`loadEarProgress()`의 반환 객체에 추가:
```ts
      progression: { ...blankStats(), ...p.progression },
      fretboard: { ...blankStats(), ...p.fretboard },
      degreeMisses: p.degreeMisses ?? {},
      chordMisses: p.chordMisses ?? {},
      progressionMisses: p.progressionMisses ?? {},
      fretboardMisses: p.fretboardMisses ?? {},
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/utils/fretboardProgress.test.ts`
Expected: PASS. 회귀 확인: `npx vitest run src/utils/earTrainingUtils.test.ts` PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/utils/earTrainingProgress.ts src/utils/fretboardProgress.test.ts
git commit -m "feat: track fretboard stage + per-quality misses in ear progress"
```

---

### Task 3: `Fretboard` SVG 표현 컴포넌트

**Files:**
- Create: `src/components/fretboard/Fretboard.tsx`

**Interfaces:**
- Consumes: `MAX_FRET`, `OPEN_MIDI` from `fretboardUtils`.
- Produces:
  ```ts
  interface Marker { string: number; fret: number; kind: 'start' | 'done' | 'hint' | 'wrong'; label?: string }
  interface FretboardProps {
    markers: Marker[]
    onFretClick: (string: number, fret: number) => void
    disabled?: boolean
  }
  export default function Fretboard(props: FretboardProps): JSX.Element
  ```
  `kind` 색: `start`=primary 강조, `done`=success, `hint`=흐린 점(+`label` 도수), `wrong`=danger 플래시.

- [ ] **Step 1: 구현 작성** (표현 전용 — 단위 테스트 대신 앱 구동으로 검증)

Create `src/components/fretboard/Fretboard.tsx`:
```tsx
'use client'
import { MAX_FRET, OPEN_MIDI } from '@/src/utils/fretboardUtils'

export interface Marker {
  string: number
  fret: number
  kind: 'start' | 'done' | 'hint' | 'wrong'
  label?: string
}

interface FretboardProps {
  markers: Marker[]
  onFretClick: (string: number, fret: number) => void
  disabled?: boolean
}

const FRET_W = 40
const STRING_GAP = 26
const PAD_L = 16
const PAD_T = 16
const DOTS = [3, 5, 7, 9, 12, 15]
const STRINGS = OPEN_MIDI.length // 6

// High E (index 5) drawn at the top, low E (index 0) at the bottom.
const yFor = (s: number) => PAD_T + (STRINGS - 1 - s) * STRING_GAP
const xFor = (f: number) => PAD_L + f * FRET_W

const FILL: Record<Marker['kind'], string> = {
  start: 'var(--color-primary, #6ee7b7)',
  done: 'var(--color-success, #34d399)',
  hint: 'transparent',
  wrong: 'var(--color-danger, #f87171)',
}

export default function Fretboard({ markers, onFretClick, disabled }: FretboardProps) {
  const width = PAD_L * 2 + (MAX_FRET + 1) * FRET_W
  const height = PAD_T * 2 + (STRINGS - 1) * STRING_GAP
  const markerAt = (s: number, f: number) =>
    markers.find(m => m.string === s && m.fret === f)

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-2 border border-border p-2">
      <svg width={width} height={height + 20} className="select-none">
        {/* fret wires */}
        {Array.from({ length: MAX_FRET + 2 }, (_, f) => (
          <line key={`v${f}`} x1={xFor(f)} y1={yFor(STRINGS - 1)} x2={xFor(f)}
            y2={yFor(0)} stroke="var(--color-border, #333)" strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {/* strings */}
        {OPEN_MIDI.map((_, s) => (
          <line key={`s${s}`} x1={xFor(0)} y1={yFor(s)} x2={xFor(MAX_FRET + 1)}
            y2={yFor(s)} stroke="var(--color-muted, #888)" strokeWidth={1} />
        ))}
        {/* position dots */}
        {DOTS.map(f => (
          <circle key={`d${f}`} cx={xFor(f) - FRET_W / 2} cy={height + 8} r={3}
            fill="var(--color-faint, #555)" />
        ))}
        {/* clickable cells + markers */}
        {OPEN_MIDI.map((_, s) =>
          Array.from({ length: MAX_FRET + 1 }, (_, f) => {
            const m = markerAt(s, f)
            const cx = xFor(f) + (f === 0 ? -FRET_W / 2 : -FRET_W / 2)
            return (
              <g key={`c${s}-${f}`}>
                <rect x={xFor(f) - FRET_W} y={yFor(s) - STRING_GAP / 2}
                  width={FRET_W} height={STRING_GAP} fill="transparent"
                  style={{ cursor: disabled ? 'default' : 'pointer' }}
                  onClick={() => !disabled && onFretClick(s, f)} />
                {m && (
                  <>
                    <circle cx={xFor(f) - FRET_W / 2} cy={yFor(s)} r={9}
                      fill={FILL[m.kind]}
                      stroke={m.kind === 'hint' ? 'var(--color-faint, #555)' : 'none'}
                      strokeDasharray={m.kind === 'hint' ? '3 2' : undefined}
                      opacity={m.kind === 'hint' ? 0.7 : 1} />
                    {m.label && (
                      <text x={xFor(f) - FRET_W / 2} y={yFor(s) + 4}
                        textAnchor="middle" fontSize={10}
                        fill="var(--color-fg, #eee)">{m.label}</text>
                    )}
                  </>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}
```

> 주: 위 `--color-*` var 이름은 프로젝트 Tailwind 토큰과 매칭되도록 Step 2에서 실제 값 확인 후 조정한다(토큰이 CSS 변수로 노출되지 않으면 Tailwind 클래스 기반 색상 사각형/`className`으로 대체).

- [ ] **Step 2: 토큰 확인 후 색상 정합**

Run: `npx grep -n "color-" src/app/globals.css 2>/dev/null || true`
(실제로는 `app/globals.css` 또는 유사 파일에서 `--color-*` 정의를 Read로 확인.) CSS 변수가 없으면 `FILL`을 Tailwind 유틸 클래스로 칠하는 방식으로 바꾼다: 마커 원을 `<circle className="fill-primary" />` 등으로.

- [ ] **Step 3: 타입/린트 확인**

Run: `npx tsc --noEmit && npx eslint src/components/fretboard/Fretboard.tsx`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/fretboard/Fretboard.tsx
git commit -m "feat: presentational SVG fretboard with clickable cells + markers"
```

---

### Task 4: `ChordToneFretboard` 연습 컨테이너

**Files:**
- Create: `src/components/fretboard/ChordToneFretboard.tsx`

**Interfaces:**
- Consumes: 전부 from `fretboardUtils` (`Quality`, `Stage`, `TAP_ORDER`, `pickAnchor`, `expectedPosition`, `shapeMidis`, `chordLabel`, `rootPcAt`, `degreePc`, `pitchClassAt`, `noteNameAt`), `Fretboard` + `Marker`, `playMidiSequence`/`playMidi` from `@/src/utils/audioUtils`, `loadEarProgress`/`recordEarResult`/`stageAccuracy` from `@/src/utils/earTrainingProgress`.
- Produces: `export default function ChordToneFretboard(): JSX.Element`.

**동작 요약:**
- 시작 화면: 설명 + 난이도 3버튼(`guided/anchor/find`) + 퀄리티 토글(`Maj7 / min7 / 둘 다`) + 시작 버튼. 마지막 선택은 `localStorage` 키 `keymaster_fretboardConfig`에 저장/복원(App.tsx의 `load`/`save` 패턴과 동일한 로컬 헬퍼 사용).
- 문제 생성: 퀄리티 무작위(둘 다일 때, 직전과 다르게), `pickAnchor(stage)`로 앵커.
- **핵심 규칙 — 7도는 "시작점"**: 7도는 짚는 게 아니라 *시작하는* 음이다.
  - `guided`/`anchor`: 앱이 7도 위치를 `start` 마커로 **미리 보여준다**. 사용자는 나머지 **1→3→5 (3탭)** 만 짚는다 → `stepIndex`는 TAP_ORDER의 1번(=도수 1)부터 시작.
  - `find`: 앱은 목표 코드명 + "루트는 A현"만 알려주고 7도를 보여주지 않는다. 사용자가 **7도부터 찾아 짚어** 시작점을 스스로 확정한 뒤 1→3→5를 이어간다 → `stepIndex`는 0(=도수 7)부터.
- 진행 상태: `stepIndex`(0..3, TAP_ORDER 인덱스), `anchorFret`(guided/anchor는 즉시 확정, find는 7도 탭에서 확정), 맞게 짚은 목록, 방금 틀림 여부.
- 채점(`handleClick`) — 현재 도수 = `TAP_ORDER[stepIndex]`:
  - `guided`/`anchor` (앵커 기확정): `expectedPosition(quality, anchorFret, degree)`와 클릭이 정확히 일치하면 정답, `stepIndex++`.
  - `find`, 앵커 미확정(현재 도수 = 7): 클릭의 `pitchClassAt`가 목표 7도(`degreePc(quality, targetRootPc, 7)`)와 같고 현이 7도 셰이프 현(`shapeNoteFor(quality,7).string`)과 같으면 앵커 = `clickedFret - shapeNoteFor(quality,7).fretOffset`로 확정, `stepIndex++`.
  - `find`, 앵커 확정 후: guided와 동일하게 확정된 앵커로 채점.
  - 오답: `wrong` 플래시, 같은 도수 재시도(`missedRef=true`).
  - 완성(`stepIndex`가 4에 도달 — guided/anchor는 3탭, find는 4탭): `recordEarResult({stage:'fretboard', correct:!missedRef.current, streak, missKey:'fretboardMisses', missItems:[quality]})`, `playMidiSequence(shapeMidis(quality, anchorFret), {noteDur:0.42, gap:0.05})`, 피드백 화면.
- 마커 구성:
  - `guided`: 시작점(7도)=`start`, 아직 안 짚은 자리=`hint`(도수 라벨), 짚은 자리=`done`.
  - `anchor`: 시작점(7도)=`start`, 짚은 자리=`done`, 힌트 없음.
  - `find`: 앵커 확정 전 마커 없음(목표 코드명 + "루트는 A현에서" 안내만), 확정 후 짚은 자리=`done`.
- 헤더: 현재 목표(예: "Cmaj7 · 7→1→3→5"), 다음 짚을 도수 안내, 세션 정답률·연속(`ChordIdentify` 헤더 패턴 재사용), 종료 버튼.

- [ ] **Step 1: 구현 작성**

Create `src/components/fretboard/ChordToneFretboard.tsx` — `ChordIdentify.tsx`의 시작화면/헤더/피드백 마크업과 Tailwind 클래스를 그대로 본떠 작성한다. 핵심 로직 뼈대:
```tsx
'use client'
import { useState, useRef, useCallback } from 'react'
import Fretboard, { type Marker } from './Fretboard'
import {
  type Quality, type Stage, type Degree,
  TAP_ORDER, pickAnchor, expectedPosition, shapeNoteFor, shapeMidis,
  chordLabel, rootPcAt, degreePc, pitchClassAt,
} from '@/src/utils/fretboardUtils'
import { playMidiSequence } from '@/src/utils/audioUtils'
import { loadEarProgress, recordEarResult, stageAccuracy, type EarProgress } from '@/src/utils/earTrainingProgress'

const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'guided', label: '가이드', hint: '자리 표시' },
  { id: 'anchor', label: '시작점만', hint: '시작만 강조' },
  { id: 'find',   label: '시작점 찾기', hint: '스스로' },
]
const DEGREE_LABEL: Record<Degree, string> = { 1: '1', 3: '3', 5: '5', 7: '7' }

// localStorage helpers mirror App.tsx
function load<T>(k: string, d: T): T { /* try JSON.parse(localStorage) else d */ return d }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const LS = 'keymaster_fretboardConfig'

export default function ChordToneFretboard() {
  const [started, setStarted] = useState(false)
  const [stage, setStage] = useState<Stage>('guided')
  const [quals, setQuals] = useState<Quality[]>(['maj7']) // 둘 다 = ['maj7','min7']
  // per-question state
  const [quality, setQuality] = useState<Quality>('maj7')
  const [anchor, setAnchor] = useState<number | null>(null)
  const [targetRootPc, setTargetRootPc] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState<{ string: number; fret: number }[]>([])
  const [wrong, setWrong] = useState<{ string: number; fret: number } | null>(null)
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering')
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)
  const missedRef = useRef(false)
  // ...
  // askNext(): pick quality (avoid repeat), anchor. For 'find' also set targetRootPc
  //   from a chosen anchor but DON'T reveal it; guided/anchor set anchor immediately.
  // handleClick(s, f): implement grading per stage as described above.
  // complete(): record + play arpeggio + phase='feedback'.
  // buildMarkers(): produce Marker[] per stage from state.
  return (/* start screen when !started, else header + <Fretboard/> + feedback */)
}
```
(전체 마크업은 `ChordIdentify.tsx`의 클래스명을 재사용: 시작화면 `bg-surface border border-border rounded-2xl p-5 space-y-5`, 난이도 그리드 `grid grid-cols-3 gap-2`, 시작 버튼 `w-full bg-primary ... glow-primary`, 헤더 `flex items-center justify-between` + `🔥 streak` + `정답률` + `종료`.)

- [ ] **Step 2: 타입/린트 확인**

Run: `npx tsc --noEmit && npx eslint src/components/fretboard/ChordToneFretboard.tsx`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/fretboard/ChordToneFretboard.tsx
git commit -m "feat: chord-tone fretboard practice container (3 stages, Maj7/min7)"
```

---

### Task 5: App.tsx에 "지판" 탭 통합

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 임포트 + 탭 타입 확장**

`src/App.tsx:17` 아래에 임포트 추가:
```tsx
import ChordToneFretboard from '@/src/components/fretboard/ChordToneFretboard'
```
`src/App.tsx:46` activeTab 유니온 확장:
```tsx
const [activeTab, setActiveTab] = useState<'tutorial' | 'quiz' | 'ear' | 'fretboard'>('tutorial')
```

- [ ] **Step 2: 탭 버튼 추가**

`음감 훈련` 버튼(`src/App.tsx:194-201`) 다음에 동일 패턴으로 버튼 추가:
```tsx
<button
  onClick={() => setActiveTab('fretboard')}
  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
    activeTab === 'fretboard' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
  }`}
>
  지판
</button>
```

- [ ] **Step 3: 렌더 분기 추가**

`{activeTab === 'ear' && <EarTrainingMode />}` (`src/App.tsx:257`) 다음 줄에:
```tsx
{activeTab === 'fretboard' && <ChordToneFretboard />}
```

- [ ] **Step 4: 타입/린트 확인 + 커밋**

Run: `npx tsc --noEmit && npx eslint src/App.tsx`
Expected: 에러 없음.
```bash
git add src/App.tsx
git commit -m "feat: add 지판 (fretboard) tab to app shell"
```

---

### Task 6: 엔드투엔드 검증

**Files:** 없음(구동 확인).

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run`
Expected: 전부 PASS.

- [ ] **Step 2: 앱 구동 + 수동 확인** (verify 스킬 사용)

`npm run dev`로 앱을 띄우고 "지판" 탭에서 각 단계를 실제로 확인:
- `guided`: 시작점(7) 강조 + 남은 자리 힌트 점/도수 표시. 순서대로 7→1→3→5 짚으면 초록으로 채워지고 완료 시 아르페지오 소리.
- 틀린 칸 클릭 → 빨강 플래시, 진행 안 넘어감.
- `anchor`: 힌트 점 없이 시작점만 강조되는지.
- `find`: 목표 코드명(예: "Cmaj7", "루트는 A현") 안내만, 시작점 스스로 찾기 → 7도 pitch class 맞으면 앵커 확정 후 나머지 진행.
- `둘 다` 토글 시 maj7/min7 번갈아 출제, min7은 3·7도가 한 칸 낮게 요구되는지.
- 새로고침 후 마지막 난이도/퀄리티 선택 복원.

- [ ] **Step 3: 최종 커밋(있으면) + 브랜치 정리**

수동 검증 중 수정이 있었다면 커밋. `superpowers:finishing-a-development-branch`로 병합/PR 방식 결정.

---

## Self-Review

**Spec coverage:**
- 새 "지판" 탭 → Task 5 ✓
- Maj7/min7 + 둘 다 토글 → Task 1(SHAPES) + Task 4(quals) ✓
- 난이도 3단계 고정 → Task 1(Stage, anchorFretRange) + Task 4(STAGES) ✓
- 7→1→3→5 순서 짚기 + 오답 재시도 → Task 1(TAP_ORDER) + Task 4(handleClick) ✓
- 완성 시 아르페지오 재생 → Task 4(playMidiSequence) ✓
- 시작점 찾기(find) → Task 1(degreePc/rootPcAt) + Task 4(첫 탭 앵커 확정) ✓
- 진도/정답률/연속 기록 → Task 2 + Task 4(recordEarResult) ✓
- 설정 localStorage 저장/복원 → Task 4(Step 1) ✓
- 순수함수 vitest 테스트 → Task 1, 2 ✓

**Placeholder scan:** Task 4의 컴포넌트 본문은 뼈대 + 명시적 동작 규칙 + 재사용할 정확한 클래스/함수로 서술(전체 JSX는 `ChordIdentify.tsx` 패턴 복제). 순수 로직·상수·시그니처는 Task 1에 완전한 코드로 존재하므로 실행 가능. "TBD/TODO" 없음.

**Type consistency:** `Quality`,`Stage`,`Degree`,`Marker`,`expectedPosition`,`shapeMidis`,`degreePc`,`rootPcAt`,`chordLabel` 이름이 Task 1 정의와 Task 3·4 사용처에서 일치. `EarStage`/`MissMap`/`fretboardMisses`가 Task 2 정의와 Task 4 사용처에서 일치.
