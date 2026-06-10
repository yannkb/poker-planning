// Emojis that can be thrown at other participants.
// The server validates payloads (any real emoji sequence is allowed).
export const THROWABLE_EMOJIS: readonly string[] = ['🎉', '❤️', '😂', '👏', '🔥', '🍅', '🥚', '💩']

export interface ReactionGif {
  label: string
  url: string
}

// Resolve a broadcast gif payload (curated key or Giphy media id) to a CDN URL
export function gifUrl(gif: string): string {
  return REACTION_GIFS[gif]?.url ?? `https://media.giphy.com/media/${gif}/giphy.gif`
}

// Curated reaction GIFs served from the Giphy CDN (no API key required).
export const REACTION_GIFS: Record<string, ReactionGif> = {
  'on-it': { label: 'On it', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  'dev-dog': { label: 'Dev dog', url: 'https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif' },
  'mind-blown': { label: 'Mind blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  'nothing-to-see': { label: 'Nothing to see here', url: 'https://media.giphy.com/media/13d2jHlSlxklVe/giphy.gif' },
  'celebrate': { label: 'Celebrate', url: 'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif' },
  'wrong': { label: 'Wrong', url: 'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif' },
  'lol': { label: 'LOL', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  'big-brain': { label: 'Big brain', url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif' },
  'shocked': { label: 'Shocked', url: 'https://media.giphy.com/media/o75ajIFH0QnQC3nCeD/giphy.gif' },
}
