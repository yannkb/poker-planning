import type { DeckKey } from './decks'
import type { VoteStats } from './stats'

export interface Participant {
  id: string
  name: string
  vote: string | null
  isObserver: boolean
  isFacilitator: boolean
  joinedAt: number
}

export interface Issue {
  id: string
  title: string
  estimate: string | null
  addedAt: number
}

export type RoomStatus = 'voting' | 'revealed'

export interface RoundVote {
  id: string
  name: string
  vote: string | null
}

export interface Round {
  id: string
  issueId: string | null
  votes: RoundVote[]
  stats: VoteStats | null
  revealedAt: number
}

export interface Room {
  id: string
  name: string
  deck: DeckKey
  status: RoomStatus
  participants: Participant[]
  issues: Issue[]
  currentIssueId: string | null
  rounds: Round[]
  createdAt: number
}

/** Placeholder the server sends instead of another player's unrevealed vote. */
export const HIDDEN_VOTE = '🂠'

/** Participant as seen by a client: votes sanitized, hasVoted derived. */
export interface ClientParticipant extends Participant {
  hasVoted: boolean
}

/** Room state as broadcast to clients. */
export interface ClientRoom extends Omit<Room, 'participants'> {
  deckValues: readonly string[]
  participants: ClientParticipant[]
}

export interface EmojiThrownEvent {
  id: string
  fromId: string
  fromName: string
  targetId: string
  emoji: string
}

export interface GifReactionEvent {
  id: string
  fromId: string
  fromName: string
  gif: string
}

export interface ServerToClientEvents {
  'room-state': (room: ClientRoom) => void
  'room-created': (payload: { roomId: string }) => void
  error: (payload: { message: string }) => void
  kicked: () => void
  'emoji-thrown': (event: EmojiThrownEvent) => void
  'gif-reaction': (event: GifReactionEvent) => void
}

export interface ClientToServerEvents {
  'create-room': (payload: { name?: string; facilitatorName?: string; deck?: string }) => void
  'join-room': (payload: { roomId?: string; playerName?: string }) => void
  'cast-vote': (payload: { vote: string | null }) => void
  'reveal-votes': () => void
  'new-round': () => void
  'add-issue': (payload: { title?: string }) => void
  'select-issue': (payload: { issueId?: string }) => void
  'set-estimate': (payload: { issueId?: string; estimate?: string }) => void
  'change-deck': (payload: { deck?: string }) => void
  'kick-participant': (payload: { targetId?: string }) => void
  'toggle-observer': () => void
  'throw-emoji': (payload: { targetId?: string; emoji?: string }) => void
  'send-gif': (payload: { gif?: string }) => void
}

export interface GifSearchResult {
  id: string
  title: string
  preview: string
}
