// Web Audio engine for ear training.
// Everything works in MIDI note numbers so a question can be transposed to any
// key: pitch = 440 * 2^((midi-69)/12).
//
// Notes are synthesised with Karplus–Strong (a noise burst fed through a short,
// slightly-damped delay line) which physically models a plucked string — it
// sounds like an acoustic guitar without needing any audio samples.

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Semitone offsets of a major scale, tonic..tonic+octave, for the intro run.
const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12]

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

async function ensureRunning(): Promise<AudioContext> {
  const c = getCtx()
  if (c.state === 'suspended') await c.resume()
  return c
}

// Render a plucked-string note into a buffer via Karplus–Strong.
function makePluckBuffer(c: AudioContext, freq: number, seconds: number): AudioBuffer {
  const sr = c.sampleRate
  const N = Math.max(2, Math.round(sr / freq)) // delay length sets the pitch
  const len = Math.max(1, Math.floor(seconds * sr))
  const buf = c.createBuffer(1, len, sr)
  const out = buf.getChannelData(0)

  // Excitation: a noise burst, lightly averaged so the pick isn't too harsh.
  const line = new Float32Array(N)
  for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1
  for (let i = 0; i < N; i++) line[i] = 0.5 * (line[i] + line[(i + 1) % N])

  // Damped feedback loop: the running average rolls off highs over time, so the
  // tone starts bright and mellows as it decays — the plucked-string signature.
  const decay = 0.996
  let p = 0
  for (let n = 0; n < len; n++) {
    const next = (p + 1) % N
    out[n] = line[p]
    line[p] = decay * 0.5 * (line[p] + line[next])
    p = next
  }
  return buf
}

function scheduleMidi(
  c: AudioContext,
  midi: number,
  startAt: number,
  duration: number,
  volume = 0.3,
): void {
  const tail = 0.4 // let the string ring out past its slot
  const src = c.createBufferSource()
  src.buffer = makePluckBuffer(c, midiToFreq(midi), duration + tail)

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 4000 // warmth, like a soundhole

  const gain = c.createGain()
  src.connect(lp)
  lp.connect(gain)
  gain.connect(c.destination)

  const peak = Math.min(1, volume * 2.4)
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.005) // sharp pluck attack
  gain.gain.setTargetAtTime(0, startAt + duration, 0.12)   // soft release after the slot

  src.start(startAt)
  src.stop(startAt + duration + tail)
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// Ground the ear in the key: ascending major scale from the tonic, then a clear
// tonic. The tonic is passed in so each question can be in a different key.
export async function establishKey(tonic: number): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05

  const dur = 0.3
  const step = dur + 0.06
  MAJOR_SCALE_OFFSETS.forEach((off, i) => scheduleMidi(c, tonic + off, now + i * step, dur, 0.2))

  // Restate the tonic right on the heels of the scale so it reads as the scale
  // resolving home — one phrase — rather than a separate note.
  const tonicStart = now + MAJOR_SCALE_OFFSETS.length * step + 0.1
  scheduleMidi(c, tonic, tonicStart, 0.6, 0.3)

  return wait((tonicStart - now + 0.6 + 0.2) * 1000)
}

export const silence = (ms: number) => wait(ms)

export async function playMidi(midi: number, duration = 0.8): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05
  scheduleMidi(c, midi, now, duration, 0.42)
  return wait((duration + 0.15) * 1000)
}

// Play a melody: one note after another with a small gap between them.
export async function playMidiSequence(
  midis: number[],
  { noteDur = 0.5, gap = 0.12 }: { noteDur?: number; gap?: number } = {},
): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05
  const step = noteDur + gap
  midis.forEach((midi, i) => scheduleMidi(c, midi, now + i * step, noteDur, 0.42))
  return wait((midis.length * step + 0.15) * 1000)
}

// Play a chord: all notes together, with a tiny roll between them so it reads as
// a strummed guitar chord rather than a rigid stab. Per-note volume is kept low
// because 3–4 plucks sum at the output and would otherwise clip.
export async function playChord(midis: number[], duration = 1.5): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05
  const roll = 0.028 // seconds between successive strings
  midis.forEach((midi, i) => scheduleMidi(c, midi, now + i * roll, duration, 0.16))
  return wait((duration + midis.length * roll + 0.15) * 1000)
}

// Play a sequence of chords (a progression): each chord is a lightly-strummed
// block, with a clear gap between chords so the harmonic changes are distinct.
export async function playChordProgression(
  chords: number[][],
  { chordDur = 1.1, gap = 0.3 }: { chordDur?: number; gap?: number } = {},
): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05
  const roll = 0.028
  const step = chordDur + gap
  chords.forEach((chord, ci) => {
    const at = now + ci * step
    chord.forEach((midi, ni) => scheduleMidi(c, midi, at + ni * roll, chordDur, 0.16))
  })
  return wait((chords.length * step + 0.15) * 1000)
}

// Feedback after a correct answer: play the target, then let it settle to the tonic.
export async function playResolution(midi: number, tonic: number): Promise<void> {
  const c = await ensureRunning()
  const now = c.currentTime + 0.05
  scheduleMidi(c, midi, now, 0.6, 0.42)
  scheduleMidi(c, tonic, now + 0.75, 0.9, 0.45)
  return wait(2000)
}
