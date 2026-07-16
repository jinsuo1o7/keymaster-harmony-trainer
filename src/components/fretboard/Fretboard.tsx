'use client'
import { MAX_FRET, OPEN_MIDI } from '@/src/utils/fretboardUtils'

export interface Marker {
  string: number
  fret: number
  kind: 'start' | 'done' | 'hint' | 'wrong'
  label?: string
}

interface FretboardProps {
  markers: Marker[]
  onFretClick: (string: number, fret: number) => void
  disabled?: boolean
}

const FRET_W = 40
const STRING_GAP = 26
const PAD_L = 40
const PAD_T = 16
const DOTS = [3, 5, 7, 9, 12, 15]
const STRINGS = OPEN_MIDI.length // 6

// High E (index 5) drawn at the top, low E (index 0) at the bottom.
const yFor = (s: number) => PAD_T + (STRINGS - 1 - s) * STRING_GAP
const xFor = (f: number) => PAD_L + f * FRET_W

const FILL: Record<Marker['kind'], string> = {
  start: 'var(--color-primary, #6ee7b7)',
  done: 'var(--color-success, #34d399)',
  hint: 'transparent',
  wrong: 'var(--color-danger, #f87171)',
}

export default function Fretboard({ markers, onFretClick, disabled }: FretboardProps) {
  const width = PAD_L * 2 + (MAX_FRET + 1) * FRET_W
  const height = PAD_T * 2 + (STRINGS - 1) * STRING_GAP
  const markerAt = (s: number, f: number) =>
    markers.find(m => m.string === s && m.fret === f)

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-2 border border-border p-2">
      <svg width={width} height={height + 20} className="select-none">
        {/* fret wires */}
        {Array.from({ length: MAX_FRET + 2 }, (_, f) => (
          <line key={`v${f}`} x1={xFor(f)} y1={yFor(STRINGS - 1)} x2={xFor(f)}
            y2={yFor(0)} stroke="var(--color-border, #333)" strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {/* strings */}
        {OPEN_MIDI.map((_, s) => (
          <line key={`s${s}`} x1={xFor(0)} y1={yFor(s)} x2={xFor(MAX_FRET + 1)}
            y2={yFor(s)} stroke="var(--color-muted, #888)" strokeWidth={1} />
        ))}
        {/* position dots */}
        {DOTS.map(f => (
          <circle key={`d${f}`} cx={xFor(f) - FRET_W / 2} cy={height + 8} r={3}
            fill="var(--color-faint, #555)" />
        ))}
        {/* clickable cells + markers */}
        {OPEN_MIDI.map((_, s) =>
          Array.from({ length: MAX_FRET + 1 }, (_, f) => {
            const m = markerAt(s, f)
            return (
              <g key={`c${s}-${f}`}>
                <rect x={xFor(f) - FRET_W} y={yFor(s) - STRING_GAP / 2}
                  width={FRET_W} height={STRING_GAP} fill="transparent"
                  style={{ cursor: disabled ? 'default' : 'pointer' }}
                  onClick={() => !disabled && onFretClick(s, f)} />
                {m && (
                  <>
                    <circle cx={xFor(f) - FRET_W / 2} cy={yFor(s)} r={9}
                      fill={FILL[m.kind]}
                      stroke={m.kind === 'hint' ? 'var(--color-faint, #555)' : 'none'}
                      strokeDasharray={m.kind === 'hint' ? '3 2' : undefined}
                      opacity={m.kind === 'hint' ? 0.7 : 1} />
                    {m.label && (
                      <text x={xFor(f) - FRET_W / 2} y={yFor(s) + 4}
                        textAnchor="middle" fontSize={10}
                        fill="var(--color-fg, #eee)">{m.label}</text>
                    )}
                  </>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}
