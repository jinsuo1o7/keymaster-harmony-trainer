# Secondary Dominant Quiz — Mode 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mode 6 to the quiz app so users can practice secondary dominant recognition across all 7 keys.

**Architecture:** Extend the existing mode system by modifying 4 files — no new files. Mode 6 reuses the single-input QuizCard path (same as modes 3, 4, 5) and the existing `validateChordAnswer` validator. Question generation uses semitone arithmetic to compute the P5 above any scale degree root.

**Tech Stack:** TypeScript, Next.js 16, React 19, Tailwind CSS 4. No test framework — verify with `npm run build` (TypeScript + lint) and manual browser check.

**Spec:** `docs/superpowers/specs/2026-06-10-secondary-dominant-quiz-design.md`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/types/quiz.ts` | Modify line 1 | Add `6` to `QuizMode` union |
| `src/utils/musicTheoryUtils.ts` | Modify | Add semitone helpers + `generateSecondaryDominantQuestion` + case 6 in switch |
| `src/components/ModeSelector.tsx` | Modify | Add Mode 6 entry + adjust grid layout |
| `src/components/QuizCard.tsx` | Modify | Add mode 6 branch in `checkAnswer()` |

---

## Task 1: Extend QuizMode type to include 6

**Files:**
- Modify: `src/types/quiz.ts:1`

- [ ] **Step 1: Update QuizMode type**

In `src/types/quiz.ts`, change line 1:

```typescript
// Before
export type QuizMode = 1 | 2 | 3 | 4 | 5

// After
export type QuizMode = 1 | 2 | 3 | 4 | 5 | 6
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds (or fails only on pre-existing issues unrelated to this change).

- [ ] **Step 3: Commit**

```bash
git add src/types/quiz.ts
git commit -m "feat: extend QuizMode type to include mode 6"
```

---

## Task 2: Add secondary dominant computation helpers

**Files:**
- Modify: `src/utils/musicTheoryUtils.ts` (add after the existing imports/constants, before `getScale`)

- [ ] **Step 1: Add note-semitone constants and helpers**

Add these declarations at the top of `src/utils/musicTheoryUtils.ts`, after the existing imports and before `export function getScale`:

```typescript
const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}
const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function useFlatsForKey(key: string): boolean {
  return ['C', 'F', 'Bb', 'Eb'].includes(key)
}

function p5Above(note: string, key: string): string {
  const semitone = ((NOTE_SEMITONES[note] ?? 0) + 7) % 12
  return useFlatsForKey(key) ? FLAT_NAMES[semitone] : SHARP_NAMES[semitone]
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/musicTheoryUtils.ts
git commit -m "feat: add semitone helpers for secondary dominant computation"
```

---

## Task 3: Add generateSecondaryDominantQuestion and wire into generateQuestion

**Files:**
- Modify: `src/utils/musicTheoryUtils.ts` (add function before `generateQuestion`, update `generateQuestion` switch)

- [ ] **Step 1: Add generateSecondaryDominantQuestion**

Add this function to `src/utils/musicTheoryUtils.ts` immediately before the existing `generateQuestion` function:

```typescript
const SEC_DOM_DEGREES = [2, 3, 4, 5, 6] as const

export function generateSecondaryDominantQuestion(key: string): Question {
  const degree = randomItem([...SEC_DOM_DEGREES])
  const targetRoot = getScaleDegree(key, degree)
  const dominantRoot = p5Above(targetRoot, key)
  const dominant = dominantRoot + '7'
  const target = getDiatonicChord(key, degree)

  const degreeNames: Record<number, string> = {
    2: 'ii도', 3: 'iii도', 4: 'IV도', 5: 'V도', 6: 'vi도',
  }
  const degreeName = degreeNames[degree] ?? `${degree}도`

  if (Math.random() < 0.5) {
    // Subtype A: given the target, find its secondary dominant
    return {
      mode: 6,
      key,
      text: `${key}키에서 ___ → ${target} (${degreeName})의 세컨더리 도미넌트는?`,
      hint: `${target}의 루트 ${targetRoot}에서 완전 5도 위의 음을 찾으세요`,
      explanation: `완전 5도 위: ${targetRoot} → ${dominantRoot}\n세컨더리 도미넌트: ${dominant} → ${target} (V7/${degreeName} in ${key})`,
      answer: dominant,
    }
  } else {
    // Subtype B: given the secondary dominant, find the target it resolves to
    return {
      mode: 6,
      key,
      text: `${key}키에서 ${dominant} → ___ 로 해결됩니다. 타겟 코드는? (${degreeName})`,
      hint: `${dominant}은 어떤 코드의 V7인가요? (${dominantRoot}에서 완전 4도 아래 = ${targetRoot})`,
      explanation: `${dominant}은 ${target}의 세컨더리 도미넌트 (V7/${degreeName})\n${dominant} → ${target} (${key} key 기준)`,
      answer: target,
    }
  }
}
```

- [ ] **Step 2: Add case 6 to generateQuestion switch**

In `generateQuestion`, find the switch statement and add case 6:

```typescript
// Before (last line of switch):
    case 5: return generateKeySignatureQuestion(key)

// After:
    case 5: return generateKeySignatureQuestion(key)
    case 6: return generateSecondaryDominantQuestion(key)
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds. TypeScript will now accept `mode: 6` in the `Question` interface without errors because `QuizMode` already includes `6` from Task 1.

- [ ] **Step 4: Commit**

```bash
git add src/utils/musicTheoryUtils.ts
git commit -m "feat: add generateSecondaryDominantQuestion for mode 6"
```

---

## Task 4: Add Mode 6 to ModeSelector UI

**Files:**
- Modify: `src/components/ModeSelector.tsx`

- [ ] **Step 1: Add Mode 6 entry and fix grid layout**

Replace the entire contents of `src/components/ModeSelector.tsx` with:

```typescript
import type { QuizMode } from '@/src/types/quiz'

interface ModeSelectorProps {
  selectedMode: QuizMode
  onModeChange: (mode: QuizMode) => void
}

const MODES: { mode: QuizMode; label: string; description: string }[] = [
  { mode: 1, label: '진행 코드톤',        description: '숫자 진행 → 코드와 구성음' },
  { mode: 2, label: '진행 분석',          description: '코드 진행 → 도수 진행' },
  { mode: 3, label: '도수 음',            description: '특정 도수의 음 맞히기' },
  { mode: 4, label: '도수 코드',          description: '특정 도수의 7화음 코드' },
  { mode: 5, label: '조표 암기',          description: '조표 관련 훈련' },
  { mode: 6, label: '세컨더리 도미넌트',  description: 'V7/x ↔ 타겟 코드 암기' },
]

export default function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">퀴즈 모드</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MODES.map(({ mode, label, description }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            title={description}
            className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors text-center ${
              selectedMode === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="text-xs text-gray-400 mb-0.5">모드 {mode}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

Key change: grid is now `grid-cols-2 sm:grid-cols-3` (2×3 layout) instead of the old `grid-cols-2 sm:grid-cols-5` (which would leave mode 6 alone on a second row).

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ModeSelector.tsx
git commit -m "feat: add mode 6 button to ModeSelector"
```

---

## Task 5: Handle Mode 6 in QuizCard answer validation

**Files:**
- Modify: `src/components/QuizCard.tsx:84-103` (the `checkAnswer` function)

- [ ] **Step 1: Add mode 6 branch in checkAnswer**

In `src/components/QuizCard.tsx`, find the `checkAnswer` function. After the `if (question.mode === 5)` block (which ends around line 101) and before the final `return { correct: false, explanation: expl }`, add:

```typescript
    if (question.mode === 6 && question.answer !== undefined) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation: expl }
    }
```

The full updated `checkAnswer` function should look like this:

```typescript
  function checkAnswer(): { correct: boolean; explanation: string } {
    const expl = question.explanation

    if (question.mode === 1 && question.chordAnswers) {
      const allCorrect = mode1Inputs.every((input, i) =>
        validateChordAnswer(input, question.chordAnswers![i].chordName)
      )
      return { correct: allCorrect, explanation: expl }
    }

    if (question.mode === 2 && question.answerDegrees) {
      return { correct: validateProgressionAnswer(userInput, question.answerDegrees), explanation: expl }
    }

    if (question.mode === 3 && question.answer !== undefined) {
      return { correct: validateDegreeAnswer(userInput, question.answer), explanation: expl }
    }

    if (question.mode === 4 && question.answer !== undefined) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation: expl }
    }

    if (question.mode === 5) {
      if (question.answer !== undefined) {
        return { correct: validateKeyNameAnswer(userInput, question.answer), explanation: expl }
      }
      if (question.answerCount !== undefined && question.answerList === undefined) {
        return { correct: validateAccidentalCountAnswer(userInput, question.answerCount), explanation: expl }
      }
      if (question.answerList !== undefined) {
        const isScale = question.text.includes('scale')
        if (isScale) {
          return { correct: validateScaleAnswer(userInput, question.answerList), explanation: expl }
        }
        return { correct: validateAccidentalsAnswer(userInput, question.answerList), explanation: expl }
      }
    }

    if (question.mode === 6 && question.answer !== undefined) {
      return { correct: validateChordAnswer(userInput, question.answer), explanation: expl }
    }

    return { correct: false, explanation: expl }
  }
```

Note: Mode 6 uses the existing single-input UI path (`question.mode !== 1` renders the single `<input>` automatically — no extra UI changes needed).

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuizCard.tsx
git commit -m "feat: add mode 6 answer validation in QuizCard"
```

---

## Task 6: Manual browser verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in browser.

- [ ] **Step 2: Verify Mode 6 button appears**

In the quiz tab, the ModeSelector should now show 6 buttons in a 2×3 grid. Mode 6 button labeled "세컨더리 도미넌트" should be visible.

- [ ] **Step 3: Test Subtype A question (find secondary dominant)**

Click Mode 6. Keep clicking "다음 문제" until you see a question like:
> `C키에서 ___ → Dm7 (ii도)의 세컨더리 도미넌트는?`

Type `A7` and submit → should be correct.  
Type `a7` and submit → should also be correct (normalizeChord lowercases quality suffix).  
Type `B7` and submit → should be wrong.

- [ ] **Step 4: Test Subtype B question (find target chord)**

Keep clicking "다음 문제" until you see a question like:
> `C키에서 A7 → ___ 로 해결됩니다. 타겟 코드는? (ii도)`

Type `Dm7` → correct.  
Type `dm7` → correct.  
Type `Am7` → wrong.

- [ ] **Step 5: Test hint**

On any Mode 6 question, click "힌트 (-5점)" — hint text should appear describing the P5 relationship.

- [ ] **Step 6: Test across keys**

Change key range to "flat" group, switch to Mode 6. Verify flat-key questions appear (e.g., Bb키, Eb키) and answers use flat notation (Bb7, Eb7, etc.).

Change key range to "sharp" group. Verify sharp-key questions appear (F#7, C#7, G#7).

- [ ] **Step 7: Commit (if any small fixes were made during testing)**

```bash
git add -p
git commit -m "fix: <describe any fix made>"
```

If no fixes needed, skip this step.

---

## Verification Checklist

- [ ] `npm run build` passes cleanly after all tasks
- [ ] Mode 6 button visible in ModeSelector
- [ ] Both subtype A and B questions generate correctly for all 7 keys
- [ ] `validateChordAnswer` normalizes case correctly (e.g., `f#7` == `F#7`)
- [ ] Key range selector (all / flat / sharp / custom) works with Mode 6
- [ ] Score and streak update on correct/incorrect answers
- [ ] Hint costs 5 points as expected
