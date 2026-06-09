// Validation helpers for transient reaction events (emoji throws, GIF reactions).

// Accept any real emoji sequence (including ZWJ sequences and skin tones), but
// reject plain text so arbitrary words can't be "thrown" at people.
const EMOJI_SEQUENCE = /^[\p{Extended_Pictographic}\p{Emoji_Component}‍️]+$/u

function isValidEmoji(value) {
  if (typeof value !== 'string') return false
  const emoji = value.trim()
  if (!emoji || emoji.length > 20) return false
  if (!EMOJI_SEQUENCE.test(emoji)) return false
  return /\p{Extended_Pictographic}/u.test(emoji)
}

// GIF reactions travel as either a curated-set key or a Giphy media id;
// both are short slugs, never URLs (clients build the CDN URL themselves).
function isValidGifId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value)
}

module.exports = { isValidEmoji, isValidGifId }
