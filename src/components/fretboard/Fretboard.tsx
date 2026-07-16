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
  // Visible fret window [loFret, hiFret]. The board only renders and only
  // accepts clicks within this range, so a localized chord shape reads large
  // and the board never needs to scroll horizontally.
  loFret: number
  hiFret: number
  onFretClick: (string: number, fret: number) => void
  disabled?: boolean
}

const STRINGS = OPEN_MIDI.length // 6
const OPEN_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'] // index 0 = low E .. 5 = high E
const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]

const FRET_W = 54
const STRING_GAP = 30
const PAD_L = 30 // room for open-string name labels
const PAD_R = 12
const PAD_T = 16
const PAD_B = 26 // room for fret numbers
// Bass strings drawn a touch thicker (index 0 = low E), for depth + hierarchy.
const STRING_WIDTH = [2.4, 2.0, 1.7, 1.4, 1.1, 1.0]

export default function Fretboard({ markers, loFret, hiFret, onFretClick, disabled }: FretboardProps) {
  const lo = Math.max(0, Math.min(loFret, MAX_FRET))
  const hi = Math.max(lo, Math.min(hiFret, MAX_FRET))
  const nCols = hi - lo + 1

  const boardW = nCols * FRET_W
  const svgW = PAD_L + boardW + PAD_R
  const svgH = PAD_T + (STRINGS - 1) * STRING_GAP + PAD_B

  const wireX = (i: number) => PAD_L + i * FRET_W // i in 0..nCols
  const centerX = (f: number) => PAD_L + (f - lo + 0.5) * FRET_W
  const yFor = (s: number) => PAD_T + (STRINGS - 1 - s) * STRING_GAP
  const midY = (yFor(0) + yFor(STRINGS - 1)) / 2

  const markerAt = (s: number, f: number) => markers.find(m => m.string === s && m.fret === f)

  return (
    <div className="rounded-xl bg-surface-2 border border-border px-3 py-3">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxWidth: svgW, height: 'auto', display: 'block', margin: '0 auto' }}
        className="select-none"
      >
        {/* inlays (behind everything) */}
        {INLAYS.filter(f => f >= lo && f <= hi).map(f =>
          f % 12 === 0 ? (
            <g key={`inlay${f}`} opacity={0.5}>
              <circle cx={centerX(f)} cy={midY - STRING_GAP * 0.8} r={4} fill="var(--color-faint, #64748b)" />
              <circle cx={centerX(f)} cy={midY + STRING_GAP * 0.8} r={4} fill="var(--color-faint, #64748b)" />
            </g>
          ) : (
            <circle key={`inlay${f}`} cx={centerX(f)} cy={midY} r={4} fill="var(--color-faint, #64748b)" opacity={0.5} />
          ),
        )}

        {/* fret wires (right edge of each column) */}
        {Array.from({ length: nCols }, (_, i) => (
          <line key={`w${i}`} x1={wireX(i + 1)} y1={yFor(STRINGS - 1)} x2={wireX(i + 1)} y2={yFor(0)}
            stroke="var(--color-border, #263141)" strokeWidth={2} />
        ))}
        {/* left boundary: thick nut when the window starts at the open position */}
        <line x1={wireX(0)} y1={yFor(STRINGS - 1)} x2={wireX(0)} y2={yFor(0)}
          stroke={lo === 0 ? 'var(--color-muted, #9aa7b8)' : 'var(--color-border, #263141)'}
          strokeWidth={lo === 0 ? 5 : 2} strokeLinecap="round" />

        {/* strings */}
        {OPEN_MIDI.map((_, s) => (
          <line key={`s${s}`} x1={wireX(0)} y1={yFor(s)} x2={wireX(nCols)} y2={yFor(s)}
            stroke="var(--color-muted, #9aa7b8)" strokeWidth={STRING_WIDTH[s]} />
        ))}

        {/* open-string names */}
        {OPEN_NAMES.map((name, s) => (
          <text key={`sn${s}`} x={PAD_L - 8} y={yFor(s) + 4} textAnchor="end" fontSize={11}
            fill="var(--color-faint, #64748b)" fontFamily="var(--font-mono, monospace)">{name}</text>
        ))}

        {/* fret numbers */}
        {Array.from({ length: nCols }, (_, i) => {
          const f = lo + i
          return (
            <text key={`fn${f}`} x={centerX(f)} y={svgH - 8} textAnchor="middle" fontSize={11}
              fill="var(--color-faint, #64748b)" fontFamily="var(--font-mono, monospace)">{f}</text>
          )
        })}

        {/* clickable cells + markers */}
        {OPEN_MIDI.map((_, s) =>
          Array.from({ length: nCols }, (_, i) => {
            const f = lo + i
            const m = markerAt(s, f)
            return (
              <g key={`c${s}-${f}`}>
                <rect x={wireX(i)} y={yFor(s) - STRING_GAP / 2} width={FRET_W} height={STRING_GAP}
                  fill="transparent" style={{ cursor: disabled ? 'default' : 'pointer' }}
                  onClick={() => !disabled && onFretClick(s, f)} />
                {m && <MarkerDot cx={centerX(f)} cy={yFor(s)} marker={m} />}
              </g>
            )
          }),
        )}
      </svg>
    </div>
  )
}

const SOLID_FILL: Record<'start' | 'done' | 'wrong', string> = {
  start: 'var(--color-primary, #14b8a6)',
  done: 'var(--color-success, #f59e0b)',
  wrong: 'var(--color-danger, #ef4444)',
}

function MarkerDot({ cx, cy, marker }: { cx: number; cy: number; marker: Marker }) {
  const r = 13
  if (marker.kind === 'hint') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="var(--color-surface-2, #1a2230)"
          stroke="var(--color-faint, #64748b)" strokeWidth={1.5} strokeDasharray="3 2" />
        {marker.label && (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={600}
            fill="var(--color-faint, #64748b)">{marker.label}</text>
        )}
      </g>
    )
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SOLID_FILL[marker.kind]} />
      {marker.label && (
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={700}
          fill="var(--color-bg, #0a0e14)">{marker.label}</text>
      )}
    </g>
  )
}
