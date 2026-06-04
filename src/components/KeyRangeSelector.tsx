import type { KeyGroup } from '@/src/types/quiz'
import { KEY_GROUPS, SUPPORTED_KEYS } from '@/src/data/musicTheory'

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
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'flat', 'sharp', 'custom'] as KeyGroup[]).map(group => (
          <button
            key={group}
            onClick={() => onGroupChange(group)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedGroup === group
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {GROUP_LABELS[group]}
          </button>
        ))}
      </div>

      {selectedGroup === 'custom' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {SUPPORTED_KEYS.map(key => (
            <button
              key={key}
              onClick={() => toggleCustomKey(key)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                customKeys.includes(key)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        현재 출제 범위:{' '}
        <span className="text-purple-300 font-medium">
          {GROUP_LABELS[selectedGroup]}
          {' — '}
          {activeKeys.length > 0 ? activeKeys.join(', ') : '없음 (전체 키로 대체)'}
        </span>
      </p>
    </div>
  )
}
