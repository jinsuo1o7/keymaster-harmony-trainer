# 음감훈련 커스텀 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 음감훈련 "코드 청음"·"진행 청음" 스테이지에 출제 코드/도를 직접 고르는 "커스텀" 모드를 추가한다.

**Architecture:** 새 컴포넌트/탭 없이 두 기존 컴포넌트(`ChordIdentify`, `ProgressionEar`)의 시작 화면만 확장한다. 출제 로직은 "해결된 설정(배열)"만 받아 동작하도록 하고, 커스텀 진행 생성·검증·localStorage 복원은 순수 함수로 `earTrainingUtils.ts`에 모은다. 커스텀 세션은 누적 통계에 기록하지 않는다.

**Tech Stack:** Next.js 16 (React 19, client components), TypeScript, Tailwind v4. 단위 테스트는 vitest(신규 도입, 순수 유틸 함수 전용).

## Global Constraints

- 이 저장소의 Next.js는 표준과 다를 수 있음 — Next 전용 API를 건드릴 때는 `node_modules/next/dist/docs/`를 먼저 읽을 것. (단 이 기능은 React 클라이언트 컴포넌트 + 순수 유틸만 손대므로 Next API 변경 없음.)
- 커스텀 세션은 절대 `recordEarResult`를 호출하지 않는다 (누적 통계 미기록). 프리셋은 기존대로 기록.
- 시작 게이트 최소 선택: 코드 커스텀 = 성질 **2개 이상**, 진행 커스텀 = 도 **2개 이상** + 코드 개수 1개.
- localStorage 키: `keymaster_earCustom_chord`, `keymaster_earCustom_progression`. 파싱 실패/무효 값은 기본값으로 폴백.
- 진행 커스텀 코드 개수 범위: 1·2·3·4. 개수 1 = 단일 다이어토닉 코드 도 맞추기.
- 최종 검증 명령: `npm run build`(타입체크 포함) 와 `npm run lint` 는 오류 없이 통과해야 함.

---

### Task 1: vitest 테스트 러너 도입

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/utils/earTrainingUtils.smoke.test.ts` (스모크 — Task 2에서 실제 테스트로 대체/확장)

**Interfaces:**
- Consumes: 없음
- Produces: `npm test` = `vitest run` 스크립트, node 환경 순수 TS 테스트 실행 경로

- [ ] **Step 1: vitest 설치**

Run:
```bash
npm install -D vitest
```
Expected: `package.json`의 devDependencies에 `vitest` 추가, 오류 없이 설치 완료.

- [ ] **Step 2: test 스크립트 추가**

`package.json`의 `scripts`를 아래처럼 수정한다(기존 4개 + test 1개):

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 3: vitest 설정 파일 생성**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 스모크 테스트 작성**

Create `src/utils/earTrainingUtils.smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { chordLabel } from './earTrainingUtils'

describe('earTrainingUtils smoke', () => {
  it('exposes chordLabel', () => {
    expect(chordLabel('maj')).toBe('메이저')
  })
})
```

- [ ] **Step 5: 테스트 실행 확인**

Run: `npm test`
Expected: 1 test passed (earTrainingUtils.smoke).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/utils/earTrainingUtils.smoke.test.ts
git commit -m "chore: add vitest for unit-testing pure utils"
```

---

### Task 2: earTrainingUtils — 커스텀 설정·생성·검증 순수 함수

**Files:**
- Modify: `src/utils/earTrainingUtils.ts` (기존 `ChordQualityId`, `CHORD_QUALITIES`, `ProgressionTier`, `pickProgression`, `progressionSignature` 아래에 추가)
- Create: `src/utils/earTrainingUtils.test.ts`
- Delete: `src/utils/earTrainingUtils.smoke.test.ts` (실제 테스트로 대체)

**Interfaces:**
- Consumes: 기존 `ChordQualityId` 타입, `progressionSignature(progression: number[]): string`
- Produces:
  - `ALL_CHORD_QUALITY_IDS: ChordQualityId[]`
  - `ALL_DEGREES: number[]` (=[1..7])
  - `CUSTOM_PROGRESSION_LENGTHS: readonly [1,2,3,4]`
  - `MIN_CUSTOM_CHORD_QUALITIES = 2`, `MIN_CUSTOM_DEGREES = 2`
  - `isCustomChordValid(qualities: ChordQualityId[]): boolean`
  - `isCustomProgressionValid(degrees: number[], length: number): boolean`
  - `buildCustomProgression(degrees: number[], length: number, last: string | null): number[]`
  - `interface CustomChordConfig { qualities: ChordQualityId[] }`
  - `interface CustomProgressionConfig { degrees: number[]; length: number }`
  - `loadCustomChord(): CustomChordConfig`, `saveCustomChord(cfg: CustomChordConfig): void`
  - `loadCustomProgression(): CustomProgressionConfig`, `saveCustomProgression(cfg: CustomProgressionConfig): void`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/utils/earTrainingUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  ALL_CHORD_QUALITY_IDS,
  ALL_DEGREES,
  isCustomChordValid,
  isCustomProgressionValid,
  buildCustomProgression,
  loadCustomChord,
  loadCustomProgression,
  progressionSignature,
} from './earTrainingUtils'

describe('constants', () => {
  it('lists all 8 chord qualities', () => {
    expect(ALL_CHORD_QUALITY_IDS).toEqual([
      'maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'm7b5',
    ])
  })
  it('lists degrees 1..7', () => {
    expect(ALL_DEGREES).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('validation gates', () => {
  it('chord custom needs >= 2 qualities', () => {
    expect(isCustomChordValid(['maj'])).toBe(false)
    expect(isCustomChordValid(['maj', 'min'])).toBe(true)
  })
  it('progression custom needs >= 2 degrees and a valid length', () => {
    expect(isCustomProgressionValid([1], 2)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 0)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 5)).toBe(false)
    expect(isCustomProgressionValid([1, 4], 1)).toBe(true)
    expect(isCustomProgressionValid([1, 4, 5], 4)).toBe(true)
  })
})

describe('buildCustomProgression', () => {
  it('honors the requested length and draws only from the pool', () => {
    const p = buildCustomProgression([1, 4, 5], 3, null)
    expect(p).toHaveLength(3)
    expect(p.every(d => [1, 4, 5].includes(d))).toBe(true)
  })
  it('clamps length into 1..4', () => {
    expect(buildCustomProgression([1, 4, 5], 0, null)).toHaveLength(1)
    expect(buildCustomProgression([1, 4, 5], 9, null)).toHaveLength(4)
  })
  it('length 1 yields a single chord (선생님 2번)', () => {
    const p = buildCustomProgression([2, 6], 1, null)
    expect(p).toHaveLength(1)
    expect([2, 6]).toContain(p[0])
  })
  it('with a single-degree pool it repeats that degree deterministically', () => {
    expect(buildCustomProgression([3], 4, null)).toEqual([3, 3, 3, 3])
  })
  it('avoids repeating the exact previous sequence when variety exists', () => {
    const last = progressionSignature([1])
    for (let i = 0; i < 50; i++) {
      expect(progressionSignature(buildCustomProgression([1, 4], 1, last))).not.toBe(last)
    }
  })
})

describe('localStorage config (node/SSR falls back to defaults)', () => {
  it('loadCustomChord returns a valid default', () => {
    const cfg = loadCustomChord()
    expect(cfg.qualities.length).toBeGreaterThanOrEqual(2)
  })
  it('loadCustomProgression returns a valid default', () => {
    const cfg = loadCustomProgression()
    expect(cfg.degrees.length).toBeGreaterThanOrEqual(2)
    expect(cfg.length).toBeGreaterThanOrEqual(1)
    expect(cfg.length).toBeLessThanOrEqual(4)
  })
})
```

- [ ] **Step 2: 스모크 테스트 삭제 후 실패 확인**

Run:
```bash
rm src/utils/earTrainingUtils.smoke.test.ts
npm test
```
Expected: FAIL — `earTrainingUtils.test.ts`가 아직 없는 export들(`ALL_CHORD_QUALITY_IDS` 등)을 import해 실패.

- [ ] **Step 3: 상수·검증 헬퍼 추가**

`src/utils/earTrainingUtils.ts`에서 `CHORD_QUALITIES` 정의 뒤(또는 `CHORD_TIERS` 근처)에 추가:

```ts
// ─── 커스텀 모드: 코드 청음 ───────────────────────────────────────────────
export const ALL_CHORD_QUALITY_IDS: ChordQualityId[] = [
  'maj', 'min', 'dim', 'aug', 'maj7', 'm7', 'dom7', 'm7b5',
]
export const MIN_CUSTOM_CHORD_QUALITIES = 2
export function isCustomChordValid(qualities: ChordQualityId[]): boolean {
  return qualities.length >= MIN_CUSTOM_CHORD_QUALITIES
}
```

파일 하단(진행 관련 `pickProgression`/`progressionSignature` 정의 뒤)에 추가:

```ts
// ─── 커스텀 모드: 진행 청음 ───────────────────────────────────────────────
export const ALL_DEGREES: number[] = [1, 2, 3, 4, 5, 6, 7]
export const CUSTOM_PROGRESSION_LENGTHS = [1, 2, 3, 4] as const
export const MIN_CUSTOM_DEGREES = 2

export function isCustomProgressionValid(degrees: number[], length: number): boolean {
  return degrees.length >= MIN_CUSTOM_DEGREES && length >= 1 && length <= 4
}
```

- [ ] **Step 4: buildCustomProgression 추가**

같은 진행 섹션에 추가 (기존 `progressionSignature`를 사용):

```ts
// 선택한 도(degrees) 안에서 length개를 무작위로 뽑아 진행을 만든다.
// 직전과 완전히 같은 시퀀스는 (조합 다양성이 허용하는 한) 재시도해 피한다.
// length 1이면 단일 다이어토닉 코드 문제(선생님 2번)가 된다.
export function buildCustomProgression(
  degrees: number[],
  length: number,
  last: string | null,
): number[] {
  const pool = degrees.length > 0 ? degrees : [1]
  const len = Math.max(1, Math.min(4, Math.floor(length)))
  const gen = () =>
    Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)])
  let next = gen()
  let guard = 0
  const distinctPossible = Math.pow(pool.length, len) > 1
  while (distinctPossible && progressionSignature(next) === last && guard < 12) {
    next = gen()
    guard++
  }
  return next
}
```

- [ ] **Step 5: localStorage 설정 헬퍼 추가**

같은 진행 섹션 뒤에 추가:

```ts
export interface CustomChordConfig {
  qualities: ChordQualityId[]
}
export interface CustomProgressionConfig {
  degrees: number[]
  length: number
}

const CUSTOM_CHORD_KEY = 'keymaster_earCustom_chord'
const CUSTOM_PROG_KEY = 'keymaster_earCustom_progression'

const DEFAULT_CHORD_CONFIG: CustomChordConfig = { qualities: ['maj', 'min'] }
const DEFAULT_PROG_CONFIG: CustomProgressionConfig = { degrees: [1, 4, 5], length: 2 }

export function loadCustomChord(): CustomChordConfig {
  if (typeof window === 'undefined') return DEFAULT_CHORD_CONFIG
  try {
    const raw = window.localStorage.getItem(CUSTOM_CHORD_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { qualities?: unknown }
      const qualities = (Array.isArray(parsed.qualities) ? parsed.qualities : []).filter(
        (q): q is ChordQualityId => ALL_CHORD_QUALITY_IDS.includes(q as ChordQualityId),
      )
      if (isCustomChordValid(qualities)) return { qualities }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_CHORD_CONFIG
}

export function saveCustomChord(cfg: CustomChordConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_CHORD_KEY, JSON.stringify(cfg))
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function loadCustomProgression(): CustomProgressionConfig {
  if (typeof window === 'undefined') return DEFAULT_PROG_CONFIG
  try {
    const raw = window.localStorage.getItem(CUSTOM_PROG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { degrees?: unknown; length?: unknown }
      const degrees = (Array.isArray(parsed.degrees) ? parsed.degrees : []).filter(
        (d): d is number => typeof d === 'number' && d >= 1 && d <= 7,
      )
      const length = typeof parsed.length === 'number' ? parsed.length : DEFAULT_PROG_CONFIG.length
      if (isCustomProgressionValid(degrees, length)) return { degrees, length }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_PROG_CONFIG
}

export function saveCustomProgression(cfg: CustomProgressionConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CUSTOM_PROG_KEY, JSON.stringify(cfg))
  } catch {
    // ignore quota / privacy-mode errors
  }
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS (constants / validation gates / buildCustomProgression / localStorage config).

- [ ] **Step 7: 타입체크**

Run: `npm run build`
Expected: 타입 오류 없이 빌드 성공.

- [ ] **Step 8: Commit**

```bash
git add src/utils/earTrainingUtils.ts src/utils/earTrainingUtils.test.ts
git rm --cached src/utils/earTrainingUtils.smoke.test.ts 2>/dev/null; true
git commit -m "feat: custom-mode pure utils for ear-training (build/validate/persist)"
```

---

### Task 3: 코드 청음 커스텀 모드 UI

**Files:**
- Modify: `src/components/ear/ChordIdentify.tsx`

**Interfaces:**
- Consumes (Task 2): `ALL_CHORD_QUALITY_IDS`, `isCustomChordValid`, `loadCustomChord`, `saveCustomChord`
- Produces: 사용자 UI. 다른 태스크가 의존하는 export 없음.

- [ ] **Step 1: import 확장**

`ChordIdentify.tsx` 상단 earTrainingUtils import 블록에 아래 4개를 추가한다:

```ts
import {
  CHORD_TIERS,
  type ChordTier,
  type ChordQualityId,
  chordLabel,
  chordMidis,
  chordExplanation,
  randomChordRoot,
  weightedPick,
  ALL_CHORD_QUALITY_IDS,
  isCustomChordValid,
  loadCustomChord,
  saveCustomChord,
} from '@/src/utils/earTrainingUtils'
```

- [ ] **Step 2: 커스텀 상태 추가**

`const [tier, setTier] = useState<ChordTier>(CHORD_TIERS[0])` 아래에 추가:

```ts
  const [customMode, setCustomMode] = useState(false)
  const [customQ, setCustomQ] = useState<ChordQualityId[]>(() => loadCustomChord().qualities)
  const [isCustom, setIsCustom] = useState(false)
  const customRef = useRef(false)
```

그리고 컴포넌트 함수 본문 상단(다른 파생값 근처)에 파생값을 추가:

```ts
  const activeQualities = customMode ? customQ : tier.qualities
```

- [ ] **Step 3: askNext가 qualities 배열을 받도록 변경**

기존 `askNext`의 시그니처와 첫 줄을 바꾼다. 기존:

```ts
  const askNext = useCallback(async (t: ChordTier) => {
    const weights = loadEarProgress().chordMisses
    let next = weightedPick(t.qualities, weights)
    let guard = 0
    while (t.qualities.length > 1 && next === lastRef.current && guard < 8) {
```

변경 후:

```ts
  const askNext = useCallback(async (qualities: ChordQualityId[]) => {
    const weights = loadEarProgress().chordMisses
    let next = weightedPick(qualities, weights)
    let guard = 0
    while (qualities.length > 1 && next === lastRef.current && guard < 8) {
```

(나머지 askNext 본문은 `t.qualities` 참조가 더 없으므로 그대로 둔다.)

- [ ] **Step 4: start()가 활성 성질과 커스텀 여부를 반영하도록 변경**

기존:

```ts
  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setStarted(true)
    askNext(tier)
  }
```

변경 후:

```ts
  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setIsCustom(customMode)
    customRef.current = customMode
    setStarted(true)
    askNext(activeQualities)
  }
```

- [ ] **Step 5: 커스텀 세션은 통계 기록 스킵**

기존 `settle` 내부의 `setLifetime(recordEarResult({...}))` 호출을 조건으로 감싼다:

```ts
  const settle = useCallback((isClean: boolean) => {
    const newStreak = isClean ? streak + 1 : 0
    setClean(isClean)
    setStreak(newStreak)
    setSession(s => ({ correct: s.correct + (isClean ? 1 : 0), total: s.total + 1 }))
    if (!customRef.current) {
      setLifetime(
        recordEarResult({
          stage: 'chord',
          correct: isClean,
          streak: newStreak,
          missKey: 'chordMisses',
          missItems: [target],
        }),
      )
    }
    setPhase('feedback')
  }, [streak, target])
```

- [ ] **Step 6: "다음" 버튼과 답안 버튼을 activeQualities로 연결**

시작 화면이 아닌 진행 화면에서:
- 답안 버튼 렌더링 `tier.qualities.map(...)` → `activeQualities.map(...)` 로 변경.
- 피드백의 "다음 →" 버튼 `onClick={() => askNext(tier)}` → `onClick={() => askNext(activeQualities)}` 로 변경.
- 누적 통계 문구는 커스텀일 때 숨긴다: 기존 `{lifeAcc !== null && (...)}` 조건을 `{!isCustom && lifeAcc !== null && (...)}` 로 변경.

- [ ] **Step 7: 시작 화면에 커스텀 티어 + 선택 패널 추가**

시작 화면(`if (!started)`)의 난이도 그리드 블록을 아래로 교체한다. 기존:

```tsx
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {CHORD_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => setTier(t)}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  tier.id === t.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>
```

변경 후:

```tsx
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {CHORD_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTier(t); setCustomMode(false) }}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  !customMode && tier.id === t.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{t.hint}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setCustomMode(true)}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              customMode
                ? 'bg-primary text-bg glow-primary'
                : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
            }`}
          >
            커스텀 — 나올 코드 직접 고르기
          </button>

          {customMode && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {ALL_CHORD_QUALITY_IDS.map(q => {
                  const on = customQ.includes(q)
                  return (
                    <button
                      key={q}
                      onClick={() => {
                        const nextQ = on ? customQ.filter(x => x !== q) : [...customQ, q]
                        setCustomQ(nextQ)
                        saveCustomChord({ qualities: nextQ })
                      }}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        on
                          ? 'bg-primary/20 text-primary-bright border border-primary/50'
                          : 'bg-surface-2 text-muted hover:bg-border hover:text-fg border border-transparent'
                      }`}
                    >
                      {chordLabel(q)}
                    </button>
                  )
                })}
              </div>
              {!isCustomChordValid(customQ) && (
                <p className="text-xs text-danger-bright text-center">
                  최소 2개 이상 골라주세요.
                </p>
              )}
            </div>
          )}
        </div>
```

- [ ] **Step 8: 시작 버튼에 게이트 적용**

시작 화면의 시작 버튼을 아래로 교체:

```tsx
        <button
          onClick={start}
          disabled={customMode && !isCustomChordValid(customQ)}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-3 rounded-xl glow-primary transition-all active:scale-[.99] disabled:opacity-40"
        >
          시작하기
        </button>
```

- [ ] **Step 9: 진행 화면 상단 배지도 커스텀 표기**

진행 화면 상단의 티어 배지를 교체:

```tsx
        <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
          {isCustom ? `커스텀 · ${activeQualities.length}지선다` : `${tier.label} · ${tier.hint}`}
        </span>
```

- [ ] **Step 10: 타입체크 + 린트**

Run: `npm run build && npm run lint`
Expected: 오류 없음.

- [ ] **Step 11: 브라우저 수동 검증**

Run: `npm run dev` 후 브라우저에서 음감훈련 → 3단계 코드 청음.
확인:
- "커스텀" 선택 시 8개 성질 토글이 뜨고, 메이저·마이너만 켜면 시작 가능.
- 시작하면 답안 보기가 **2개(2지선다)** 로만 뜨고 maj/min만 출제됨.
- 1개만 켠 상태에선 시작 버튼 비활성 + "최소 2개" 문구.
- 커스텀 세션에서는 하단 "누적 %..." 문구가 안 보임.
- 프리셋(기초/3화음/7화음)은 기존대로 동작하고 누적 통계도 그대로 표시됨.

- [ ] **Step 12: Commit**

```bash
git add src/components/ear/ChordIdentify.tsx
git commit -m "feat: custom quality selection in chord ear-training"
```

---

### Task 4: 진행 청음 커스텀 모드 UI (개수 선택 + 단일 코드)

**Files:**
- Modify: `src/components/ear/ProgressionEar.tsx`

**Interfaces:**
- Consumes (Task 2): `ALL_DEGREES`, `CUSTOM_PROGRESSION_LENGTHS`, `buildCustomProgression`, `isCustomProgressionValid`, `loadCustomProgression`, `saveCustomProgression`
- Produces: 사용자 UI. 다른 태스크가 의존하는 export 없음.

- [ ] **Step 1: import 확장**

`ProgressionEar.tsx` 상단 earTrainingUtils import 블록에 아래를 추가한다:

```ts
import {
  PROGRESSION_TIERS,
  type ProgressionTier,
  romanOf,
  diatonicTriadMidis,
  randomTonic,
  pickProgression,
  progressionSignature,
  progressionAnswerLabels,
  ALL_DEGREES,
  CUSTOM_PROGRESSION_LENGTHS,
  buildCustomProgression,
  isCustomProgressionValid,
  loadCustomProgression,
  saveCustomProgression,
} from '@/src/utils/earTrainingUtils'
```

- [ ] **Step 2: 커스텀 상태 + 답안 도 상태 추가**

`const [tier, setTier] = useState<ProgressionTier>(PROGRESSION_TIERS[0])` 아래에 추가:

```ts
  const [customMode, setCustomMode] = useState(false)
  const [customDegrees, setCustomDegrees] = useState<number[]>(() => loadCustomProgression().degrees)
  const [customLength, setCustomLength] = useState<number>(() => loadCustomProgression().length)
  const [isCustom, setIsCustom] = useState(false)
  const [answerDegrees, setAnswerDegrees] = useState<number[]>(PROGRESSION_TIERS[0].degrees)
```

- [ ] **Step 3: 다음 문제 소스 헬퍼 추가**

컴포넌트 본문(함수들 사이)에 추가:

```ts
  function nextProgression(): number[] {
    return customMode
      ? buildCustomProgression(customDegrees, customLength, lastRef.current)
      : pickProgression(tier, loadEarProgress().progressionMisses, lastRef.current)
  }
  function nextAnswerDegrees(): number[] {
    return customMode ? customDegrees : tier.degrees
  }
```

- [ ] **Step 4: askNext가 생성된 진행/도/커스텀여부를 받도록 변경**

기존 `askNext`:

```ts
  const askNext = useCallback(async (t: ProgressionTier) => {
    const next = pickProgression(t, loadEarProgress().progressionMisses, lastRef.current)
    lastRef.current = progressionSignature(next)
    const tonic = randomTonic()
    tonicRef.current = tonic
    setProgression(next)
    setInput([])
    setPhase('playing')
    await establishKey(tonic)
    await silence(550)
    await playChordProgression(next.map(d => diatonicTriadMidis(tonic, d)))
    answerableAtRef.current = performance.now() + 350
    setPhase('answering')
  }, [])
```

변경 후:

```ts
  const askNext = useCallback(async (next: number[], degrees: number[]) => {
    lastRef.current = progressionSignature(next)
    const tonic = randomTonic()
    tonicRef.current = tonic
    setProgression(next)
    setAnswerDegrees(degrees)
    setInput([])
    setPhase('playing')
    await establishKey(tonic)
    await silence(550)
    await playChordProgression(next.map(d => diatonicTriadMidis(tonic, d)))
    answerableAtRef.current = performance.now() + 350
    setPhase('answering')
  }, [])
```

- [ ] **Step 5: start()에서 커스텀 반영**

기존:

```ts
  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setStarted(true)
    askNext(tier)
  }
```

변경 후:

```ts
  function start() {
    setSession({ correct: 0, total: 0 })
    setStreak(0)
    setLifetime(loadEarProgress())
    setIsCustom(customMode)
    setStarted(true)
    askNext(nextProgression(), nextAnswerDegrees())
  }
```

- [ ] **Step 6: submit()에서 커스텀 세션 통계 스킵**

기존 `submit` 내부의 `setLifetime(recordEarResult({...}))` 를 조건으로 감싼다:

```ts
  function submit() {
    if (phase !== 'answering' || input.length !== progression.length) return
    const ok = input.every((d, i) => d === progression[i])
    const newStreak = ok ? streak + 1 : 0
    setCorrect(ok)
    setStreak(newStreak)
    setSession(s => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }))
    if (!isCustom) {
      setLifetime(
        recordEarResult({
          stage: 'progression',
          correct: ok,
          streak: newStreak,
          missKey: 'progressionMisses',
          missItems: [progressionSignature(progression)],
        }),
      )
    }
    setPhase('feedback')
  }
```

- [ ] **Step 7: 답안 도 버튼과 "다음"을 answerDegrees로 연결**

- 답안 버튼 그리드: `${tier.degrees.length <= 3 ? ... }` → `${answerDegrees.length <= 3 ? 'grid-cols-3' : answerDegrees.length <= 5 ? 'grid-cols-5' : 'grid-cols-4'}`, 그리고 `tier.degrees.map(deg => ...)` → `answerDegrees.map(deg => ...)`.
- 피드백의 "다음 →" 버튼 `onClick={() => askNext(tier)}` → `onClick={() => askNext(nextProgression(), nextAnswerDegrees())}`.
- 누적 통계 문구: `{lifeAcc !== null && (...)}` → `{!isCustom && lifeAcc !== null && (...)}`.

- [ ] **Step 8: 진행 화면 상단 배지 커스텀 표기**

```tsx
        <span className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
          {isCustom ? `커스텀 · 코드 ${customLength}개` : `${tier.label} · ${tier.hint}`}
        </span>
```

- [ ] **Step 9: 시작 화면에 커스텀 티어 + 도/개수 선택 패널 추가**

시작 화면 난이도 그리드 블록을 아래로 교체. 기존:

```tsx
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {PROGRESSION_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => setTier(t)}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  tier.id === t.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>
```

변경 후:

```tsx
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">난이도</p>
          <div className="grid grid-cols-3 gap-2">
            {PROGRESSION_TIERS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTier(t); setCustomMode(false) }}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors text-center ${
                  !customMode && tier.id === t.id
                    ? 'bg-primary text-bg glow-primary'
                    : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                }`}
              >
                <div>{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5 font-mono">{t.hint}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setCustomMode(true)}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              customMode
                ? 'bg-primary text-bg glow-primary'
                : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
            }`}
          >
            커스텀 — 나올 코드·개수 직접 고르기
          </button>

          {customMode && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <p className="text-xs text-muted font-medium">나올 도 (degree)</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {ALL_DEGREES.map(deg => {
                    const on = customDegrees.includes(deg)
                    return (
                      <button
                        key={deg}
                        onClick={() => {
                          const next = on
                            ? customDegrees.filter(x => x !== deg)
                            : [...customDegrees, deg].sort((a, b) => a - b)
                          setCustomDegrees(next)
                          saveCustomProgression({ degrees: next, length: customLength })
                        }}
                        className={`py-2 rounded-lg font-mono font-semibold text-sm transition-colors ${
                          on
                            ? 'bg-primary/20 text-primary-bright border border-primary/50'
                            : 'bg-surface-2 text-muted hover:bg-border hover:text-fg border border-transparent'
                        }`}
                      >
                        {deg}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted font-medium">코드 개수</p>
                <div className="flex gap-2">
                  {CUSTOM_PROGRESSION_LENGTHS.map(len => (
                    <button
                      key={len}
                      onClick={() => {
                        setCustomLength(len)
                        saveCustomProgression({ degrees: customDegrees, length: len })
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        customLength === len
                          ? 'bg-primary text-bg glow-primary'
                          : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                      }`}
                    >
                      {len}개{len === 1 ? ' (단일)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {!isCustomProgressionValid(customDegrees, customLength) && (
                <p className="text-xs text-danger-bright text-center">
                  도를 최소 2개 이상 골라주세요.
                </p>
              )}
            </div>
          )}
        </div>
```

- [ ] **Step 10: 시작 버튼 게이트 적용**

```tsx
        <button
          onClick={start}
          disabled={customMode && !isCustomProgressionValid(customDegrees, customLength)}
          className="w-full bg-primary hover:bg-primary-bright text-bg font-semibold py-3 rounded-xl glow-primary transition-all active:scale-[.99] disabled:opacity-40"
        >
          시작하기
        </button>
```

- [ ] **Step 11: 타입체크 + 린트**

Run: `npm run build && npm run lint`
Expected: 오류 없음.

- [ ] **Step 12: 브라우저 수동 검증**

Run: `npm run dev` 후 음감훈련 → 4단계 진행 청음.
확인:
- "커스텀" 선택 시 도 토글(1~7) + 개수(1·2·3·4)가 뜸.
- 개수 **1** + 도 예: 1·4·5 선택 → 조를 잡은 뒤 **코드 하나만** 재생, 답안 슬롯 1칸, 도 버튼은 1·4·5만. (선생님 2번 동작)
- 개수 3 선택 → 세 칸, 선택한 도 안에서만 출제.
- 도 1개만 선택 시 시작 버튼 비활성 + 안내 문구.
- 커스텀 세션에서 "누적 %..." 숨김. 프리셋은 기존대로 동작·기록.

- [ ] **Step 13: Commit**

```bash
git add src/components/ear/ProgressionEar.tsx
git commit -m "feat: custom degree/length selection in progression ear-training"
```

---

## Self-Review 결과

- **Spec coverage:** 데이터 모델(Task 2: buildCustomProgression, 설정 타입) ✓ / UI 흐름·게이트(Task 3·4) ✓ / localStorage 복원(Task 2 helpers + Task 3·4 저장 호출) ✓ / 통계 미기록(Task 3 Step 5, Task 4 Step 6) ✓ / 손대는 파일 목록 일치 ✓ / 테스트(Task 1·2 단위 + Task 3·4 수동) ✓.
- **Placeholder scan:** TODO/TBD/"적절히 처리" 없음. 모든 코드 스텝에 실제 코드 포함.
- **Type consistency:** `isCustomChordValid`/`isCustomProgressionValid`/`buildCustomProgression`/`loadCustomChord`/`saveCustomChord`/`loadCustomProgression`/`saveCustomProgression` 이름이 Task 2 정의와 Task 3·4 사용에서 동일. askNext 시그니처 변경(코드: `(qualities)`, 진행: `(next, degrees)`)이 각 컴포넌트 내 모든 호출부와 일치.
- **엣지 케이스:** length clamp / 단일 도 풀 / SSR 폴백 / 무효 localStorage 폴백 모두 Task 2에서 테스트로 커버.
