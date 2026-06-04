interface HeaderProps {
  currentScore: number
  bestScore: number
  streak: number
}

export default function Header({ currentScore, bestScore, streak }: HeaderProps) {
  return (
    <header className="bg-gray-800 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-purple-400 tracking-tight">
          🎹 KeyMaster
        </h1>
        <p className="text-xs text-gray-400">Harmony Trainer</p>
      </div>
      <div className="flex gap-4 text-center">
        <div>
          <div className="text-xs text-gray-400">점수</div>
          <div className="text-lg font-bold text-white">{currentScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">최고</div>
          <div className="text-lg font-bold text-yellow-400">{bestScore}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">연속</div>
          <div className="text-lg font-bold text-green-400">
            {streak > 0 ? `${streak} 🔥` : streak}
          </div>
        </div>
      </div>
    </header>
  )
}
