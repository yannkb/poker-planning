import { useEffect, useState } from 'react'
import VotingCard from './VotingCard.jsx'
import PokerTable from './PokerTable.jsx'
import ReactionBar from './ReactionBar.jsx'
import ResultsDisplay from './ResultsDisplay.jsx'
import IssueQueue from './IssueQueue.jsx'
import LangSwitcher from './LangSwitcher.jsx'
import { DECK_META } from '../lib/decks.js'
import { useI18n } from '../lib/i18n.jsx'

const GIF_BUBBLE_MS = 5000

export default function GameBoard({
  room, myId, me, isFacilitator,
  onCastVote, onReveal, onNewRound,
  onAddIssue, onSelectIssue, onSetEstimate,
  onChangeDeck, onKick, onToggleObserver,
  onThrowEmoji, onSendGif, subscribe,
}) {
  const { t } = useI18n()
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  // Transient reaction state (never part of room state)
  const [flyingEmojis, setFlyingEmojis] = useState([])
  const [gifBubbles, setGifBubbles] = useState({})

  const deckValues = room.deckValues ?? []
  const isRevealed = room.status === 'revealed'
  const isVoting = room.status === 'voting'

  const currentIssue = room.issues?.find((i) => i.id === room.currentIssueId) ?? null
  const votedCount = room.participants.filter((p) => !p.isObserver && p.hasVoted).length
  const voterCount = room.participants.filter((p) => !p.isObserver).length

  useEffect(() => {
    const offEmoji = subscribe('emoji-thrown', (event) => {
      setFlyingEmojis((prev) => [...prev.slice(-19), event])
    })
    const offGif = subscribe('gif-reaction', (event) => {
      setGifBubbles((prev) => ({ ...prev, [event.fromId]: event }))
      setTimeout(() => {
        setGifBubbles((prev) => {
          if (prev[event.fromId]?.id !== event.id) return prev
          const { [event.fromId]: _gone, ...rest } = prev
          return rest
        })
      }, GIF_BUBBLE_MS)
    })
    return () => {
      offEmoji()
      offGif()
    }
  }, [subscribe])

  function copyCode() {
    const url = `${window.location.origin}?join=${room.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center gap-4 bg-slate-900/80 backdrop-blur">
        <div className="text-2xl">🃏</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-100 truncate">{room.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{t('room')}</span>
            <button
              onClick={copyCode}
              className="text-xs font-mono font-bold text-brand-300 hover:text-brand-200 transition-colors tracking-widest"
              title={t('copyInviteLink')}
            >
              {room.id}
            </button>
            <span className="text-xs text-slate-500">{copied ? t('copied') : t('clickToCopy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LangSwitcher />

          {/* Deck badge */}
          <span className="hidden sm:inline text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-full">
            {DECK_META[room.deck]?.emoji ?? ''} {t(`deck_${room.deck}`)}
          </span>

          {/* Observer toggle */}
          <button
            onClick={onToggleObserver}
            title={me?.isObserver ? t('voterTitle') : t('observerTitle')}
            className={[
              'text-xs px-2 py-1 rounded-full border transition-colors',
              me?.isObserver
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-600',
            ].join(' ')}
          >
            {me?.isObserver ? t('observerBadge') : t('voterBadge')}
          </button>

          {/* Settings (facilitator) */}
          {isFacilitator && (
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title={t('settingsTitle')}
            >
              ⚙
            </button>
          )}
        </div>
      </header>

      {/* Settings drawer */}
      {showSettings && isFacilitator && (
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-slate-400">{t('changeDeck')}</span>
          {Object.entries(DECK_META).map(([key, { emoji }]) => (
            <button
              key={key}
              onClick={() => { onChangeDeck(key); setShowSettings(false) }}
              className={[
                'text-sm px-3 py-1 rounded-lg border transition-colors',
                room.deck === key
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
              ].join(' ')}
            >
              {emoji} {t(`deck_${key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Left: table scene */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex-1 relative px-4 pt-6 min-h-[24rem]">
            <PokerTable
              participants={room.participants}
              myId={myId}
              isVoting={isVoting}
              isRevealed={isRevealed}
              isFacilitator={isFacilitator}
              currentIssue={currentIssue}
              hasIssues={Boolean(room.issues?.length)}
              votedCount={votedCount}
              voterCount={voterCount}
              onReveal={onReveal}
              onNewRound={onNewRound}
              onKick={onKick}
              onThrowEmoji={onThrowEmoji}
              roundSeed={room.rounds?.length ?? 0}
              flyingEmojis={flyingEmojis}
              onEmojiDone={(id) => setFlyingEmojis((prev) => prev.filter((f) => f.id !== id))}
              gifBubbles={gifBubbles}
            />
          </div>

          {/* Bottom dock: results / deck / reactions */}
          <div className="px-4 pb-4 pt-3 flex flex-col items-center gap-3">
            {isRevealed && (
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-bounce-in">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">{t('results')}</h3>
                <ResultsDisplay participants={room.participants} deckValues={deckValues} />
              </div>
            )}

            {!me?.isObserver && isVoting && (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {deckValues.map((v) => (
                  <VotingCard
                    key={v}
                    value={v}
                    selected={me?.vote === v}
                    onClick={() => onCastVote(me?.vote === v ? null : v)}
                  />
                ))}
              </div>
            )}

            {me?.isObserver && isVoting && (
              <div className="text-center text-slate-500 py-2">
                {t('observingNote')}
              </div>
            )}

            <ReactionBar onSendGif={onSendGif} />
          </div>
        </main>

        {/* Right sidebar: issues */}
        <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            <IssueQueue
              issues={room.issues ?? []}
              currentIssueId={room.currentIssueId}
              isFacilitator={isFacilitator}
              onAddIssue={onAddIssue}
              onSelectIssue={onSelectIssue}
              onSetEstimate={onSetEstimate}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
