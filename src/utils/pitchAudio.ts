// Cancellation silences scheduled notes as well as pending playback.
export async function playPitchNotes(notes: number[], signal: AbortSignal): Promise<void> {
  if (signal.aborted) return
  const context = new AudioContext()
  const close = () => { if (context.state !== 'closed') void context.close().catch(() => {}) }
  signal.addEventListener('abort', close, { once: true })
  try {
    await context.resume()
    if (signal.aborted) return
    const start = context.currentTime + 0.04
    const step = 0.85
    notes.forEach((midi, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const at = start + index * step + (notes.length === 5 && index === 4 ? 0.4 : 0)
      oscillator.type = 'triangle'
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12)
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.16, at + 0.025)
      gain.gain.setValueAtTime(0.16, at + 0.45)
      gain.gain.linearRampToValueAtTime(0, at + 0.65)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.7)
    })
    await new Promise<void>(resolve => {
      const finish = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', finish)
        resolve()
      }
      const timer = setTimeout(finish, (notes.length * step + 0.45) * 1000)
      signal.addEventListener('abort', finish, { once: true })
      if (signal.aborted) finish()
    })
  } finally {
    signal.removeEventListener('abort', close)
    close()
  }
}
