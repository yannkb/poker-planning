export interface VoteStats {
  average: number
  min: number
  max: number
  counts: Record<string, number>
}

/** Summary of a set of revealed votes, used by both result views and quips. */
export interface VoteSummary {
  /** Average of numeric votes rounded to one decimal, or null if none. */
  average: number | null
  numeric: number[]
  counts: Record<string, number>
  /** True when 2+ votes were cast and they are all identical. */
  consensus: boolean
}

function numericValue(vote: string): number | null {
  if (vote === '½') return 0.5
  const n = parseFloat(vote)
  return Number.isNaN(n) ? null : n
}

/**
 * Snap a numeric average onto the closest real card in the deck so an estimate
 * stays on the scale (e.g. 1.8 → "2"). Ties round up to the larger card, since
 * decks are ordered ascending. Returns null when the deck has no numeric cards.
 */
export function nearestDeckValue(target: number, deckValues: readonly string[]): string | null {
  let best: string | null = null
  let bestDist = Infinity
  for (const value of deckValues) {
    const n = numericValue(value)
    if (n === null) continue
    const dist = Math.abs(n - target)
    if (dist <= bestDist) {
      bestDist = dist
      best = value
    }
  }
  return best
}

export function summarizeVotes(votes: readonly string[]): VoteSummary {
  const numeric = votes
    .map(numericValue)
    .filter((n): n is number => n !== null)
  const counts: Record<string, number> = {}
  for (const vote of votes) counts[vote] = (counts[vote] ?? 0) + 1
  return {
    average: numeric.length
      ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
      : null,
    numeric,
    counts,
    consensus: votes.length > 1 && new Set(votes).size === 1,
  }
}

/** Round statistics stored in room history; null when no numeric vote was cast. */
export function computeStats(votes: readonly string[]): VoteStats | null {
  const { average, numeric, counts } = summarizeVotes(votes)
  if (average === null) return null
  return {
    average,
    min: Math.min(...numeric),
    max: Math.max(...numeric),
    counts,
  }
}
