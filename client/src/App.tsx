import { useEffect, useState } from 'react'
import { useSocket } from './hooks/useSocket'
import { useI18n } from './lib/i18n'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'

export default function App() {
  const { t } = useI18n()
  const socket = useSocket()
  const [view, setView] = useState<'lobby' | 'game'>('lobby')

  const pendingJoinCode = (() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('join')?.toUpperCase() ?? null
  })()

  // When room state arrives, switch to game view
  useEffect(() => {
    if (socket.room) setView('game')
  }, [socket.room])

  // When kicked, go back to lobby
  useEffect(() => {
    if (socket.kicked) {
      setView('lobby')
      socket.setKicked(false)
    }
  }, [socket.kicked]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateRoom(name: string, facilitatorName: string, deck: string) {
    await socket.createRoom(name, facilitatorName, deck)
    // room state arrives via socket → view switches automatically
  }

  function handleJoinRoom(roomId: string, playerName: string) {
    socket.joinRoom(roomId, playerName)
    // room state arrives via socket → view switches automatically
  }

  if (view === 'game' && socket.room) {
    return (
      <>
        {socket.error && (
          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 px-5 py-3 rounded-xl shadow-xl text-sm cursor-pointer"
            onClick={socket.clearError}
          >
            ⚠ {socket.error} <span className="ml-2 opacity-60">✕</span>
          </div>
        )}
        <GameBoard
          room={socket.room}
          myId={socket.myId}
          me={socket.me}
          isFacilitator={socket.isFacilitator}
          onCastVote={socket.castVote}
          onReveal={socket.revealVotes}
          onNewRound={socket.newRound}
          onAddIssue={socket.addIssue}
          onSelectIssue={socket.selectIssue}
          onSetEstimate={socket.setEstimate}
          onChangeDeck={socket.changeDeck}
          onKick={socket.kickParticipant}
          onToggleObserver={socket.toggleObserver}
          onThrowEmoji={socket.throwEmoji}
          onSendGif={socket.sendGif}
          subscribe={socket.subscribe}
        />
      </>
    )
  }

  return (
    <>
      {socket.kicked && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 px-5 py-3 rounded-xl shadow-xl text-sm">
          {t('kicked')}
        </div>
      )}
      <Lobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={socket.error}
        clearError={socket.clearError}
        defaultJoinCode={pendingJoinCode}
      />
    </>
  )
}
