# Secondary Dominant Quiz — Mode 6 Design

**Date:** 2026-06-10  
**Status:** Approved

## Overview

Add a new quiz mode (Mode 6) to the existing Keymaster Harmony Trainer app for practicing secondary dominant recognition. The mode targets musicians who need to internalize secondary dominant relationships across all 7 supported keys.

## Problem

Users need to memorize which V7 chord acts as the secondary dominant for each diatonic chord (ii through vi), and recognize the reverse: given a secondary dominant, which diatonic chord does it resolve to.

## Architecture

No new files. 5 existing files modified:

| File | Change |
|------|--------|
| `src/types/quiz.ts` | Add `6` to `QuizMode` union type |
| `src/utils/musicTheoryUtils.ts` | Add semitone helpers + `generateSecondaryDominantQuestion()` + case 6 in switch |
| `src/components/ModeSelector.tsx` | Add Mode 6 entry to MODES array |
| `src/components/QuizCard.tsx` | Add mode 6 branch in `checkAnswer()` using `validateChordAnswer` |
| `src/utils/answerValidation.ts` | No change — `validateChordAnswer` reused as-is |

## Question Format

Each question is one of two subtypes, chosen randomly 50/50.

**Subtype A — Find the secondary dominant (X → target):**
```
text:        "C키에서 ___ → Dm7 (ii도)의 세컨더리 도미넌트는?"
answer:      "A7"
hint:        "Dm7의 루트 D에서 완전 5도 위의 음을 찾으세요"
explanation: "완전 5도 위: D→A\n세컨더리 도미넌트: A7 → Dm7 (V7/ii in C)"
```

**Subtype B — Find the resolution target (dominant → Y):**
```
text:        "C키에서 A7 → ___ 로 해결됩니다. 타겟 코드는?"
answer:      "Dm7"
hint:        "A7은 어떤 코드의 V7인가요? (A에서 완전 4도 아래 = D)"
explanation: "A7은 Dm7의 세컨더리 도미넌트 (V7/ii)\nA7 → Dm7 (C key 기준)"
```

The `answer` field is a single chord name string, validated with the existing `validateChordAnswer`.

## Secondary Dominant Data

Targets: degrees ii (2), iii (3), IV (4), V (5), vi (6) of each key.  
Secondary dominant root = P5 above target root (+7 semitones).  
Spelling: flats for C/F/Bb/Eb, sharps for G/D/A.

| Key | V7/ii | V7/iii | V7/IV | V7/V | V7/vi |
|-----|-------|--------|-------|------|-------|
| C   | A7→Dm7 | B7→Em7 | C7→Fmaj7 | D7→G7 | E7→Am7 |
| F   | D7→Gm7 | E7→Am7 | F7→Bbmaj7 | G7→C7 | A7→Dm7 |
| Bb  | G7→Cm7 | A7→Dm7 | Bb7→Ebmaj7 | C7→F7 | D7→Gm7 |
| Eb  | C7→Fm7 | D7→Gm7 | Eb7→Abmaj7 | F7→Bb7 | G7→Cm7 |
| G   | E7→Am7 | F#7→Bm7 | G7→Cmaj7 | A7→D7 | B7→Em7 |
| D   | B7→Em7 | C#7→F#m7 | D7→Gmaj7 | E7→A7 | F#7→Bm7 |
| A   | F#7→Bm7 | G#7→C#m7 | A7→Dmaj7 | B7→E7 | C#7→F#m7 |

Total question pool: 7 keys × 5 degrees × 2 subtypes = **70 unique questions**.

## Computation Logic

```typescript
// In musicTheoryUtils.ts
const NOTE_SEMITONES: Record<string, number> = {
  C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5,
  'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11,
}
const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function useFlats(key: string): boolean {
  return ['C','F','Bb','Eb'].includes(key)
}

function p5Above(note: string, key: string): string {
  const semitone = (NOTE_SEMITONES[note] + 7) % 12
  return useFlats(key) ? FLAT_NAMES[semitone] : SHARP_NAMES[semitone]
}

// getSecondaryDominant(key, degree) returns { dominant: 'A7', target: 'Dm7' }
function getSecondaryDominant(key: string, degree: number) {
  const targetRoot = getScaleDegree(key, degree)
  const dominantRoot = p5Above(targetRoot, key)
  return {
    dominant: dominantRoot + '7',
    target: getDiatonicChord(key, degree),
  }
}
```

## Integration Points

- `generateQuestion(6, keys)` → calls `generateSecondaryDominantQuestion(randomKey)`
- Score/streak system unchanged — Mode 6 uses same 10pt/5pt scoring as all other modes
- Key range selector works as-is — Mode 6 respects the user's selected key group
- `QuizCard` single-input path handles Mode 6 (same as modes 3, 4, 5)

## Out of Scope

- ii-V chains (Em7→A7→Dm7): only the V7↔target pair, not the preceding ii chord
- Tritone substitutions
- Back-cycling / extended secondary chains
- Tutorial integration for Mode 6
