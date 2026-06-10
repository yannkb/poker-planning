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
  const n = parseFloat(vote)
  return Number.isNaN(n) ? null : n
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
