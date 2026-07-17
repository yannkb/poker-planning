import { describe, it, expect } from 'vitest'
import { MAX_NAME_LENGTH } from 'planning-poker-shared'
import { createRoom, joinRoom, renameParticipant } from './gameManager'

function setupRoom() {
  const room = createRoom({ facilitatorName: 'Alice', facilitatorId: 'host' })
  joinRoom({ roomId: room.id, playerName: 'Bob', playerId: 'bob' })
  return room
}

describe('renameParticipant', () => {
  it('renames a participant already in the room', () => {
    const room = setupRoom()
    const result = renameParticipant({ roomId: room.id, playerId: 'bob', name: 'Bobby' })
    expect('room' in result).toBe(true)
    expect(room.participants.find((p) => p.id === 'bob')?.name).toBe('Bobby')
  })

  it('trims surrounding whitespace', () => {
    const room = setupRoom()
    renameParticipant({ roomId: room.id, playerId: 'host', name: '  Alicia  ' })
    expect(room.participants.find((p) => p.id === 'host')?.name).toBe('Alicia')
  })

  it('truncates names longer than the limit', () => {
    const room = setupRoom()
    renameParticipant({ roomId: room.id, playerId: 'bob', name: 'x'.repeat(100) })
    expect(room.participants.find((p) => p.id === 'bob')?.name).toHaveLength(MAX_NAME_LENGTH)
  })

  it('rejects an empty or whitespace-only name', () => {
    const room = setupRoom()
    expect(renameParticipant({ roomId: room.id, playerId: 'bob', name: '   ' })).toEqual({
      error: 'Name is required',
    })
    expect(renameParticipant({ roomId: room.id, playerId: 'bob' })).toEqual({
      error: 'Name is required',
    })
    // Original name is preserved on rejection
    expect(room.participants.find((p) => p.id === 'bob')?.name).toBe('Bob')
  })

  it('errors when the room does not exist', () => {
    expect(renameParticipant({ roomId: 'NOPE12', playerId: 'bob', name: 'Bob' })).toEqual({
      error: 'Room not found',
    })
  })

  it('errors when the participant is not in the room', () => {
    const room = setupRoom()
    expect(renameParticipant({ roomId: room.id, playerId: 'ghost', name: 'Casper' })).toEqual({
      error: 'Participant not found',
    })
  })
})
