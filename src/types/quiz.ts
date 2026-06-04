export type QuizMode = 1 | 2 | 3 | 4 | 5
export type KeyGroup = 'all' | 'flat' | 'sharp' | 'custom'

export interface ChordAnswer {
  degree: number
  chordName: string
  tones: string[]
}

export interface Question {
  mode: QuizMode
  key: string
  text: string
  hint: string
  explanation: string
  answer?: string           // modes 3, 4, mode 5 type C
  answerList?: string[]     // mode 5 type A (accidentals) or type D (scale)
  answerCount?: number      // mode 5 type B
  answerDegrees?: number[]  // mode 2
  chordAnswers?: ChordAnswer[] // mode 1
  progression?: number[]    // modes 1, 2
}

export interface QuizResult {
  correct: boolean
  explanation: string
}

// ─── Tutorial types ───────────────────────────────────────────────────────

export type TutorialQuestionType =
  | 'flatOrder' | 'sharpOrder' | 'orderPosition'
  | 'keyAccidentals' | 'accidentalCount' | 'keyFromSignature'
  | 'fullScale' | 'scalePosition'
  | 'degreeNote'
  | 'chordTypeByDegree' | 'progressionChordTypes'
  | 'degreeChord'
  | 'numericToChord'
  | 'chordToNumeric'

export interface TutorialQuestion {
  levelId: number
  questionType: TutorialQuestionType
  text: string
  hint: string
  explanation: string
  key?: string
  degree?: number
  progression?: number[]
  answer?: string
  answerList?: string[]
  answerCount?: number
  answerDegrees?: number[]
}

export interface TutorialLesson {
  id: number
  title: string
  shortDescription: string
  learningGoal: string
  explanation: string
  memoryFormula: string
  examples: string[]
  totalQuestions: number
  passingScore: number
  relatedQuizMode: number | null
}

export interface TutorialProgress {
  unlockedLevel: number
  completedLevels: number[]
  scores: Record<number, number>
  lastLevel: number | null
  completed: boolean
}
