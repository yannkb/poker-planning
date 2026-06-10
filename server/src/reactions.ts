// Validation helpers for transient reaction events (emoji throws, GIF reactions).

// Accept any real emoji sequence (including ZWJ sequences and skin tones), but
// reject plain text so arbitrary words can't be "thrown" at people.
const EMOJI_SEQUENCE = /^[\p{Extended_Pictographic}\p{Emoji_Component}‍️]+$/u
const HAS_PICTOGRAPH = /\p{Extended_Pictographic}/u

export function isValidEmoji(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const emoji = value.trim()
  if (!emoji || emoji.length > 20) return false
  return EMOJI_SEQUENCE.test(emoji) && HAS_PICTOGRAPH.test(emoji)
}

// GIF reactions travel as either a curated-set key or a Giphy media id;
// both are short slugs, never URLs (clients build the CDN URL themselves).
const GIF_ID = /^[A-Za-z0-9_-]{1,64}$/

export function isValidGifId(value: unknown): value is string {
  return typeof value === 'string' && GIF_ID.test(value)
}
