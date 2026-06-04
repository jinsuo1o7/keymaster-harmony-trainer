# KeyMaster Harmony Trainer — Design Spec

**Date:** 2026-06-04  
**Status:** Approved

---

## Overview

음악 화성학(키, 조표, 다이어토닉 코드, 코드 진행, 코드톤)을 반복 훈련하는 웹 기반 퀴즈 게임.  
백엔드 없는 순수 프론트엔드 앱. Next.js 16 + React 19 + TypeScript + Tailwind CSS 4.

---

## Tech Stack

- **Framework:** Next.js 16.2.7 (App Router)
- **UI:** React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **State:** React useState (no external state lib)
- **Persistence:** localStorage
- **Entry point:** `app/page.tsx` (`'use client'`) → `<App />`

---

## File Structure

```
src/
  data/
    musicTheory.ts       ← 모든 음악 이론 상수 데이터
  utils/
    musicTheoryUtils.ts  ← 데이터 파생 계산 + 문제 생성
    answerValidation.ts  ← 입력 정규화 + 정답 검증
  components/
    Header.tsx           ← 점수/최고점수/연속정답
    KeyRangeSelector.tsx ← 출제 범위 선택 (전체/플랫/샵/직접)
    ModeSelector.tsx     ← 퀴즈 모드 1~5 선택
    QuizCard.tsx         ← 문제 카드 + 입력 + 버튼
    ResultPanel.tsx      ← 정답/오답 + 해설
    StudyPanel.tsx       ← 현재 키의 스케일/조표/다이어토닉 코드
  types/
    quiz.ts              ← QuizMode, Question, QuizResult, KeyGroup 타입
  App.tsx                ← 전체 상태 관리 + 레이아웃
app/
  page.tsx               ← 'use client' + <App />
  layout.tsx             ← 기존 유지
  globals.css            ← Tailwind import
```

---

## Data Layer (`src/data/musicTheory.ts`)

### Supported Keys
```
C, F, Bb, Eb, Ab, G, D, A, E
```

### Major Scales
```
C  → C D E F G A B
F  → F G A Bb C D E
Bb → Bb C D Eb F G A
Eb → Eb F G Ab Bb C D
Ab → Ab Bb C Db Eb F G
G  → G A B C D E F#
D  → D E F# G A B C#
A  → A B C# D E F# G#
E  → E F# G# A B C# D#
```

### Diatonic 7th Qualities (1~7도)
```
1=maj7, 2=m7, 3=m7, 4=maj7, 5=7, 6=m7, 7=m7b5
```

### Key Groups
```
all:   [C, F, Bb, Eb, Ab, G, D, A, E]
flat:  [Bb, Eb, Ab]
sharp: [G, D, A, E]
```

### Key Signatures
```
C  → []
F  → [Bb]
Bb → [Bb, Eb]
Eb → [Bb, Eb, Ab]
Ab → [Bb, Eb, Ab, Db]
G  → [F#]
D  → [F#, C#]
A  → [F#, C#, G#]
E  → [F#, C#, G#, D#]
```

### Accidental Order
- Flat:  Bb → Eb → Ab → Db
- Sharp: F# → C# → G# → D#

### Common Progressions
```
[2,5,1], [2,5,1,6], [1,6,2,5], [6,2,5,1], [4,5,3,6], [1,4,5,1]
```

---

## Types (`src/types/quiz.ts`)

```typescript
type QuizMode = 1 | 2 | 3 | 4 | 5
type KeyGroup = 'all' | 'flat' | 'sharp' | 'custom'

interface ChordAnswer {
  degree: number
  chordName: string
  tones: string[]
}

interface Question {
  mode: QuizMode
  key: string
  text: string
  hint: string
  explanation: string
  // 모드별 정답 구조
  answer?: string                  // 모드 3, 4
  answerList?: string[]            // 모드 5 (accidentals)
  answerDegrees?: number[]         // 모드 2 (도수 진행)
  chordAnswers?: ChordAnswer[]     // 모드 1 (진행 코드톤)
  progression?: number[]           // 모드 1, 2용
}

interface QuizResult {
  correct: boolean
  explanation: string
}

interface AppState {
  currentScore: number
  bestScore: number
  streak: number
  selectedKeyGroup: KeyGroup
  customSelectedKeys: string[]
  selectedQuizMode: QuizMode
}
```

---

## Utility Layer

### `musicTheoryUtils.ts`

| 함수 | 역할 |
|------|------|
| `getScale(key)` | 키의 스케일 배열 반환 |
| `getScaleDegree(key, degree)` | 키에서 n도 음 반환 |
| `getDiatonicChord(key, degree)` | 키에서 n도 코드 이름 반환 |
| `getChordTones(key, degree)` | 키에서 n도 코드톤 배열 반환 |
| `getDiatonicChords(key)` | 키의 전체 다이어토닉 7화음 목록 |
| `getKeySignature(key)` | 조표 배열 반환 |
| `getKeyGroupKeys(group)` | 그룹에 해당하는 키 목록 |
| `getAccidentalType(key)` | 'flat' \| 'sharp' \| 'none' |
| `getAccidentalCount(key)` | 조표 개수 |
| `findMajorKeyBySignature(accidentals)` | 조표로 키 역추적 |
| `generateQuestion(mode, selectedKeys)` | 모드+범위로 랜덤 문제 생성 |
| `generateProgressionQuestion(key)` | 모드 1 문제 |
| `generateProgressionAnalysisQuestion(key)` | 모드 2 문제 |
| `generateDegreeNoteQuestion(key)` | 모드 3 문제 |
| `generateDegreeChordQuestion(key)` | 모드 4 문제 |
| `generateKeySignatureQuestion(key)` | 모드 5 문제 (유형 A/B/C/D 랜덤) |

### `answerValidation.ts`

| 함수 | 역할 |
|------|------|
| `normalizeNote(input)` | "bb"→"Bb", "f#"→"F#" |
| `normalizeChord(input)` | "bbmaj7"→"Bbmaj7" |
| `normalizeKeyName(input)` | "bb major"→"Bb", "b flat"→"Bb" |
| `parseNoteList(input)` | 공백/쉼표/하이픈 → string[] |
| `validateDegreeAnswer(user, correct)` | 도수 숫자 정답 검증 |
| `validateChordAnswer(user, correct)` | 코드 이름 검증 |
| `validateChordToneAnswer(user, tones, ordered?)` | 코드톤 검증 (순서 옵션) |
| `validateProgressionAnswer(user, degrees)` | 도수 진행 검증 (숫자+로마) |
| `validateAccidentalsAnswer(user, accidentals)` | 조표 목록 검증 |
| `validateAccidentalCountAnswer(user, count)` | 조표 개수 검증 ("없음"/"0"/"none" 포함) |
| `validateScaleAnswer(user, scale)` | 스케일 순서 검증 |
| `validateKeyNameAnswer(user, key)` | 키 이름 검증 ("Bb major" 등 변형 허용) |

---

## Quiz Modes

### 모드 1: 숫자 진행 → 코드와 코드톤 맞히기
- 랜덤 키 + COMMON_PROGRESSIONS 중 하나
- 각 도수별 코드명 + 코드톤 입력
- 힌트: "Bb major scale을 떠올려보세요: Bb C D Eb F G A"

### 모드 2: 코드 진행 → 도수 진행 맞히기
- 랜덤 키 + 진행의 코드명 표시
- 숫자(2-5-1) 또는 로마(ii-V-I) 모두 정답
- 힌트: "첫 코드는 Cm7입니다. Bb key에서 C는 2도입니다."

### 모드 3: key 안의 도수 음 맞히기
- "{key} key에서 {n}도는 무엇인가요?"
- 힌트: "scale을 순서대로 세어보세요."

### 모드 4: key 안의 도수 코드 맞히기
- "{key} key의 {n}도 7화음 코드는 무엇인가요?"
- 힌트: "5도의 퀄리티는 dominant 7입니다."

### 모드 5: 조표 암기 (유형 A/B/C/D 랜덤)
- A: "{key}에는 어떤 sharp/flat이 붙나요?"
- B: "{key}에는 sharp/flat이 몇 개 붙나요?"
- C: "{accidentals}가 붙는 major key는 무엇인가요?"
- D: "{key} major scale을 순서대로 적어주세요."
- 힌트: flat 순서 Bb→Eb→Ab→Db / sharp 순서 F#→C#→G#→D#

---

## Scoring Rules

| 상황 | 점수 변화 |
|------|-----------|
| 정답 (힌트 미사용) | +10 |
| 정답 (힌트 사용 후) | +5 |
| 오답 | 0 |
| 오답 시 streak | 0 초기화 |

bestScore는 currentScore 초과 시 자동 갱신.

---

## localStorage Keys

```
keymaster_currentScore
keymaster_bestScore
keymaster_streak
keymaster_selectedKeyGroup
keymaster_customSelectedKeys   ← JSON.stringify(string[])
keymaster_selectedQuizMode
```

---

## UI Design

- 다크 모드 배경 (`bg-gray-900` 계열)
- 중앙 정렬 카드형 UI
- 정답: 초록 (`green-500` 계열)
- 오답: 빨간 (`red-500` 계열)
- 힌트/해설: 파란 (`blue-400` 계열)
- 모바일 반응형 (`max-w-2xl`, padding 조정)

---

## Validation Notes

- 음 이름 대소문자 무시: "bb" → "Bb"
- 구분자: 공백, 쉼표, 하이픈 모두 허용
- C major accidentals 정답: "없음", "0", "0개", "none", "no accidentals"
- 키 이름: "Bb", "Bb major", "Bbmaj", "B flat" 모두 허용
- 코드톤 순서: 기본 순서 요구, `ordered` 파라미터로 추후 토글 가능

---

## Correctness Verification

구현 후 다음을 내부 검증:

```
Bb key 2-5-1-6:
  2=Cm7(C Eb G Bb), 5=F7(F A C Eb), 1=Bbmaj7(Bb D F A), 6=Gm7(G Bb D F)

조표:
  Bb→[Bb,Eb], Eb→[Bb,Eb,Ab], Ab→[Bb,Eb,Ab,Db]
  G→[F#], D→[F#,C#], A→[F#,C#,G#], E→[F#,C#,G#,D#]
```

---

## Out of Scope (MVP)

- Minor key
- Secondary dominant
- Modal interchange
- 피아노 키보드 UI
- 코드 사운드 재생
- 약점 복습 기능
- 타임어택 모드
