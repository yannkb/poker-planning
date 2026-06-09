import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || ''

export function useSocket() {
  const socketRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [myId, setMyId] = useState(null)
  const [error, setError] = useState(null)
  const [kicked, setKicked] = useState(false)

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setMyId(socket.id))
    socket.on('room-state', (r) => setRoom(r))
    socket.on('error', ({ message }) => setError(message))
    socket.on('kicked', () => { setRoom(null); setKicked(true) })
    socket.on('disconnect', () => setMyId(null))

    return () => socket.disconnect()
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const emit = useCallback((event, data) => {
    setError(null)
    socketRef.current?.emit(event, data)
  }, [])

  const createRoom = useCallback((name, facilitatorName, deck) =>
    new Promise((resolve) => {
      socketRef.current?.once('room-created', ({ roomId }) => resolve(roomId))
      emit('create-room', { name, facilitatorName, deck })
    }), [emit])

  const joinRoom = useCallback((roomId, playerName) =>
    emit('join-room', { roomId, playerName }), [emit])

  const castVote = useCallback((vote) => emit('cast-vote', { vote }), [emit])
  const revealVotes = useCallback(() => emit('reveal-votes'), [emit])
  const newRound = useCallback(() => emit('new-round'), [emit])
  const addIssue = useCallback((title) => emit('add-issue', { title }), [emit])
  const selectIssue = useCallback((issueId) => emit('select-issue', { issueId }), [emit])
  const setEstimate = useCallback((issueId, estimate) => emit('set-estimate', { issueId, estimate }), [emit])
  const changeDeck = useCallback((deck) => emit('change-deck', { deck }), [emit])
  const kickParticipant = useCallback((targetId) => emit('kick-participant', { targetId }), [emit])
  const toggleObserver = useCallback(() => emit('toggle-observer'), [emit])
  const throwEmoji = useCallback((targetId, emoji) => emit('throw-emoji', { targetId, emoji }), [emit])
  const sendGif = useCallback((gif) => emit('send-gif', { gif }), [emit])

  // Subscribe to transient broadcast events (emoji throws, GIF reactions)
  // that are animated client-side and never part of room state.
  const subscribe = useCallback((event, handler) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on(event, handler)
    return () => socket.off(event, handler)
  }, [])

  const me = room?.participants?.find((p) => p.id === myId)
  const isFacilitator = me?.isFacilitator ?? false

  return {
    room, myId, me, isFacilitator, error, kicked,
    clearError, setKicked,
    createRoom, joinRoom,
    castVote, revealVotes, newRound,
    addIssue, selectIssue, setEstimate, changeDeck,
    kickParticipant, toggleObserver,
    throwEmoji, sendGif, subscribe,
  }
}
