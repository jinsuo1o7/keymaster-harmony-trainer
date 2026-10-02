import { afterEach, describe, expect, it, vi } from 'vitest'
import { BPM_VALUES, BPM_RHYTHMS, getBpmValues, nextBpm, playBpm } from './bpmTraining'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('BPM questions', () => {
  it('covers 60–180 in five-BPM steps and excludes the previous answer', () => {
    expect(BPM_VALUES).toHaveLength(25)
    expect(BPM_VALUES[0]).toBe(60)
    expect(BPM_VALUES.at(-1)).toBe(180)
    for (const previous of [null, ...BPM_VALUES]) {
      const count = previous === null ? 25 : 24
      const results = new Set<number>()
      for (let i = 0; i < count; i++) {
        vi.spyOn(Math, 'random').mockReturnValue((i + 0.5) / count)
        const bpm = nextBpm(previous)
        expect(bpm % 5).toBe(0)
        expect(bpm).not.toBe(previous)
        expect(BPM_VALUES).toContain(bpm)
        results.add(bpm)
      }
      expect(results.size).toBe(count)
    }
  })
})

describe('custom BPM question settings', () => {
  it('builds candidate BPMs for the chosen range and unit', () => {
    expect(getBpmValues(70, 120, 5)).toEqual([70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120])
    expect(getBpmValues(70, 120, 10)).toEqual([70, 80, 90, 100, 110, 120])
  })

  it('does not repeat the previous BPM when another candidate is available', () => {
    const values = getBpmValues(100, 120, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(nextBpm(100, values)).toBe(110)
    expect(nextBpm(110, values)).toBe(100)
  })

  it('allows a one-value range', () => {
    expect(nextBpm(100, getBpmValues(100, 100, 5))).toBe(100)
  })
})

describe('metronome audio', () => {
  function mockAudio() {
    const source = {
      buffer: null as AudioBuffer | null, loop: false, playbackRate: { value: 1 },
      connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(),
    }
    const context = {
      currentTime: 10, sampleRate: 44100, state: 'running', destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(async () => { context.state = 'closed' }),
      createBuffer: vi.fn((_channels: number, frames: number, sampleRate: number) => {
        const samples = new Float32Array(frames)
        return { duration: frames / sampleRate, getChannelData: () => samples }
      }),
      createBufferSource: () => source,
    }
    vi.stubGlobal('AudioContext', vi.fn(() => context))
    return { context, source }
  }

  it.each([60, 95, 180])('loops one quarter note at exactly %i BPM until stopped', async bpm => {
    const { context, source } = mockAudio()
    const controller = new AbortController()
    const started = vi.fn()
    const settled = vi.fn()
    const pending = playBpm(bpm, controller.signal, started).then(settled)
    await vi.waitFor(() => expect(started).toHaveBeenCalledOnce())
    expect(source.loop).toBe(true)
    expect(source.start).toHaveBeenCalledWith(10)
    expect(source.buffer!.duration / source.playbackRate.value).toBeCloseTo(60 / bpm, 10)
    const samples = source.buffer!.getChannelData(0)
    expect(samples.some(sample => Math.abs(sample) > 0.01)).toBe(true)
    expect(samples.slice(Math.ceil(context.sampleRate * 0.05)).every(sample => sample === 0)).toBe(true)
    expect(settled).not.toHaveBeenCalled()
    expect(context.close).not.toHaveBeenCalled()
    controller.abort()
    await pending
    expect(context.close).toHaveBeenCalledOnce()
    expect(source.disconnect).toHaveBeenCalledOnce()
  })

  it.each(BPM_RHYTHMS.flatMap(rhythm => [60, 95, 180].map(bpm => ({ ...rhythm, bpm }))))(
    'plays $label at $bpm BPM with $subdivision clicks per beat', async ({ bpm, subdivision }) => {
      const { context, source } = mockAudio()
      const controller = new AbortController()
      const started = vi.fn()
      const pending = playBpm(bpm, controller.signal, started, subdivision)
      await vi.waitFor(() => expect(started).toHaveBeenCalledOnce())
      expect(source.loop).toBe(true)
      const clickInterval = source.buffer!.duration / source.playbackRate.value
      expect(clickInterval * subdivision).toBeCloseTo(60 / bpm, 10)
      const samples = source.buffer!.getChannelData(0)
      expect(samples.some(sample => Math.abs(sample) > 0.01)).toBe(true)
      expect(samples.slice(Math.ceil(context.sampleRate * 0.05)).every(sample => sample === 0)).toBe(true)
      controller.abort()
      await pending
      expect(context.close).toHaveBeenCalledOnce()
    },
  )

  it('does not start playback if cancelled while resuming', async () => {
    const { context, source } = mockAudio()
    const controller = new AbortController()
    const started = vi.fn()
    const pending = playBpm(120, controller.signal, started)
    controller.abort()
    await pending
    expect(source.start).not.toHaveBeenCalled()
    expect(started).not.toHaveBeenCalled()
    expect(context.close).toHaveBeenCalledOnce()
  })

  it('releases the context and reports playback failures', async () => {
    const { context, source } = mockAudio()
    source.start.mockImplementation(() => { throw new Error('Audio failed') })
    const started = vi.fn()
    await expect(playBpm(120, new AbortController().signal, started)).rejects.toThrow('Audio failed')
    expect(started).not.toHaveBeenCalled()
    expect(context.close).toHaveBeenCalledOnce()
  })
})
