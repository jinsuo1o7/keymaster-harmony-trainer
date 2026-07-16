// Persistent progress for ear training. Two things survive across sessions:
//  1. per-stage lifetime accuracy + best streak, so daily practice accumulates.
//  2. a decaying "miss weight" per item (solfège degree / chord quality) so the
//     next question can lean toward the things the learner keeps getting wrong.
// Persistence mirrors tutorialUtils: a single JSON blob in localStorage, read
// defensively so a missing or malformed value just falls back to a blank slate.

export type EarStage = 'identify' | 'melody' | 'chord' | 'progression' | 'fretboard'
export type MissMap = 'degreeMisses' | 'chordMisses' | 'progressionMisses' | 'fretboardMisses'

export interface EarStageStats {
  correct: number
  total: number
  bestStreak: number
}

export interface EarProgress {
  identify: EarStageStats
  melody: EarStageStats
  chord: EarStageStats
  progression: EarStageStats
  fretboard: EarStageStats
  degreeMisses: Record<string, number>      // solfège id → weight
  chordMisses: Record<string, number>       // chord quality id → weight
  progressionMisses: Record<string, number> // progression signature → weight
  fretboardMisses: Record<string, number>   // quality id → weight
}

const KEY = 'keymaster_earProgress'

const blankStats = (): EarStageStats => ({ correct: 0, total: 0, bestStreak: 0 })

function blankProgress(): EarProgress {
  return {
    identify: blankStats(),
    melody: blankStats(),
    chord: blankStats(),
    progression: blankStats(),
    fretboard: blankStats(),
    degreeMisses: {},
    chordMisses: {},
    progressionMisses: {},
    fretboardMisses: {},
  }
}

export function loadEarProgress(): EarProgress {
  if (typeof window === 'undefined') return blankProgress()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blankProgress()
    const p = JSON.parse(raw) as Partial<EarProgress>
    return {
      identify: { ...blankStats(), ...p.identify },
      melody: { ...blankStats(), ...p.melody },
      chord: { ...blankStats(), ...p.chord },
      progression: { ...blankStats(), ...p.progression },
      fretboard: { ...blankStats(), ...p.fretboard },
      degreeMisses: p.degreeMisses ?? {},
      chordMisses: p.chordMisses ?? {},
      progressionMisses: p.progressionMisses ?? {},
      fretboardMisses: p.fretboardMisses ?? {},
    }
  } catch {
    return blankProgress()
  }
}

function save(p: EarProgress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {}
}

// A wrong answer adds more weight than a correct one removes, so a stubborn
// weak spot climbs quickly and only fades once it's been answered right a few
// times. Weight never goes negative (1 is the floor added back in weightedPick).
const MISS_PENALTY = 2
const MISS_RELIEF = 1

// Record one answered question: update the stage's lifetime tally + best streak,
// and nudge the miss weights of the items involved. Returns the fresh progress
// so the caller can render lifetime stats without a second read.
export function recordEarResult(params: {
  stage: EarStage
  correct: boolean
  streak: number
  missKey?: MissMap
  missItems?: string[]
}): EarProgress {
  const { stage, correct, streak, missKey, missItems } = params
  const p = loadEarProgress()

  const s = p[stage]
  s.total += 1
  if (correct) s.correct += 1
  s.bestStreak = Math.max(s.bestStreak, streak)

  if (missKey && missItems) {
    const map = p[missKey]
    for (const id of missItems) {
      const prev = map[id] ?? 0
      map[id] = correct ? Math.max(0, prev - MISS_RELIEF) : prev + MISS_PENALTY
    }
  }

  save(p)
  return p
}

export function stageAccuracy(s: EarStageStats): number | null {
  return s.total > 0 ? Math.round((s.correct / s.total) * 100) : null
}
