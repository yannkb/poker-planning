const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { nanoid } = require('nanoid')
const gm = require('./gameManager')
const { DECKS } = require('./decks')
const { isValidEmoji, isValidGifId } = require('./reactions')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Simple REST endpoint to check if a room exists before joining
app.get('/api/room/:roomId', (req, res) => {
  const room = gm.getRoom(req.params.roomId.toUpperCase())
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({ id: room.id, name: room.name, participantCount: room.participants.length })
})

app.get('/api/decks', (_req, res) => {
  res.json(gm.DECKS)
})

// Giphy search proxy: keeps the API key server-side. Without a key the
// client falls back to its curated reaction GIFs.
app.get('/api/gifs/search', async (req, res) => {
  const key = process.env.GIPHY_API_KEY
  if (!key) return res.status(503).json({ error: 'GIF search is not configured (set GIPHY_API_KEY)' })
  const q = String(req.query.q ?? '').trim().slice(0, 100)
  if (!q) return res.json({ gifs: [] })
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`
    const upstream = await fetch(url)
    if (!upstream.ok) return res.status(502).json({ error: 'GIF search failed' })
    const json = await upstream.json()
    const gifs = (json.data ?? []).map((g) => ({
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
const socketRooms = new Map()

// Per-socket rate limiting for transient reaction events
const lastReactionAt = new Map()

function isRateLimited(socketId, kind, minIntervalMs) {
  const now = Date.now()
  const entry = lastReactionAt.get(socketId) ?? {}
  if (now - (entry[kind] ?? 0) < minIntervalMs) return true
  entry[kind] = now
  lastReactionAt.set(socketId, entry)
  return false
}

function broadcastRoom(room) {
  if (!room) return
  room.participants.forEach((p) => {
    const sock = io.sockets.sockets.get(p.id)
    if (sock) sock.emit('room-state', sanitizeRoomFor(room, p.id))
  })
}

function sanitizeRoomFor(room, playerId) {
  return {
    ...room,
    deckValues: DECKS[room.deck]?.values ?? [],
    participants: room.participants.map((p) => ({
      ...p,
      // Each player sees their own vote; others' votes hidden until revealed
      vote: room.status === 'revealed' || p.id === playerId ? p.vote : p.vote !== null ? '🂠' : null,
      hasVoted: p.vote !== null,
    })),
  }
}

io.on('connection', (socket) => {
  socket.on('create-room', ({ name, facilitatorName, deck }) => {
    const room = gm.createRoom({ name, facilitatorName, facilitatorId: socket.id, deck })
    socketRooms.set(socket.id, room.id)
    socket.join(room.id)
    socket.emit('room-created', { roomId: room.id })
    broadcastRoom(room)
  })

  socket.on('join-room', ({ roomId, playerName }) => {
    const id = roomId?.toUpperCase()
    const result = gm.joinRoom({ roomId: id, playerName, playerId: socket.id })
    if (result.error) {
      socket.emit('error', { message: result.error })
      return
    }
    socketRooms.set(socket.id, id)
    socket.join(id)
    broadcastRoom(result.room)
  })

  socket.on('cast-vote', ({ vote }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.castVote({ roomId, playerId: socket.id, vote })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('reveal-votes', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.revealVotes({ roomId, playerId: socket.id })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('new-round', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.newRound({ roomId, playerId: socket.id })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('add-issue', ({ title }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    if (!title?.trim()) { socket.emit('error', { message: 'Issue title is required' }); return }
    const result = gm.addIssue({ roomId, playerId: socket.id, title })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('select-issue', ({ issueId }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.selectIssue({ roomId, playerId: socket.id, issueId })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('set-estimate', ({ issueId, estimate }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.setEstimate({ roomId, playerId: socket.id, issueId, estimate })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('change-deck', ({ deck }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.changeDeck({ roomId, playerId: socket.id, deck })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
  })

  socket.on('kick-participant', ({ targetId }) => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.kickParticipant({ roomId, playerId: socket.id, targetId })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    io.sockets.sockets.get(targetId)?.emit('kicked')
    broadcastRoom(result.room)
  })

  socket.on('toggle-observer', () => {
    const roomId = socketRooms.get(socket.id)
    if (!roomId) return
    const result = gm.toggleObserver({ roomId, playerId: socket.id })
    if (result.error) { socket.emit('error', { message: result.error }); return }
    broadcastRoom(result.room)
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
      id: nanoid(8),
      fromId: socket.id,
      fromName: sender.name,
      targetId,
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
      id: nanoid(8),
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
    const room = gm.leaveRoom(roomId, socket.id)
    broadcastRoom(room)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Planning Poker server running on port ${PORT}`))
