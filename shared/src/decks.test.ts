import { describe, it, expect } from 'vitest'
import { DECKS, DECK_KEYS, DEFAULT_DECK, isDeckKey } from './decks'

describe('isDeckKey', () => {
  it('returns true for each known deck key', () => {
    for (const key of DECK_KEYS) {
      expect(isDeckKey(key)).toBe(true)
    }
  })

  it('returns false for an unknown string', () => {
    expect(isDeckKey('not-a-real-deck')).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isDeckKey(undefined)).toBe(false)
    expect(isDeckKey(42)).toBe(false)
    expect(isDeckKey(null)).toBe(false)
  })
})

describe('DECK_KEYS', () => {
  it('matches the keys of DECKS', () => {
    expect([...DECK_KEYS].sort()).toEqual(Object.keys(DECKS).sort())
  })
})

describe('DEFAULT_DECK', () => {
  it('is a valid, known deck key', () => {
    expect(isDeckKey(DEFAULT_DECK)).toBe(true)
    expect(DECK_KEYS).toContain(DEFAULT_DECK)
  })
})
