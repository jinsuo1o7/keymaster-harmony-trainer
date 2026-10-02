import type { KeyGroup } from '@/src/types/quiz'
import { KEY_GROUPS, KEY_PRIORITY } from '@/src/data/musicTheory'
import { getAccidentalType, getAccidentalCount } from '@/src/utils/musicTheoryUtils'

/** 조표 배지: C → '', G → '♯1', Eb → '♭3' */
function keyBadge(k: string): string {
  const type = getAccidentalType(k)
  if (type === 'none') return ''
  return (type === 'sharp' ? '♯' : '♭') + getAccidentalCount(k)
}

interface KeyRangeSelectorProps {
  selectedGroup: KeyGroup
  customKeys: string[]
  onGroupChange: (group: KeyGroup) => void
  onCustomKeysChange: (keys: string[]) => void
}

const GROUP_LABELS: Record<KeyGroup, string> = {
  all: '전체 키',
  flat: '플랫 키 집중',
  sharp: '샵 키 집중',
  custom: '직접 선택',
}

export default function KeyRangeSelector({
  selectedGroup,
  customKeys,
  onGroupChange,
  onCustomKeysChange,
}: KeyRangeSelectorProps) {
  const activeKeys =
    selectedGroup === 'custom'
      ? customKeys
      : KEY_GROUPS[selectedGroup] ?? KEY_GROUPS.all

  function toggleCustomKey(key: string) {
    if (customKeys.includes(key)) {
      onCustomKeysChange(customKeys.filter(k => k !== key))
    } else {
      onCustomKeysChange([...customKeys, key])
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'flat', 'sharp', 'custom'] as KeyGroup[]).map(group => (
          <button
            key={group}
            onClick={() => onGroupChange(group)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGroup === group
                ? 'bg-primary text-bg glow-primary'
                : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
            }`}
          >
            {GROUP_LABELS[group]}
          </button>
        ))}
      </div>

      {selectedGroup === 'custom' && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {KEY_PRIORITY.map(key => {
              const badge = keyBadge(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleCustomKey(key)}
                  className={`px-3 h-10 rounded-lg text-sm font-mono font-bold transition-colors ${
                    customKeys.includes(key)
                      ? 'bg-primary text-bg'
                      : 'bg-surface-2 text-muted hover:bg-border hover:text-fg'
                  }`}
                >
                  {key}
                  {badge && <span className="ml-1 text-[10px] opacity-60 align-super">{badge}</span>}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-faint">
            왼쪽일수록 조표가 적고 자주 쓰이는 키입니다. 배지는 조표 수(♯/♭).
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        현재 출제 범위:{' '}
        <span className="text-primary-bright font-medium">
          {GROUP_LABELS[selectedGroup]}
          {' — '}
          {activeKeys.length > 0 ? activeKeys.join(', ') : '없음 (전체 키로 대체)'}
        </span>
      </p>
    </div>
  )
}
