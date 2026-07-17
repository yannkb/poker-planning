import { useEffect, useRef, useState } from 'react'
import {
  DECKS,
  DECK_KEYS,
  MAX_NAME_LENGTH,
  type ClientParticipant,
  type ClientRoom,
} from 'planning-poker-shared'
import VotingCard from './VotingCard'
import PokerTable from './PokerTable'
import ReactionBar from './ReactionBar'
import ResultsDisplay from './ResultsDisplay'
import IssueQueue from './IssueQueue'
import LangSwitcher from './LangSwitcher'
import TruncatedText from './TruncatedText'
import { useI18n } from '../lib/i18n'
import type { SubscribeFn } from '../hooks/useSocket'

interface GameBoardProps {
  room: ClientRoom
  myId: string | null
  me: ClientParticipant | undefined
  isFacilitator: boolean
  onCastVote: (vote: string | null) => void
  onReveal: () => void
  onNewRound: () => void
  onAddIssue: (title: string) => void
  onSelectIssue: (issueId: string) => void
  onSetEstimate: (issueId: string, estimate: string) => void
  onChangeDeck: (deck: string) => void
  onKick: (targetId: string) => void
  onToggleObserver: () => void
  onRename: (name: string) => void
  onThrowEmoji: (targetId: string, emoji: string) => void
  onSendGif: (gif: string) => void
  subscribe: SubscribeFn
}

export default function GameBoard({
  room, myId, me, isFacilitator,
  onCastVote, onReveal, onNewRound,
  onAddIssue, onSelectIssue, onSetEstimate,
  onChangeDeck, onKick, onToggleObserver, onRename,
  onThrowEmoji, onSendGif, subscribe,
}: GameBoardProps) {
  const { t } = useI18n()
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const [renaming, setRenaming] = useState(false)

  const deckValues = room.deckValues
  const isRevealed = room.status === 'revealed'
  const isVoting = room.status === 'voting'

  const currentIssue = room.issues.find((i) => i.id === room.currentIssueId) ?? null
  const votedCount = room.participants.filter((p) => !p.isObserver && p.hasVoted).length
  const voterCount = room.participants.filter((p) => !p.isObserver).length

  // Power-user keyboard shortcuts: number keys cast the matching card, and the
  // facilitator can reveal / start a round without reaching for the mouse.
  // Ignored while typing in a field or when a rename dialog is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing || renaming) return

      if (isVoting && !me?.isObserver) {
        // "1".."9" then "0" map to the first ten cards.
        const idx = e.key === '0' ? 9 : /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1
        if (idx >= 0 && idx < deckValues.length) {
          e.preventDefault()
          const value = deckValues[idx]
          onCastVote(me?.vote === value ? null : (value ?? null))
          return
        }
      }
      if (isFacilitator) {
        if (isVoting && (e.key === 'r' || e.key === 'R') && votedCount > 0) {
          e.preventDefault()
          onReveal()
        } else if (isRevealed && (e.key === 'n' || e.key === 'N')) {
          e.preventDefault()
          onNewRound()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    renaming, isVoting, isRevealed, isFacilitator, me?.isObserver, me?.vote,
    deckValues, votedCount, onCastVote, onReveal, onNewRound,
  ])

  function copyCode() {
    const url = `${window.location.origin}?join=${room.id}`
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    // clipboard API is unavailable on insecure origins; fall back gracefully.
    if (!navigator.clipboard) {
      window.prompt(t('copyInviteLink'), url)
      return
    }
    navigator.clipboard.writeText(url).then(done, () => {
      window.prompt(t('copyInviteLink'), url)
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-4 bg-slate-900/80 backdrop-blur">
        <div className="text-2xl">🃏</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-100">
            <TruncatedText text={room.name} className="block" />
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{t('room')}</span>
            <button
              onClick={copyCode}
              className="text-xs font-mono font-bold text-brand-300 hover:text-brand-200 transition-colors tracking-widest"
              title={t('copyInviteLink')}
              aria-label={t('copyInviteLink')}
            >
              {room.id}
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline" aria-live="polite">
              {copied ? t('copied') : t('clickToCopy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Identity: click to rename yourself without leaving the room */}
          <button
            onClick={() => setRenaming(true)}
            title={t('editName')}
            aria-label={t('editName')}
            className="flex items-center gap-1.5 max-w-[8rem] sm:max-w-[12rem] text-xs px-2 py-1 rounded-full border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors"
          >
            <span className="truncate">{me?.name ?? '—'}</span>
            <span aria-hidden="true" className="opacity-60">✎</span>
          </button>

          <LangSwitcher />

          {/* Deck badge */}
          <span className="hidden sm:inline text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-full">
            {DECKS[room.deck].emoji} {t(`deck_${room.deck}`)}
          </span>

          {/* Observer toggle */}
          <button
            onClick={onToggleObserver}
            title={me?.isObserver ? t('voterTitle') : t('observerTitle')}
            aria-label={me?.isObserver ? t('voterTitle') : t('observerTitle')}
            aria-pressed={me?.isObserver ?? false}
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
              aria-label={t('settingsTitle')}
              aria-haspopup="true"
              aria-expanded={showSettings}
            >
              <span aria-hidden="true">⚙</span>
            </button>
          )}
        </div>
      </header>

      {/* Settings drawer */}
      {showSettings && isFacilitator && (
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-slate-400">{t('changeDeck')}</span>
          {DECK_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                onChangeDeck(key)
                setShowSettings(false)
              }}
              className={[
                'text-sm px-3 py-1 rounded-lg border transition-colors',
                room.deck === key
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
              ].join(' ')}
            >
              {DECKS[key].emoji} {t(`deck_${key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:overflow-hidden">

        {/* Left: table scene */}
        <main className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto">
          <div className="flex-1 relative px-4 pt-6 min-h-[24rem]">
            <PokerTable
              participants={room.participants}
              myId={myId}
              isVoting={isVoting}
              isRevealed={isRevealed}
              isFacilitator={isFacilitator}
              currentIssue={currentIssue}
              hasIssues={room.issues.length > 0}
              deckValues={deckValues}
              votedCount={votedCount}
              voterCount={voterCount}
              roundSeed={room.rounds.length}
              onReveal={onReveal}
              onNewRound={onNewRound}
              onKick={onKick}
              onThrowEmoji={onThrowEmoji}
              subscribe={subscribe}
            />
          </div>

          {/* Bottom dock: results / deck / reactions */}
          <div className="px-4 pb-4 pt-3 flex flex-col items-center gap-3">
            {isRevealed && (
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-bounce-in">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">{t('results')}</h3>
                <ResultsDisplay
                  participants={room.participants}
                  deckValues={deckValues}
                  currentIssue={currentIssue}
                  isFacilitator={isFacilitator}
                  onSetEstimate={onSetEstimate}
                />
              </div>
            )}

            {!me?.isObserver && isVoting && (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {deckValues.map((value, i) => (
                  <VotingCard
                    key={value}
                    value={value}
                    selected={me?.vote === value}
                    shortcut={i < 9 ? String(i + 1) : i === 9 ? '0' : undefined}
                    onClick={() => onCastVote(me?.vote === value ? null : value)}
                  />
                ))}
              </div>
            )}

            {me?.isObserver && isVoting && (
              <div className="text-center text-slate-500 py-2">{t('observingNote')}</div>
            )}

            <ReactionBar onSendGif={onSendGif} />
          </div>
        </main>

        {/* Right sidebar: issues */}
        <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto">
            <IssueQueue
              issues={room.issues}
              currentIssueId={room.currentIssueId}
              isFacilitator={isFacilitator}
              onAddIssue={onAddIssue}
              onSelectIssue={onSelectIssue}
              onSetEstimate={onSetEstimate}
            />
          </div>
        </aside>
      </div>

      {renaming && (
        <RenameDialog
          currentName={me?.name ?? ''}
          onSubmit={(name) => {
            onRename(name)
            setRenaming(false)
          }}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  )
}

interface RenameDialogProps {
  currentName: string
  onSubmit: (name: string) => void
  onClose: () => void
}

function RenameDialog({ currentName, onSubmit, onClose }: RenameDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.select()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const trimmed = name.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t('renameTitle')}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-200">{t('renameTitle')}</h2>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          aria-label={t('renameTitle')}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  )
}
