export const DECKS = {
  fibonacci: {
    name: 'Fibonacci',
    emoji: '🌀',
    values: ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  modified_fibonacci: {
    name: 'Modified Fibonacci',
    emoji: '🔢',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  tshirt: {
    name: 'T-Shirt',
    emoji: '👕',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  powers_of_2: {
    name: 'Powers of 2',
    emoji: '⚡',
    values: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
  days: {
    name: 'Days',
    emoji: '📅',
    values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'],
  },
} as const satisfies Record<string, { name: string; emoji: string; values: readonly string[] }>

export type DeckKey = keyof typeof DECKS

export const DECK_KEYS = Object.keys(DECKS) as DeckKey[]

export const DEFAULT_DECK: DeckKey = 'fibonacci'

export function isDeckKey(value: unknown): value is DeckKey {
  return typeof value === 'string' && value in DECKS
}
