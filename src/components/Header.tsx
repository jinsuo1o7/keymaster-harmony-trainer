interface HeaderProps {
  currentScore: number
  bestScore: number
  streak: number
}

export default function Header({ currentScore, bestScore, streak }: HeaderProps) {
  return (
    <header className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-primary-bright tracking-tight">
          🎹 KeyMaster
        </h1>
        <p className="text-xs text-muted">Harmony Trainer</p>
      </div>
      <div className="flex gap-4 text-center">
        <div>
          <div className="text-xs text-muted">점수</div>
          <div className="text-lg font-bold text-fg">{currentScore}</div>
        </div>
        <div>
          <div className="text-xs text-muted">최고</div>
          <div className="text-lg font-bold text-success-bright">{bestScore}</div>
        </div>
        <div>
          <div className="text-xs text-muted">연속</div>
          <div className="text-lg font-bold text-success-bright">
            {streak > 0 ? `${streak} 🔥` : streak}
          </div>
        </div>
      </div>
    </header>
  )
}
