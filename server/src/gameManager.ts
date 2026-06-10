import { randomBytes, randomUUID } from 'node:crypto'
import {
  computeStats,
  DECKS,
  DEFAULT_DECK,
  isDeckKey,
  type Issue,
  type Participant,
  type Room,
} from 'planning-poker-shared'

type Failure = { error: string }
export type RoomResult = { room: Room } | Failure
export type KickResult = { room: Room; kickedId: string } | Failure

const rooms = new Map<string, Room>()

// Room codes avoid ambiguous characters (I/L/O/0/1) since people type them.
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6

function newRoomId(): string {
  let id: string
  do {
    id = Array.from(randomBytes(ROOM_CODE_LENGTH))
      .map((byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length])
      .join('')
  } while (rooms.has(id))
  return id
}

function newParticipant(id: string, name: string, isFacilitator: boolean): Participant {
  return { id, name, vote: null, isObserver: false, isFacilitator, joinedAt: Date.now() }
}

function findParticipant(room: Room, playerId: string): Participant | undefined {
  return room.participants.find((p) => p.id === playerId)
}

function requireFacilitator(room: Room, playerId: string, action: string): Failure | null {
  const participant = findParticipant(room, playerId)
  if (!participant?.isFacilitator) return { error: `Only the facilitator can ${action}` }
  return null
}

export function createRoom(args: {
  name?: string
  facilitatorName?: string
  facilitatorId: string
  deck?: string
}): Room {
  const room: Room = {
    id: newRoomId(),
    name: args.name || 'Planning Session',
    deck: isDeckKey(args.deck) ? args.deck : DEFAULT_DECK,
    status: 'voting',
    participants: [newParticipant(args.facilitatorId, args.facilitatorName || 'Host', true)],
    issues: [],
    currentIssueId: null,
    rounds: [],
    createdAt: Date.now(),
  }
  rooms.set(room.id, room)
  return room
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null
}

export function joinRoom(args: { roomId: string; playerName?: string; playerId: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  if (findParticipant(room, args.playerId)) return { room }
  room.participants.push(newParticipant(args.playerId, args.playerName || 'Anonymous', false))
  return { room }
}

export function leaveRoom(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId)
  if (!room) return null
  room.participants = room.participants.filter((p) => p.id !== playerId)
  if (room.participants.length === 0) {
    rooms.delete(roomId)
    return null
  }
  // Transfer facilitator if the facilitator left
  if (!room.participants.some((p) => p.isFacilitator)) {
    const next = room.participants[0]
    if (next) next.isFacilitator = true
  }
  return room
}

export function castVote(args: { roomId: string; playerId: string; vote: string | null }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  if (room.status !== 'voting') return { error: 'Voting is not active' }
  const participant = findParticipant(room, args.playerId)
  if (!participant) return { error: 'Participant not found' }
  const deckValues: readonly string[] = DECKS[room.deck].values
  if (args.vote !== null && !deckValues.includes(String(args.vote))) {
    return { error: 'Invalid vote value' }
  }
  participant.vote = args.vote
  return { room }
}

export function revealVotes(args: { roomId: string; playerId: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'reveal votes')
  if (denied) return denied
  if (room.status !== 'voting') return { error: 'Voting is not active' }
  room.status = 'revealed'
  const votes = room.participants.filter((p) => p.vote !== null).map((p) => p.vote as string)
  room.rounds.push({
    id: randomUUID(),
    issueId: room.currentIssueId,
    votes: room.participants.map((p) => ({ id: p.id, name: p.name, vote: p.vote })),
    stats: computeStats(votes),
    revealedAt: Date.now(),
  })
  return { room }
}

export function newRound(args: { roomId: string; playerId: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'start a new round')
  if (denied) return denied
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

export function addIssue(args: { roomId: string; title: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const issue: Issue = { id: randomUUID(), title: args.title.trim(), estimate: null, addedAt: Date.now() }
  room.issues.push(issue)
  room.currentIssueId ??= issue.id
  return { room }
}

export function selectIssue(args: { roomId: string; playerId: string; issueId: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'select an issue')
  if (denied) return denied
  if (!room.issues.some((i) => i.id === args.issueId)) return { error: 'Issue not found' }
  room.currentIssueId = args.issueId
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

export function setEstimate(args: {
  roomId: string
  playerId: string
  issueId: string
  estimate: string
}): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'set estimates')
  if (denied) return denied
  const issue = room.issues.find((i) => i.id === args.issueId)
  if (!issue) return { error: 'Issue not found' }
  issue.estimate = args.estimate
  return { room }
}

export function changeDeck(args: { roomId: string; playerId: string; deck?: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'change the deck')
  if (denied) return denied
  if (!isDeckKey(args.deck)) return { error: 'Unknown deck' }
  room.deck = args.deck
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

export function kickParticipant(args: { roomId: string; playerId: string; targetId: string }): KickResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const denied = requireFacilitator(room, args.playerId, 'kick participants')
  if (denied) return denied
  room.participants = room.participants.filter((p) => p.id !== args.targetId)
  return { room, kickedId: args.targetId }
}

export function toggleObserver(args: { roomId: string; playerId: string }): RoomResult {
  const room = rooms.get(args.roomId)
  if (!room) return { error: 'Room not found' }
  const participant = findParticipant(room, args.playerId)
  if (!participant) return { error: 'Participant not found' }
  participant.isObserver = !participant.isObserver
  if (participant.isObserver) participant.vote = null
  return { room }
}
