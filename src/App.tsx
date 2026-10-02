'use client'

import { useEffect, useState } from 'react'
import Header from '@/src/components/Header'
import DegreeTraining from '@/src/components/DegreeTraining'
import EarTrainingMode from '@/src/components/EarTrainingMode'
import ChordToneFretboard from '@/src/components/fretboard/ChordToneFretboard'
import BpmMode from '@/src/components/BpmMode'
import ScaleLearning from '@/src/components/ScaleLearning'

const SCORE_KEYS = {
  current: 'keymaster_currentScore',
  best: 'keymaster_bestScore',
  streak: 'keymaster_streak',
}

type Tab = 'degree' | 'ear' | 'fretboard' | 'scale' | 'bpm'

function loadScore(key: string) {
  try {
    const value = localStorage.getItem(key)
    return value === null ? 0 : JSON.parse(value) as number
  } catch {
    return 0
  }
}

function saveScore(key: string, value: number) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('degree')
  const [currentScore, setCurrentScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setCurrentScore(loadScore(SCORE_KEYS.current))
    setBestScore(loadScore(SCORE_KEYS.best))
    setStreak(loadScore(SCORE_KEYS.streak))
  }, [])

  useEffect(() => { saveScore(SCORE_KEYS.current, currentScore) }, [currentScore])
  useEffect(() => { saveScore(SCORE_KEYS.best, bestScore) }, [bestScore])
  useEffect(() => { saveScore(SCORE_KEYS.streak, streak) }, [streak])

  function recordAnswer(correct: boolean) {
    if (!correct) {
      setStreak(0)
      return
    }
    setCurrentScore(score => {
      const nextScore = score + 10
      setBestScore(best => Math.max(best, nextScore))
      return nextScore
    })
    setStreak(value => value + 1)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'degree', label: '도수 훈련' },
    { id: 'ear', label: '음감 훈련' },
    { id: 'fretboard', label: '지판' },
    { id: 'scale', label: '스케일' },
    { id: 'bpm', label: 'BPM' },
  ]

  return <div className="min-h-screen text-fg">
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-6 pb-12 sm:px-6">
      <Header currentScore={currentScore} bestScore={bestScore} streak={streak} />
      <nav className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1 sm:grid-cols-5" aria-label="훈련 메뉴">
        {tabs.map(tab => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)} className={`rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === tab.id ? 'bg-primary text-bg glow-primary' : 'text-muted hover:text-fg'}`}>{tab.label}</button>)}
      </nav>

      {activeTab === 'degree' && <DegreeTraining onAnswer={recordAnswer} />}
      {activeTab === 'ear' && <EarTrainingMode />}
      {activeTab === 'fretboard' && <ChordToneFretboard />}
      {activeTab === 'scale' && <ScaleLearning />}
      {activeTab === 'bpm' && <BpmMode />}
    </div>
  </div>
}
