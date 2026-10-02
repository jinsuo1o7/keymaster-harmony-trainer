export const BPM_MIN = 60
export const BPM_MAX = 180
export const BPM_STEP = 5
export const BPM_QUIZ_STEPS = [5, 10] as const
export type BpmQuizStep = typeof BPM_QUIZ_STEPS[number]
export const BPM_RHYTHMS = [
  { label: '4분음표', subdivision: 1 },
  { label: '8분음표', subdivision: 2 },
  { label: '16분음표', subdivision: 4 },
  { label: '3잇단음표', subdivision: 3 },
] as const
export type BpmSubdivision = typeof BPM_RHYTHMS[number]['subdivision']
export const BPM_VALUES = Array.from(
  { length: (BPM_MAX - BPM_MIN) / BPM_STEP + 1 },
  (_, i) => BPM_MIN + i * BPM_STEP,
)

export function getBpmValues(min: number, max: number, step: BpmQuizStep = BPM_STEP): number[] {
  if (
    !Number.isInteger(min) || !Number.isInteger(max) || min > max ||
    min < BPM_MIN || max > BPM_MAX || !BPM_QUIZ_STEPS.includes(step)
  ) {
    throw new Error('Invalid BPM quiz range')
  }

  return Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, index) => min + index * step,
  )
}

export function nextBpm(previous: number | null, values: readonly number[] = BPM_VALUES): number {
  if (values.length === 0) throw new Error('BPM values are required')
  const candidates = values.filter(bpm => bpm !== previous)
  if (candidates.length === 0) return values[0]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Schedule on the audio clock so UI timers cannot change the tempo.
// Each playback owns its context, allowing immediate cancellation on navigation.
export async function playBpm(
  bpm: number,
  signal: AbortSignal,
  onStarted?: () => void,
  subdivision: BpmSubdivision = 1,
): Promise<void> {
  if (!BPM_VALUES.includes(bpm)) throw new Error('Invalid BPM')
  if (!BPM_RHYTHMS.some(rhythm => rhythm.subdivision === subdivision)) throw new Error('Invalid subdivision')
  if (signal.aborted) return
  const context = new AudioContext()
  const close = () => { void context.close().catch(() => {}) }
  signal.addEventListener('abort', close, { once: true })
  try {
    await context.resume()
    if (signal.aborted) return
    // BPM always counts quarter notes; subdivision sets the clicks per beat.
    // Native looping stays steady even when browser timers are throttled.
    const interval = 60 / bpm / subdivision
    const frames = Math.round(context.sampleRate * interval)
    const buffer = context.createBuffer(1, frames, context.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < Math.min(frames, context.sampleRate * 0.05); i++) {
      const time = i / context.sampleRate
      const envelope = Math.min(1, time / 0.002) * Math.exp(-time * 130)
      samples[i] = Math.sin(2 * Math.PI * 1000 * time) * 0.3 * envelope
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.playbackRate.value = frames / context.sampleRate / interval
    source.connect(context.destination)
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        signal.removeEventListener('abort', finish)
        source.disconnect()
        resolve()
      }
      signal.addEventListener('abort', finish, { once: true })
      try {
        source.start(context.currentTime)
        onStarted?.()
      } catch (error) {
        signal.removeEventListener('abort', finish)
        source.disconnect()
        reject(error)
      }
    })
  } finally {
    signal.removeEventListener('abort', close)
    if (context.state !== 'closed') close()
  }
}
