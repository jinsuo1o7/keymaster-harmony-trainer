import { describe, it, expect } from 'vitest'
import { chordLabel } from './earTrainingUtils'

describe('earTrainingUtils smoke', () => {
  it('exposes chordLabel', () => {
    expect(chordLabel('maj')).toBe('메이저')
  })
})
