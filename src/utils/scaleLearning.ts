export const SCALE_OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const
export const SCALE_MAX_FRET = 12
export const SCALE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export type ScaleId = 'major' | 'naturalMinor' | 'harmonicMinor' | 'melodicMinor' | 'majorPentatonic' | 'minorPentatonic'
export interface ScaleDefinition { id: ScaleId; family: 'major' | 'minor' | 'pentatonic'; name: string; formula: string[]; semitones: number[]; description: string }

export const SCALES: ScaleDefinition[] = [
  { id: 'major', family: 'major', name: '메이저', formula: ['1', '2', '3', '4', '5', '6', '7'], semitones: [0, 2, 4, 5, 7, 9, 11], description: '밝고 안정적인 기준 스케일이에요.' },
  { id: 'naturalMinor', family: 'minor', name: '내추럴 마이너', formula: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], semitones: [0, 2, 3, 5, 7, 8, 10], description: '메이저의 3·6·7도를 낮춘 마이너예요.' },
  { id: 'harmonicMinor', family: 'minor', name: '하모닉 마이너', formula: ['1', '2', '♭3', '4', '5', '♭6', '7'], semitones: [0, 2, 3, 5, 7, 8, 11], description: '내추럴 마이너의 ♭7을 올려 강한 5도 진행을 만들어요.' },
  { id: 'melodicMinor', family: 'minor', name: '멜로딕 마이너', formula: ['1', '2', '♭3', '4', '5', '6', '7'], semitones: [0, 2, 3, 5, 7, 9, 11], description: '상행에서는 6·7도를 올린 마이너예요.' },
  { id: 'majorPentatonic', family: 'pentatonic', name: '메이저 펜타토닉', formula: ['1', '2', '3', '5', '6'], semitones: [0, 2, 4, 7, 9], description: '메이저에서 4·7도를 뺀 다섯 음이에요.' },
  { id: 'minorPentatonic', family: 'pentatonic', name: '마이너 펜타토닉', formula: ['1', '♭3', '4', '5', '♭7'], semitones: [0, 3, 5, 7, 10], description: '마이너의 핵심 다섯 음으로 블루스와 록에 자주 쓰여요.' },
]

export function scaleById(id: ScaleId): ScaleDefinition { return SCALES.find(scale => scale.id === id)! }
export function noteAt(string: number, fret: number): string { return SCALE_NOTES[(SCALE_OPEN_MIDI[string] + fret) % 12] }
export function pitchClassAt(string: number, fret: number): number { return (SCALE_OPEN_MIDI[string] + fret) % 12 }
export function scalePitchClasses(rootPc: number, scale: ScaleDefinition): number[] { return scale.semitones.map(semitone => (rootPc + semitone) % 12) }
export function scaleNoteNames(rootPc: number, scale: ScaleDefinition): string[] { return scalePitchClasses(rootPc, scale).map(pc => SCALE_NOTES[pc]) }
export function scaleMidi(rootPc: number, scale: ScaleDefinition): number[] { return scale.semitones.map(semitone => 48 + rootPc + semitone).concat(60 + rootPc) }
export function isScaleTone(rootPc: number, scale: ScaleDefinition, string: number, fret: number): boolean { return scalePitchClasses(rootPc, scale).includes(pitchClassAt(string, fret)) }
