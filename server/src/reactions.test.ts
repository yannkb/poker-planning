import { describe, it, expect } from 'vitest'
import { isValidEmoji, isValidGifId } from './reactions'

describe('isValidEmoji', () => {
  it('accepts a plain emoji', () => {
    expect(isValidEmoji('🎉')).toBe(true)
  })

  it('accepts a ZWJ sequence (e.g. family emoji)', () => {
    expect(isValidEmoji('👨‍👩‍👧‍👦')).toBe(true)
  })

  it('accepts an emoji with a skin tone modifier', () => {
    expect(isValidEmoji('👍🏽')).toBe(true)
  })

  it('accepts a country flag (regional indicator pair)', () => {
    expect(isValidEmoji('🇫🇷')).toBe(true)
  })

  it('rejects plain text', () => {
    expect(isValidEmoji('hello')).toBe(false)
  })

  it('rejects an empty (or whitespace-only) string', () => {
    expect(isValidEmoji('')).toBe(false)
    expect(isValidEmoji('   ')).toBe(false)
  })

  it('rejects an overly long string', () => {
    expect(isValidEmoji('🎉'.repeat(15))).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidEmoji(42)).toBe(false)
    expect(isValidEmoji(undefined)).toBe(false)
    expect(isValidEmoji(null)).toBe(false)
  })
})

describe('isValidGifId', () => {
  it('accepts a short alphanumeric slug', () => {
    expect(isValidGifId('abc123')).toBe(true)
  })

  it('accepts ids with underscores and hyphens', () => {
    expect(isValidGifId('abc_123-XYZ')).toBe(true)
  })

  it('rejects a URL', () => {
    expect(isValidGifId('https://giphy.com/gifs/abc123')).toBe(false)
  })

  it('rejects an overly long id', () => {
    expect(isValidGifId('a'.repeat(65))).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidGifId('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidGifId(123)).toBe(false)
    expect(isValidGifId(undefined)).toBe(false)
  })
})
