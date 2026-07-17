import { describe, it, expect } from 'vitest'
import { summarizeVotes, computeStats, nearestDeckValue } from './stats'

describe('summarizeVotes', () => {
  it('extracts numeric votes, including the half-point card', () => {
    const { numeric } = summarizeVotes(['1', '2', '½'])
    expect(numeric).toEqual([1, 2, 0.5])
  })

  it('ignores non-numeric votes (e.g. "?" or "☕") when computing numeric', () => {
    const { numeric } = summarizeVotes(['3', '?', '☕', '5'])
    expect(numeric).toEqual([3, 5])
  })

  it('rounds the average to one decimal place', () => {
    const { average } = summarizeVotes(['1', '2', '2'])
    expect(average).toBeCloseTo(1.7, 5)
  })

  it('returns null average when there are no numeric votes', () => {
    const { average } = summarizeVotes(['?', '☕'])
    expect(average).toBeNull()
  })

  it('counts occurrences of each vote value', () => {
    const { counts } = summarizeVotes(['3', '3', '5'])
    expect(counts).toEqual({ '3': 2, '5': 1 })
  })

  it('is consensus when 2+ votes are cast and all identical', () => {
    expect(summarizeVotes(['3', '3']).consensus).toBe(true)
    expect(summarizeVotes(['3', '3', '3']).consensus).toBe(true)
  })

  it('is not consensus with a single vote', () => {
    expect(summarizeVotes(['3']).consensus).toBe(false)
  })

  it('is not consensus when votes differ', () => {
    expect(summarizeVotes(['3', '5']).consensus).toBe(false)
  })

  it('is not consensus with zero votes', () => {
    expect(summarizeVotes([]).consensus).toBe(false)
  })
})

describe('computeStats', () => {
  it('returns null when no numeric votes were cast', () => {
    expect(computeStats(['?', '☕'])).toBeNull()
  })

  it('returns null for an empty vote list', () => {
    expect(computeStats([])).toBeNull()
  })

  it('computes average/min/max/counts from numeric votes', () => {
    const stats = computeStats(['1', '3', '5'])
    expect(stats).toEqual({
      average: 3,
      min: 1,
      max: 5,
      counts: { '1': 1, '3': 1, '5': 1 },
    })
  })

  it('ignores non-numeric votes when computing min/max', () => {
    const stats = computeStats(['2', '8', '?'])
    expect(stats?.min).toBe(2)
    expect(stats?.max).toBe(8)
  })
})

describe('nearestDeckValue', () => {
  const values = ['1', '2', '3', '5', '8', '13']

  it('snaps to the closest card', () => {
    expect(nearestDeckValue(6, values)).toBe('5')
    expect(nearestDeckValue(9, values)).toBe('8')
  })

  it('rounds up to the larger card on a tie', () => {
    // 4 is equidistant between 3 and 5; ascending order means ties favor the later (larger) card.
    expect(nearestDeckValue(4, ['3', '5'])).toBe('5')
  })

  it('ignores non-numeric cards while snapping', () => {
    expect(nearestDeckValue(2, ['1', '2', '3', '?', '☕'])).toBe('2')
  })

  it('returns null when the deck has no numeric cards', () => {
    expect(nearestDeckValue(2, ['XS', 'S', 'M', '?', '☕'])).toBeNull()
  })
})
