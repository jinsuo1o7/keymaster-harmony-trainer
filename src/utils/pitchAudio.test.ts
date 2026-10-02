import { afterEach, describe, expect, it, vi } from 'vitest'
import { playPitchNotes } from './pitchAudio'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function mockAudio() {
  const oscillators: { frequency: { value: number }; type: string; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = []
  const context = {
    currentTime: 10, state: 'running', destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(async () => { context.state = 'closed' }),
    createOscillator: () => {
      const node = { frequency: { value: 0 }, type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
      oscillators.push(node)
      return node
    },
    createGain: () => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }),
  }
  vi.stubGlobal('AudioContext', vi.fn(() => context))
  return { context, oscillators }
}

describe('pitch audio lifecycle', () => {
  it('uses equal-tempered frequencies and waits for the final note to finish', async () => {
    vi.useFakeTimers()
    const { context, oscillators } = mockAudio()
    const done = vi.fn()
    const pending = playPitchNotes([69, 81], new AbortController().signal).then(done)
    await vi.advanceTimersByTimeAsync(0)
    expect(oscillators.map(node => node.frequency.value)).toEqual([440, 880])
    expect(oscillators[1].start.mock.calls[0][0] - oscillators[0].start.mock.calls[0][0]).toBeCloseTo(0.85)
    await vi.advanceTimersByTimeAsync(1500)
    expect(done).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    await pending
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('leaves a larger gap before the degree question', async () => {
    vi.useFakeTimers()
    const { oscillators } = mockAudio()
    const pending = playPitchNotes([60, 64, 67, 60, 62], new AbortController().signal)
    await vi.advanceTimersByTimeAsync(0)
    expect(oscillators[4].start.mock.calls[0][0] - oscillators[3].start.mock.calls[0][0]).toBeCloseTo(1.25)
    await vi.runAllTimersAsync()
    await pending
  })

  it('cancels pending notes immediately and clears the completion timer', async () => {
    vi.useFakeTimers()
    const { context } = mockAudio()
    const controller = new AbortController()
    const pending = playPitchNotes([60, 72], controller.signal)
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await pending
    expect(context.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not schedule any notes when cancelled during resume', async () => {
    const { context, oscillators } = mockAudio()
    const controller = new AbortController()
    const pending = playPitchNotes([60, 72], controller.signal)
    controller.abort()
    await pending
    expect(oscillators).toHaveLength(0)
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('propagates audio errors and releases the context', async () => {
    const { context } = mockAudio()
    context.resume.mockRejectedValue(new Error('Playback unavailable'))
    await expect(playPitchNotes([60], new AbortController().signal)).rejects.toThrow('Playback unavailable')
    expect(context.close).toHaveBeenCalledOnce()
  })
})
