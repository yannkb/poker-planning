import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ClientRoom, ClientToServerEvents, ServerToClientEvents } from 'planning-poker-shared'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || ''

type PokerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket() {
  const socketRef = useRef<PokerSocket | null>(null)
  const [room, setRoom] = useState<ClientRoom | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kicked, setKicked] = useState(false)

  useEffect(() => {
    const socket: PokerSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setMyId(socket.id ?? null))
    socket.on('room-state', (r) => setRoom(r))
    socket.on('error', ({ message }) => setError(message))
    socket.on('kicked', () => {
      setRoom(null)
      setKicked(true)
    })
    socket.on('disconnect', () => setMyId(null))

    return () => {
      socket.disconnect()
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      setError(null)
      socketRef.current?.emit(event, ...args)
    },
    [],
  )

  const createRoom = useCallback(
    (name: string, facilitatorName: string, deck: string) =>
      new Promise<string>((resolve) => {
        socketRef.current?.once('room-created', ({ roomId }) => resolve(roomId))
        emit('create-room', { name, facilitatorName, deck })
      }),
    [emit],
  )

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => emit('join-room', { roomId, playerName }),
    [emit],
  )

  const rename = useCallback((name: string) => emit('rename', { name }), [emit])
  const castVote = useCallback((vote: string | null) => emit('cast-vote', { vote }), [emit])
  const revealVotes = useCallback(() => emit('reveal-votes'), [emit])
  const newRound = useCallback(() => emit('new-round'), [emit])
  const addIssue = useCallback((title: string) => emit('add-issue', { title }), [emit])
  const selectIssue = useCallback((issueId: string) => emit('select-issue', { issueId }), [emit])
  const setEstimate = useCallback(
    (issueId: string, estimate: string) => emit('set-estimate', { issueId, estimate }),
    [emit],
  )
  const changeDeck = useCallback((deck: string) => emit('change-deck', { deck }), [emit])
  const kickParticipant = useCallback(
    (targetId: string) => emit('kick-participant', { targetId }),
    [emit],
  )
  const toggleObserver = useCallback(() => emit('toggle-observer'), [emit])
  const throwEmoji = useCallback(
    (targetId: string, emoji: string) => emit('throw-emoji', { targetId, emoji }),
    [emit],
  )
  const sendGif = useCallback((gif: string) => emit('send-gif', { gif }), [emit])

  // Subscribe to transient broadcast events (emoji throws, GIF reactions)
  // that are animated client-side and never part of room state.
  const subscribe = useCallback(
    <E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) => {
      const socket = socketRef.current
      if (!socket) return () => {}
      // The public signature is fully typed; socket.io's internal conditional
      // listener type does not narrow over a generic key, hence the cast.
      socket.on(event, handler as never)
      return () => {
        socket.off(event, handler as never)
      }
    },
    [],
  )

  const me = room?.participants.find((p) => p.id === myId)
  const isFacilitator = me?.isFacilitator ?? false

  return {
    room, myId, me, isFacilitator, error, kicked,
    clearError, setKicked,
    createRoom, joinRoom, rename,
    castVote, revealVotes, newRound,
    addIssue, selectIssue, setEstimate, changeDeck,
    kickParticipant, toggleObserver,
    throwEmoji, sendGif, subscribe,
  }
}

export type SocketApi = ReturnType<typeof useSocket>
export type SubscribeFn = SocketApi['subscribe']
