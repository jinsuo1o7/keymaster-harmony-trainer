import type { TutorialLesson } from '../types/quiz'

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  {
    id: 1,
    title: '조표 순서 외우기',
    shortDescription: 'Flat과 Sharp이 붙는 정해진 순서를 외웁니다.',
    learningGoal: 'Flat 순서 Bb→Eb→Ab→Db와 Sharp 순서 F#→C#→G#→D#를 암기합니다.',
    explanation: `Flat과 Sharp은 key마다 아무렇게나 붙는 것이 아니라 정해진 순서대로 누적됩니다.

Flat key는 다음 순서로 flat이 붙습니다.
Bb → Eb → Ab → Db

예)  F major = Bb
    Bb major = Bb, Eb
    Eb major = Bb, Eb, Ab

Sharp key는 다음 순서로 sharp이 붙습니다.
F# → C# → G# → D#

예)  G major = F#
     D major = F#, C#
     A major = F#, C#, G#`,
    memoryFormula: 'Flat 순서:  Bb → Eb → Ab → Db\nSharp 순서: F# → C# → G# → D#',
    examples: [
      'Bb major → flat 2개 → Bb, Eb (flat 순서 앞 2개)',
      'A major → sharp 3개 → F#, C#, G# (sharp 순서 앞 3개)',
    ],
    totalQuestions: 5,
    passingScore: 4,
    relatedQuizMode: null,
  },
  {
    id: 2,
    title: '각 key의 조표 외우기',
    shortDescription: '각 major key에 어떤 조표가 붙는지 외웁니다.',
    learningGoal: '7개 major key의 조표를 암기합니다. Scale보다 조표 먼저!',
    explanation: `이 단계에서는 scale이나 코드는 생각하지 말고,
"이 key에는 뭐가 붙지?"만 외웁니다.

C major = 조표 없음

Flat key:
  F major = Bb (1개)
 Bb major = Bb, Eb (2개)
 Eb major = Bb, Eb, Ab (3개)

Sharp key:
  G major = F# (1개)
  D major = F#, C# (2개)
  A major = F#, C#, G# (3개)`,
    memoryFormula: 'F → Bb → Eb (flats 누적)\nG → D → A (sharps 누적)',
    examples: [
      'Bb major → flat 2개 → Bb, Eb',
      'D major → sharp 2개 → F#, C#',
      '조표가 F#, C#, G#인 key → A major',
    ],
    totalQuestions: 8,
    passingScore: 6,
    relatedQuizMode: 5,
  },
  {
    id: 3,
    title: 'Major scale 외우기',
    shortDescription: '각 major key의 스케일 음을 순서대로 외웁니다.',
    learningGoal: '조표를 알면 스케일이 자동으로 만들어집니다. 7개 major scale 암기.',
    explanation: `조표를 알면 scale은 자동으로 만들 수 있습니다.

예: Bb major는 flat이 Bb, Eb 두 개.
  B는 Bb, E는 Eb로 바꾸고,
  Bb부터 알파벳 순서대로 씁니다.

  Bb C D Eb F G A

C  major = C D E F G A B
F  major = F G A Bb C D E
Bb major = Bb C D Eb F G A
Eb major = Eb F G Ab Bb C D
G  major = G A B C D E F#
D  major = D E F# G A B C#
A  major = A B C# D E F# G#`,
    memoryFormula: 'Key의 조표 → 해당 음 바꾸기 → Root부터 알파벳 순서',
    examples: [
      'G major: F만 F#로 → G A B C D E F#',
      'Bb major: B→Bb, E→Eb → Bb C D Eb F G A',
      'D major: F→F#, C→C# → D E F# G A B C#',
    ],
    totalQuestions: 8,
    passingScore: 6,
    relatedQuizMode: 5,
  },
  {
    id: 4,
    title: 'Key 안에서 x도 음 맞히기',
    shortDescription: '어떤 major key에서 x도가 무엇인지 바로 떠올립니다.',
    learningGoal: '"Key + 도수 = 음" 공식을 몸으로 익힙니다. 이 레벨이 앱의 핵심입니다.',
    explanation: `코드 진행을 바로 외우려 하지 말고,
먼저 숫자를 음으로 바꾸는 능력을 키웁니다.

Bb major scale:
Bb  C  D  Eb  F  G  A
 1  2  3   4  5  6  7

Bb major 4도 = Eb
Bb major 5도 = F
D major 6도 = B

공식: Key + 도수 = 음`,
    memoryFormula: 'Key + 도수 = 음',
    examples: [
      'Bb major 4도 → Bb scale 4번째 → Eb',
      'D major 6도 → D scale 6번째 → B',
      'F major 3도 → F scale 3번째 → A',
    ],
    totalQuestions: 10,
    passingScore: 8,
    relatedQuizMode: 3,
  },
  {
    id: 5,
    title: '다이어토닉 7화음 타입 패턴',
    shortDescription: '1,4=maj7 | 2,3,6=m7 | 5=7 | 7=m7b5 패턴을 외웁니다.',
    learningGoal: '모든 major key에서 동일한 코드 타입 패턴을 암기합니다.',
    explanation: `이 패턴은 모든 major key에서 동일합니다.

1 = maj7    4 = maj7
2 = m7      5 = 7
3 = m7      6 = m7
            7 = m7b5

짧게: 1,4=maj7 | 2,3,6=m7 | 5=7 | 7=m7b5

예) Bb major:
1=Bbmaj7  2=Cm7  3=Dm7  4=Ebmaj7
5=F7      6=Gm7  7=Am7b5`,
    memoryFormula: '1, 4  = maj7\n2, 3, 6 = m7\n5      = 7\n7      = m7b5',
    examples: [
      '2-5-1   → m7 - 7 - maj7',
      '1-4-5-3 → maj7 - maj7 - 7 - m7',
      '3-6-2-5 → m7 - m7 - m7 - 7',
    ],
    totalQuestions: 8,
    passingScore: 6,
    relatedQuizMode: null,
  },
  {
    id: 6,
    title: 'x도 코드를 만들기',
    shortDescription: '도수 음과 코드 타입을 합쳐 다이어토닉 7화음을 만듭니다.',
    learningGoal: '"음 + 코드 타입 = 코드" 공식으로 x도 7화음을 즉시 만듭니다.',
    explanation: `공식: 도수 코드 = 해당 도수의 음 + 코드 타입

Bb major 4도:
  4도 음   = Eb  (Key+도수=음)
  4도 타입 = maj7 (1,4=maj7)
  4도 코드 = Ebmaj7

Bb major 5도:
  5도 음   = F
  5도 타입 = 7
  5도 코드 = F7

공식: 음 + 코드 타입 = 코드`,
    memoryFormula: '음 + 코드 타입 = 코드',
    examples: [
      'Bb major 4도 → Eb + maj7 → Ebmaj7',
      'D major 5도 → A + 7 → A7',
      'F major 2도 → G + m7 → Gm7',
    ],
    totalQuestions: 10,
    passingScore: 8,
    relatedQuizMode: 4,
  },
  {
    id: 7,
    title: '숫자 진행 → 코드 진행',
    shortDescription: '숫자 진행을 실제 코드 진행으로 변환합니다.',
    learningGoal: '숫자→음→코드의 전체 흐름을 실전에 적용합니다.',
    explanation: `Bb major에서 1-4-5-3 진행:

Scale: Bb C D Eb F G A
        1 2 3  4 5 6 7

1 = Bb → Bbmaj7
4 = Eb → Ebmaj7
5 = F  → F7
3 = D  → Dm7

정답: Bbmaj7 - Ebmaj7 - F7 - Dm7

공식: 숫자 → 음(Key+도수=음) → 코드(음+타입=코드)`,
    memoryFormula: '숫자 → 음 → 코드',
    examples: [
      'Bb major 2-5-1-6 → Cm7 - F7 - Bbmaj7 - Gm7',
      'F major 1-4-5-3 → Fmaj7 - Bbmaj7 - C7 - Am7',
      'G major 3-6-2-5 → Bm7 - Em7 - Am7 - D7',
    ],
    totalQuestions: 8,
    passingScore: 6,
    relatedQuizMode: 1,
  },
  {
    id: 8,
    title: '코드 진행 → 도수 진행 분석',
    shortDescription: '코드 진행을 보고 도수 진행을 역분석합니다.',
    learningGoal: '코드→루트음→도수의 역방향 분석을 마스터합니다.',
    explanation: `F major에서 Fmaj7 - Bbmaj7 - C7 - Am7:

Scale: F G A Bb C D E
       1 2 3  4 5 6 7

Fmaj7  = 루트 F = 1도
Bbmaj7 = 루트 Bb = 4도
C7     = 루트 C = 5도
Am7    = 루트 A = 3도

정답: 1 - 4 - 5 - 3

공식: 코드 → 루트음 → Scale 위치 = 도수`,
    memoryFormula: '코드 루트 → Scale에서 위치 = 도수',
    examples: [
      'Bb major: Cm7-F7-Bbmaj7-Gm7 → 2-5-1-6',
      'D major: Em7-A7-Dmaj7 → 2-5-1',
      'G major: Bm7-Em7-Am7-D7 → 3-6-2-5',
    ],
    totalQuestions: 8,
    passingScore: 6,
    relatedQuizMode: 2,
  },
]
