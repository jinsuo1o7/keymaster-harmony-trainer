'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuizMode, KeyGroup, Question, QuizResult, TutorialProgress } from '@/src/types/quiz'
import { generateQuestion, generateQuestionForKey } from '@/src/utils/musicTheoryUtils'
import { loadTutorialProgress, saveTutorialProgress } from '@/src/utils/tutorialUtils'
import { KEY_GROUPS } from '@/src/data/musicTheory'
import { DEFAULT_MODE } from '@/src/data/quizModes'
import Header from '@/src/components/Header'
import KeyRangeSelector from '@/src/components/KeyRangeSelector'
import ModeSelector from '@/src/components/ModeSelector'
import QuizCard from '@/src/components/QuizCard'
import ResultPanel from '@/src/components/ResultPanel'
import StudyPanel from '@/src/components/StudyPanel'
import TutorialHome from '@/src/components/TutorialHome'
import TutorialLevel from '@/src/components/TutorialLevel'
import FocusTraining from '@/src/components/FocusTraining'
import EarTrainingMode from '@/src/components/EarTrainingMode'
import ChordToneFretboard from '@/src/components/fretboard/ChordToneFretboard'

const LS = {
  currentScore:      'keymaster_currentScore',
  bestScore:         'keymaster_bestScore',
  streak:            'keymaster_streak',
  selectedKeyGroup:  'keymaster_selectedKeyGroup',
  customSelectedKeys:'keymaster_customSelectedKeys',
  selectedQuizMode:  'keymaster_selectedQuizMode',
  practiceStyle:     'keymaster_practiceStyle',
}

type PracticeStyle = 'random' | 'focus'

function load<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const val = localStorage.getItem(key)
    return val === null ? defaultValue : (JSON.parse(val) as T)
  } catch {
    return defaultValue
  }
}

function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export default function App() {
  const [activeTab,    setActiveTab]    = useState<'tutorial' | 'quiz' | 'ear' | 'fretboard'>('tutorial')
  const [practiceStyle, setPracticeStyle] = useState<PracticeStyle>('random')
  const [tutorialLevel, setTutorialLevel] = useState<number | null>(null)
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>({
    unlockedLevel: 1, completedLevels: [], scores: {}, lastLevel: null, completed: false,
  })

  const [currentScore, setCurrentScore] = useState(0)
  const [bestScore,    setBestScore]    = useState(0)
  const [streak,       setStreak]       = useState(0)
  const [keyGroup,     setKeyGroup]     = useState<KeyGroup>('all')
  const [customKeys,   setCustomKeys]   = useState<string[]>([])
  const [quizMode,     setQuizMode]     = useState<QuizMode>(DEFAULT_MODE)
  const [question,     setQuestion]     = useState<Question | null>(null)
  const [result,       setResult]       = useState<QuizResult | null>(null)
  const [hintUsed,     setHintUsed]     = useState(false)

  useEffect(() => { save(LS.currentScore,       currentScore) }, [currentScore])
  useEffect(() => { save(LS.bestScore,          bestScore)    }, [bestScore])
  useEffect(() => { save(LS.streak,             streak)       }, [streak])
  useEffect(() => { save(LS.selectedKeyGroup,   keyGroup)     }, [keyGroup])
  useEffect(() => { save(LS.customSelectedKeys, customKeys)   }, [customKeys])
  useEffect(() => { save(LS.selectedQuizMode,   quizMode)     }, [quizMode])
  useEffect(() => { save(LS.practiceStyle,       practiceStyle)}, [practiceStyle])

  const getActiveKeys = useCallback((): string[] => {
    if (keyGroup === 'custom') {
      return customKeys.length > 0 ? customKeys : KEY_GROUPS.all
    }
    return KEY_GROUPS[keyGroup] ?? KEY_GROUPS.all
  }, [keyGroup, customKeys])

  const lastQuestionText = useRef<string>('')
  const keyQueueRef = useRef<string[]>([])

  useEffect(() => { keyQueueRef.current = [] }, [keyGroup, customKeys])

  const loadNextQuestion = useCallback((mode: QuizMode) => {
    const keys = getActiveKeys()

    function dequeue(): string {
      if (keyQueueRef.current.length === 0) {
        const shuffled = [...keys].sort(() => Math.random() - 0.5)
        keyQueueRef.current = shuffled
      }
      return keyQueueRef.current.pop()!
    }

    let next = generateQuestionForKey(mode, dequeue())
    let attempts = 0
    while (next.text === lastQuestionText.current && attempts < 10) {
      next = generateQuestionForKey(mode, dequeue())
      attempts++
    }
    lastQuestionText.current = next.text
    setQuestion(next)
    setResult(null)
    setHintUsed(false)
  }, [getActiveKeys])

  // Load all persisted state on mount only
  useEffect(() => {
    const savedScore   = load<number>(LS.currentScore, 0)
    const savedBest    = load<number>(LS.bestScore, 0)
    const savedStreak  = load<number>(LS.streak, 0)
    const savedMode    = load<QuizMode>(LS.selectedQuizMode, DEFAULT_MODE)
    const savedGroup   = load<KeyGroup>(LS.selectedKeyGroup, 'all')
    const savedCustom  = load<string[]>(LS.customSelectedKeys, [])
    const savedStyle   = load<PracticeStyle>(LS.practiceStyle, 'random')

    setCurrentScore(savedScore)
    setBestScore(savedBest)
    setStreak(savedStreak)
    setQuizMode(savedMode)
    setKeyGroup(savedGroup)
    setCustomKeys(savedCustom)
    setPracticeStyle(savedStyle)
    setTutorialProgress(loadTutorialProgress())

    const keys =
      savedGroup === 'custom'
        ? (savedCustom.length > 0 ? savedCustom : KEY_GROUPS.all)
        : (KEY_GROUPS[savedGroup] ?? KEY_GROUPS.all)
    setQuestion(generateQuestion(savedMode, keys))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer(correct: boolean, explanation: string) {
    if (correct) {
      const pts = hintUsed ? 5 : 10
      const newScore = currentScore + pts
      setCurrentScore(newScore)
      if (newScore > bestScore) setBestScore(newScore)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setResult({ correct, explanation })
  }

  function handleTutorialComplete(
    levelId: number,
    correctCount: number,
    newProgress: TutorialProgress,
  ) {
    setTutorialProgress(newProgress)
    saveTutorialProgress(newProgress)
  }

  function handleModeChange(mode: QuizMode) {
    setQuizMode(mode)
    loadNextQuestion(mode)
  }

  function handleKeyGroupChange(group: KeyGroup) {
    setKeyGroup(group)
  }

  return (
    <div className="min-h-screen text-fg">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-12">
        <Header currentScore={currentScore} bestScore={bestScore} streak={streak} />

        {/* Tab bar — learn first, then practice */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          <button
            onClick={() => { setActiveTab('tutorial'); setTutorialLevel(null) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'tutorial' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
            }`}
          >
            튜토리얼
            {tutorialProgress.completedLevels.length > 0 && !tutorialProgress.completed && (
              <span className="ml-1.5 text-xs bg-primary/15 text-primary-bright px-1.5 py-0.5 rounded-full">
                {tutorialProgress.completedLevels.length}/8
              </span>
            )}
            {tutorialProgress.completed && (
              <span className="ml-1.5 text-xs">✓</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'quiz' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
            }`}
          >
            연습
          </button>
          <button
            onClick={() => setActiveTab('ear')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ear' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
            }`}
          >
            음감 훈련
          </button>
          <button
            onClick={() => setActiveTab('fretboard')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'fretboard' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
            }`}
          >
            지판
          </button>
        </div>

        {/* Practice tab — random quiz or focused repetition */}
        {activeTab === 'quiz' && (
          <>
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
              <button
                onClick={() => setPracticeStyle('random')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  practiceStyle === 'random' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
                }`}
              >
                랜덤 퀴즈
              </button>
              <button
                onClick={() => setPracticeStyle('focus')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  practiceStyle === 'focus' ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'
                }`}
              >
                🎯 집중 반복
              </button>
            </div>

            {practiceStyle === 'random' ? (
              <>
                <KeyRangeSelector
                  selectedGroup={keyGroup}
                  customKeys={customKeys}
                  onGroupChange={handleKeyGroupChange}
                  onCustomKeysChange={setCustomKeys}
                />
                <ModeSelector selectedMode={quizMode} onModeChange={handleModeChange} />
                {question && (
                  <>
                    <QuizCard
                      question={question}
                      result={result}
                      hintUsed={hintUsed}
                      onHint={() => setHintUsed(true)}
                      onAnswer={handleAnswer}
                      onNext={() => loadNextQuestion(quizMode)}
                    />
                    {result && <ResultPanel result={result} />}
                    <StudyPanel questionKey={question.key} />
                  </>
                )}
              </>
            ) : (
              <FocusTraining />
            )}
          </>
        )}

        {/* Ear training tab */}
        {activeTab === 'ear' && <EarTrainingMode />}

        {/* Fretboard tab */}
        {activeTab === 'fretboard' && <ChordToneFretboard />}

        {/* Tutorial tab */}
        {activeTab === 'tutorial' && (
          <>
            {tutorialLevel === null ? (
              <TutorialHome
                progress={tutorialProgress}
                onSelectLevel={setTutorialLevel}
              />
            ) : (
              <TutorialLevel
                levelId={tutorialLevel}
                progress={tutorialProgress}
                onComplete={handleTutorialComplete}
                onBack={() => setTutorialLevel(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
