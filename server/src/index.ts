import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import express from 'express'
import { Server, type Socket } from 'socket.io'
import {
  DECKS,
  type ClientRoom,
  type ClientToServerEvents,
  type GifSearchResult,
  type Room,
  type ServerToClientEvents,
  HIDDEN_VOTE,
} from 'planning-poker-shared'
import * as gm from './gameManager'
import { isValidEmoji, isValidGifId } from './reactions'

type PokerServer = Server<ClientToServerEvents, ServerToClientEvents>
type PokerSocket = Socket<ClientToServerEvents, ServerToClientEvents>

const app = express()
const server = createServer(app)
const io: PokerServer = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Simple REST endpoint to check if a room exists before joining
app.get('/api/room/:roomId', (req, res) => {
  const room = gm.getRoom(req.params.roomId.toUpperCase())
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  res.json({ id: room.id, name: room.name, participantCount: room.participants.length })
})

app.get('/api/decks', (_req, res) => {
  res.json(DECKS)
})

// Giphy search proxy: keeps the API key server-side. Without a key the
// client falls back to its curated reaction GIFs.
app.get('/api/gifs/search', async (req, res) => {
  const key = process.env.GIPHY_API_KEY
  if (!key) {
    res.status(503).json({ error: 'GIF search is not configured (set GIPHY_API_KEY)' })
    return
  }
  const q = String(req.query.q ?? '').trim().slice(0, 100)
  if (!q) {
    res.json({ gifs: [] })
    return
  }
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    const upstream = await fetch(url)
    if (!upstream.ok) {
      res.status(502).json({ error: 'GIF search failed' })
      return
    }
    const json = (await upstream.json()) as {
      data?: Array<{ id: string; title?: string; images?: { fixed_height_small?: { url?: string } } }>
    }
    const gifs: GifSearchResult[] = (json.data ?? []).map((g) => ({
      id: g.id,
      title: g.title ?? '',
      preview: g.images?.fixed_height_small?.url ?? `https://media.giphy.com/media/${g.id}/200.gif`,
    }))
    res.json({ gifs })
  } catch {
    res.status(502).json({ error: 'GIF search failed' })
  }
})

// Track which room each socket is in
const socketRooms = new Map<string, string>()

// Per-socket rate limiting for transient reaction events
const lastReactionAt = new Map<string, Partial<Record<'emoji' | 'gif', number>>>()

function isRateLimited(socketId: string, kind: 'emoji' | 'gif', minIntervalMs: number): boolean {
  const now = Date.now()
  const entry = lastReactionAt.get(socketId) ?? {}
  if (now - (entry[kind] ?? 0) < minIntervalMs) return true
  entry[kind] = now
  lastReactionAt.set(socketId, entry)
  return false
}

function sanitizeRoomFor(room: Room, playerId: string): ClientRoom {
  return {
    ...room,
    deckValues: DECKS[room.deck].values,
    participants: room.participants.map((p) => ({
      ...p,
      // Each player sees their own vote; others' votes hidden until revealed
      vote:
        room.status === 'revealed' || p.id === playerId
          ? p.vote
          : p.vote !== null
            ? HIDDEN_VOTE
            : null,
      hasVoted: p.vote !== null,
    })),
  }
}

function broadcastRoom(room: Room | null): void {
  if (!room) return
  for (const p of room.participants) {
    io.sockets.sockets.get(p.id)?.emit('room-state', sanitizeRoomFor(room, p.id))
  }
}

/** Runs a game action for the socket's current room and broadcasts the result. */
function handleRoomAction<T extends { room: Room } | { error: string }>(
  socket: PokerSocket,
  action: (roomId: string) => T,
): Extract<T, { room: Room }> | null {
  const roomId = socketRooms.get(socket.id)
  if (!roomId) return null
  const result = action(roomId)
  if ('error' in result) {
    socket.emit('error', { message: result.error })
    return null
  }
  broadcastRoom(result.room)
  return result as Extract<T, { room: Room }>
}

io.on('connection', (socket) => {
  socket.on('create-room', ({ name, facilitatorName, deck } = {}) => {
    const room = gm.createRoom({ name, facilitatorName, facilitatorId: socket.id, deck })
    socketRooms.set(socket.id, room.id)
    void socket.join(room.id)
    socket.emit('room-created', { roomId: room.id })
    broadcastRoom(room)
  })

  socket.on('join-room', ({ roomId, playerName } = {}) => {
    const id = roomId?.toUpperCase()
    if (!id) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    const result = gm.joinRoom({ roomId: id, playerName, playerId: socket.id })
    if ('error' in result) {
      socket.emit('error', { message: result.error })
      return
    }
    socketRooms.set(socket.id, id)
    void socket.join(id)
    broadcastRoom(result.room)
  })

  socket.on('cast-vote', ({ vote } = { vote: null }) => {
    handleRoomAction(socket, (roomId) => gm.castVote({ roomId, playerId: socket.id, vote }))
  })

  socket.on('reveal-votes', () => {
    handleRoomAction(socket, (roomId) => gm.revealVotes({ roomId, playerId: socket.id }))
  })

  socket.on('new-round', () => {
    handleRoomAction(socket, (roomId) => gm.newRound({ roomId, playerId: socket.id }))
  })

  socket.on('add-issue', ({ title } = {}) => {
    if (!title?.trim()) {
      socket.emit('error', { message: 'Issue title is required' })
      return
    }
    handleRoomAction(socket, (roomId) => gm.addIssue({ roomId, title }))
  })

  socket.on('select-issue', ({ issueId } = {}) => {
    if (!issueId) return
    handleRoomAction(socket, (roomId) => gm.selectIssue({ roomId, playerId: socket.id, issueId }))
  })

  socket.on('set-estimate', ({ issueId, estimate } = {}) => {
    if (!issueId) return
    handleRoomAction(socket, (roomId) =>
      gm.setEstimate({ roomId, playerId: socket.id, issueId, estimate: estimate ?? '' }),
    )
  })

  socket.on('change-deck', ({ deck } = {}) => {
    handleRoomAction(socket, (roomId) => gm.changeDeck({ roomId, playerId: socket.id, deck }))
  })

  socket.on('kick-participant', ({ targetId } = {}) => {
    if (!targetId) return
    const result = handleRoomAction(socket, (roomId) =>
      gm.kickParticipant({ roomId, playerId: socket.id, targetId }),
    )
    if (result) io.sockets.sockets.get(result.kickedId)?.emit('kicked')
  })

  socket.on('toggle-observer', () => {
    handleRoomAction(socket, (roomId) => gm.toggleObserver({ roomId, playerId: socket.id }))
  })

  // Transient reaction events: broadcast-only, never stored in room state.
  socket.on('throw-emoji', ({ targetId, emoji } = {}) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = gm.getRoom(roomId)
    if (!room) return
    const sender = room.participants.find((p) => p.id === socket.id)
    const target = room.participants.find((p) => p.id === targetId)
    if (!sender || !target || targetId === socket.id) return
    if (!isValidEmoji(emoji)) return
    if (isRateLimited(socket.id, 'emoji', 150)) return
    io.to(roomId).emit('emoji-thrown', {
      id: randomUUID(),
      fromId: socket.id,
      fromName: sender.name,
      targetId: target.id,
      emoji: emoji.trim(),
    })
  })

  socket.on('send-gif', ({ gif } = {}) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const room = gm.getRoom(roomId)
    if (!room) return
    const sender = room.participants.find((p) => p.id === socket.id)
    if (!sender) return
    if (!isValidGifId(gif)) return
    if (isRateLimited(socket.id, 'gif', 2000)) return
    io.to(roomId).emit('gif-reaction', {
      id: randomUUID(),
      fromId: socket.id,
      fromName: sender.name,
      gif,
    })
  })

  socket.on('disconnect', () => {
    lastReactionAt.delete(socket.id)
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    socketRooms.delete(socket.id)
    broadcastRoom(gm.leaveRoom(roomId, socket.id))
  })
})

const PORT = Number(process.env.PORT) || 3001
server.listen(PORT, () => console.log(`Planning Poker server running on port ${PORT}`))
