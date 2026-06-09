const { nanoid } = require('nanoid')
const { DECKS, computeStats } = require('./decks')

const rooms = new Map()

function createRoom({ name, facilitatorName, facilitatorId, deck }) {
  const roomId = nanoid(6).toUpperCase()
  const participant = {
    id: facilitatorId,
    name: facilitatorName || 'Host',
    vote: null,
    isObserver: false,
    isFacilitator: true,
    joinedAt: Date.now(),
  }
  const room = {
    id: roomId,
    name: name || 'Planning Session',
    deck: DECKS[deck] ? deck : 'fibonacci',
    status: 'voting',
    participants: [participant],
    issues: [],
    currentIssueId: null,
    rounds: [],
    createdAt: Date.now(),
  }
  rooms.set(roomId, room)
  return room
}

function getRoom(roomId) {
  return rooms.get(roomId) || null
}

function joinRoom({ roomId, playerName, playerId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const existing = room.participants.find((p) => p.id === playerId)
  if (existing) return { room }
  const participant = {
    id: playerId,
    name: playerName || 'Anonymous',
    vote: null,
    isObserver: false,
    isFacilitator: false,
    joinedAt: Date.now(),
  }
  room.participants.push(participant)
  return { room }
}

function leaveRoom(roomId, playerId) {
  const room = rooms.get(roomId)
  if (!room) return null
  room.participants = room.participants.filter((p) => p.id !== playerId)
  // Transfer facilitator if the facilitator left
  if (room.participants.length > 0 && !room.participants.some((p) => p.isFacilitator)) {
    room.participants[0].isFacilitator = true
  }
  if (room.participants.length === 0) {
    rooms.delete(roomId)
    return null
  }
  return room
}

function castVote({ roomId, playerId, vote }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  if (room.status !== 'voting') return { error: 'Voting is not active' }
  const participant = room.participants.find((p) => p.id === playerId)
  if (!participant) return { error: 'Participant not found' }
  const deck = DECKS[room.deck]
  if (vote !== null && !deck.values.includes(String(vote))) return { error: 'Invalid vote value' }
  participant.vote = vote
  return { room }
}

function revealVotes({ roomId, playerId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can reveal votes' }
  if (room.status !== 'voting') return { error: 'Voting is not active' }
  room.status = 'revealed'
  const votes = room.participants.filter((p) => p.vote !== null).map((p) => p.vote)
  const stats = computeStats(votes)
  const round = {
    id: nanoid(8),
    issueId: room.currentIssueId,
    votes: room.participants.map((p) => ({ id: p.id, name: p.name, vote: p.vote })),
    stats,
    revealedAt: Date.now(),
  }
  room.rounds.push(round)
  return { room, round }
}

function newRound({ roomId, playerId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can start a new round' }
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

function addIssue({ roomId, title }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const issue = { id: nanoid(8), title: title.trim(), estimate: null, addedAt: Date.now() }
  room.issues.push(issue)
  if (!room.currentIssueId) room.currentIssueId = issue.id
  return { room, issue }
}

function selectIssue({ roomId, playerId, issueId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can select an issue' }
  const issue = room.issues.find((i) => i.id === issueId)
  if (!issue) return { error: 'Issue not found' }
  room.currentIssueId = issueId
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

function setEstimate({ roomId, playerId, issueId, estimate }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can set estimates' }
  const issue = room.issues.find((i) => i.id === issueId)
  if (!issue) return { error: 'Issue not found' }
  issue.estimate = estimate
  return { room }
}

function changeDeck({ roomId, playerId, deck }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can change the deck' }
  if (!DECKS[deck]) return { error: 'Unknown deck' }
  room.deck = deck
  room.participants.forEach((p) => { p.vote = null })
  room.status = 'voting'
  return { room }
}

function kickParticipant({ roomId, playerId, targetId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const requestor = room.participants.find((p) => p.id === playerId)
  if (!requestor?.isFacilitator) return { error: 'Only the facilitator can kick participants' }
  room.participants = room.participants.filter((p) => p.id !== targetId)
  return { room, kickedId: targetId }
}

function toggleObserver({ roomId, playerId }) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'Room not found' }
  const participant = room.participants.find((p) => p.id === playerId)
  if (!participant) return { error: 'Participant not found' }
  participant.isObserver = !participant.isObserver
  if (participant.isObserver) participant.vote = null
  return { room }
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  castVote,
  revealVotes,
  newRound,
  addIssue,
  selectIssue,
  setEstimate,
  changeDeck,
  kickParticipant,
  toggleObserver,
  DECKS,
}
