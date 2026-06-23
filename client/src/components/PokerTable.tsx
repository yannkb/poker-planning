import {
  lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import {
  HIDDEN_VOTE,
  summarizeVotes,
  nearestDeckValue,
  type ClientParticipant,
  type EmojiThrownEvent,
  type GifReactionEvent,
  type Issue,
  type VoteSummary,
} from 'planning-poker-shared'
import { gifUrl, THROWABLE_EMOJIS } from '../lib/reactions'
import { MEME_QUOTES, RESULT_QUIPS, pickFrom, useI18n, type QuipCategory } from '../lib/i18n'

const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'))

// Seats are placed on an ellipse; "me" always sits at the bottom center.
const ELLIPSE_RX = 42
const ELLIPSE_RY = 38

const RECENT_EMOJI_KEY = 'pp-recent-emojis'
const MAX_RECENT_EMOJIS = 3

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function avatarColor(name: string): string {
  let hue = 0
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360
  return `hsl(${hue} 55% 42%)`
}

function loadRecentEmojis(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) ?? '[]')
    return Array.isArray(stored)
      ? stored.filter((e): e is string => typeof e === 'string').slice(0, MAX_RECENT_EMOJIS)
      : []
  } catch {
    return []
  }
}

interface SeatPosition {
  style: CSSProperties | undefined
  popoverBelow: boolean
}

interface PokerTableProps {
  participants: ClientParticipant[]
  myId: string | null
  isVoting: boolean
  isRevealed: boolean
  isFacilitator: boolean
  currentIssue: Issue | null
  hasIssues: boolean
  deckValues: readonly string[]
  votedCount: number
  voterCount: number
  roundSeed: number
  onReveal: () => void
  onNewRound: () => void
  onKick: (targetId: string) => void
  onThrowEmoji: (targetId: string, emoji: string) => void
  flyingEmojis: EmojiThrownEvent[]
  onEmojiDone: (id: string) => void
  gifBubbles: Record<string, GifReactionEvent>
}

export default function PokerTable({
  participants, myId, isVoting, isRevealed, isFacilitator,
  currentIssue, votedCount, voterCount, hasIssues, deckValues, roundSeed,
  onReveal, onNewRound, onKick,
  onThrowEmoji,
  flyingEmojis, onEmojiDone,
  gifBubbles,
}: PokerTableProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const seatRefs = useRef(new Map<string, HTMLDivElement>())
  const [hitSeats, setHitSeats] = useState<ReadonlySet<string>>(() => new Set())
  // Clicking a teammate's seat opens an emoji flyout above them
  const [flyoutTargetId, setFlyoutTargetId] = useState<string | null>(null)
  const [fullPickerTargetId, setFullPickerTargetId] = useState<string | null>(null)
  // Emojis picked from the full picker replace the tail of the quick row
  const [recentEmojis, setRecentEmojis] = useState<string[]>(loadRecentEmojis)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!flyoutTargetId && !fullPickerTargetId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFlyoutTargetId(null)
        setFullPickerTargetId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flyoutTargetId, fullPickerTargetId])

  const quickEmojis = useMemo(
    () => [
      ...THROWABLE_EMOJIS.slice(0, THROWABLE_EMOJIS.length - recentEmojis.length),
      ...[...recentEmojis].reverse(),
    ],
    [recentEmojis],
  )

  function addRecentEmoji(emoji: string) {
    if (THROWABLE_EMOJIS.includes(emoji)) return
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENT_EMOJIS)
      try {
        localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next))
      } catch {
        // localStorage unavailable (private mode) — recents just won't persist
      }
      return next
    })
  }

  // Rotate so I'm first (bottom center seat)
  const ordered = useMemo(() => {
    const idx = participants.findIndex((p) => p.id === myId)
    if (idx <= 0) return participants
    return [...participants.slice(idx), ...participants.slice(0, idx)]
  }, [participants, myId])

  const registerSeat = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) seatRefs.current.set(id, el)
    else seatRefs.current.delete(id)
  }, [])

  const getSeatCenter = useCallback((participantId: string): { x: number; y: number } | null => {
    const el = seatRefs.current.get(participantId)
    const container = containerRef.current
    if (!el || !container) return null
    const seatRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return {
      x: seatRect.left + seatRect.width / 2 - containerRect.left,
      y: seatRect.top + seatRect.height / 2 - containerRect.top,
    }
  }, [])

  const markHit = useCallback((participantId: string) => {
    setHitSeats((prev) => new Set(prev).add(participantId))
    setTimeout(() => {
      setHitSeats((prev) => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
    }, 600)
  }, [])

  // Deliberately keeps the flyout/picker open so you can spam-throw;
  // outside click, Escape, or re-clicking the seat closes it.
  const seats = ordered.map((p, i) => {
    const { style, popoverBelow } = seatPosition(i, ordered.length, isDesktop)
    return (
      <Seat
        key={p.id}
        p={p}
        isMe={p.id === myId}
        isRevealed={isRevealed}
        isFacilitator={isFacilitator}
        onKick={onKick}
        flyoutOpen={flyoutTargetId === p.id}
        onToggleFlyout={() => {
          setFullPickerTargetId(null)
          setFlyoutTargetId((current) => (current === p.id ? null : p.id))
        }}
        onPickEmoji={(emoji) => onThrowEmoji(p.id, emoji)}
        onMoreEmojis={() => {
          setFlyoutTargetId(null)
          setFullPickerTargetId(p.id)
        }}
        quickEmojis={quickEmojis}
        hit={hitSeats.has(p.id)}
        gif={gifBubbles[p.id]}
        popoverBelow={popoverBelow}
        refCb={(el) => registerSeat(p.id, el)}
        style={style}
        floating={isDesktop}
      />
    )
  })

  const center = (
    <TableCenter
      currentIssue={currentIssue}
      hasIssues={hasIssues}
      deckValues={deckValues}
      roundSeed={roundSeed}
      isVoting={isVoting}
      isRevealed={isRevealed}
      isFacilitator={isFacilitator}
      votedCount={votedCount}
      voterCount={voterCount}
      participants={participants}
      onReveal={onReveal}
      onNewRound={onNewRound}
    />
  )

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {isDesktop ? (
        <div className="relative w-full h-full min-h-[26rem] max-w-4xl mx-auto">
          {/* Table felt */}
          <div className="absolute left-[14%] right-[14%] top-[20%] bottom-[20%] rounded-[50%] bg-gradient-to-br from-emerald-900/70 to-slate-900 border-8 border-slate-800 shadow-[inset_0_0_60px_rgba(0,0,0,0.6),0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-3 rounded-[50%] border border-emerald-500/15" />
            <div className="absolute inset-0 flex items-center justify-center p-8">{center}</div>
          </div>
          {seats}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-emerald-900/70 to-slate-900 border-4 border-slate-800 px-4 py-5 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
            {center}
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 px-2">{seats}</div>
        </div>
      )}

      {/* Flying emoji overlay */}
      {flyingEmojis.map((item) => (
        <FlyingEmoji
          key={item.id}
          item={item}
          getSeatCenter={getSeatCenter}
          onDone={onEmojiDone}
          onImpact={markHit}
        />
      ))}

      {/* Full emoji picker for "more emojis" on a target */}
      {fullPickerTargetId && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-3xl"
          onClick={() => setFullPickerTargetId(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Suspense
              fallback={
                <div className="bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-sm text-slate-400 shadow-2xl">
                  {t('loadingEmojis')}
                </div>
              }
            >
              <EmojiPickerPanel
                onSelect={(emoji) => {
                  onThrowEmoji(fullPickerTargetId, emoji)
                  addRecentEmoji(emoji)
                  // Close the big picker but reopen the quick flyout for spamming
                  setFlyoutTargetId(fullPickerTargetId)
                  setFullPickerTargetId(null)
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}

function seatPosition(index: number, count: number, isDesktop: boolean): SeatPosition {
  if (!isDesktop) return { style: undefined, popoverBelow: false }
  const angle = Math.PI / 2 + (index / count) * Math.PI * 2
  const topPct = 50 + ELLIPSE_RY * Math.sin(angle)
  return {
    style: {
      left: `${50 + ELLIPSE_RX * Math.cos(angle)}%`,
      top: `${topPct}%`,
    },
    // Popovers on top-half seats would clip under the header — open them downward
    popoverBelow: topPct < 50,
  }
}

function pickQuipCategory({ consensus, numeric, average, counts }: VoteSummary, votes: string[]): QuipCategory {
  if (consensus) return 'consensus'
  if (votes.length > 0 && votes.every((v) => v === '☕')) return 'coffee'
  if (counts['?']) return 'mystery'
  if (numeric.length > 1) {
    const min = Math.min(...numeric)
    const max = Math.max(...numeric)
    if (min === 0 ? max >= 8 : max / min >= 4) return 'bigSpread'
  }
  if (average !== null && average >= 21) return 'high'
  if (average !== null && average <= 3) return 'low'
  return 'default'
}

interface TableCenterProps {
  currentIssue: Issue | null
  hasIssues: boolean
  deckValues: readonly string[]
  roundSeed: number
  isVoting: boolean
  isRevealed: boolean
  isFacilitator: boolean
  votedCount: number
  voterCount: number
  participants: ClientParticipant[]
  onReveal: () => void
  onNewRound: () => void
}

function TableCenter({
  currentIssue, hasIssues, isVoting, isRevealed, isFacilitator,
  votedCount, voterCount, participants, deckValues, roundSeed, onReveal, onNewRound,
}: TableCenterProps) {
  const { t, lang } = useI18n()
  const votes = participants
    .filter((p) => !p.isObserver && p.vote !== null && p.vote !== HIDDEN_VOTE)
    .map((p) => p.vote as string)
  const summary = summarizeVotes(votes)
  // Snap the raw average onto a real card so estimates stay on the scale.
  const suggested = summary.average !== null ? nearestDeckValue(summary.average, deckValues) : null

  const memeQuote = pickFrom(MEME_QUOTES[lang], roundSeed)
  const resultQuip = isRevealed
    ? pickFrom(RESULT_QUIPS[lang][pickQuipCategory(summary, votes)], roundSeed)
    : null

  return (
    <div className="text-center max-w-[16rem]">
      {currentIssue ? (
        <>
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/60 mb-0.5">{t('estimating')}</p>
          <h2 className="text-base font-semibold text-slate-100 line-clamp-2">{currentIssue.title}</h2>
        </>
      ) : (
        <h2 className="text-base font-semibold text-slate-300">
          {hasIssues ? t('selectIssue') : isRevealed ? t('roundComplete') : t('readyToVote')}
        </h2>
      )}

      {isVoting && (
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-300">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-slow" />
          {t('votedCount', { voted: votedCount, total: voterCount })}
        </div>
      )}

      {isVoting && <p className="text-xs italic text-emerald-200/50 mt-2">{memeQuote}</p>}

      {isRevealed && (
        <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
          {suggested !== null && (
            <span className="text-2xl font-bold text-brand-300">
              {suggested}
              {summary.average !== null && String(summary.average) !== suggested && (
                <span className="text-xs font-normal text-slate-400"> {t('avgValue', { value: summary.average })}</span>
              )}
            </span>
          )}
          {summary.consensus && (
            <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {t('consensus')}
            </span>
          )}
        </div>
      )}

      {isRevealed && resultQuip && (
        <p className="text-xs italic text-emerald-200/60 mt-2 animate-bounce-in">{resultQuip}</p>
      )}

      {isFacilitator && isVoting && (
        <button
          onClick={onReveal}
          disabled={votedCount === 0}
          className="mt-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 text-white text-sm font-semibold px-6 py-2 rounded-xl transition-colors shadow-lg shadow-brand-900/40"
        >
          {t('revealVotes')}
        </button>
      )}
      {isFacilitator && isRevealed && (
        <button
          onClick={onNewRound}
          className="mt-3 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold px-6 py-2 rounded-xl transition-colors"
        >
          {t('newRound')}
        </button>
      )}
      {!isFacilitator && isVoting && <p className="text-xs text-slate-500 mt-2">{t('waitingHost')}</p>}
    </div>
  )
}

interface SeatProps {
  p: ClientParticipant
  isMe: boolean
  isRevealed: boolean
  isFacilitator: boolean
  onKick: (targetId: string) => void
  flyoutOpen: boolean
  onToggleFlyout: () => void
  onPickEmoji: (emoji: string) => void
  onMoreEmojis: () => void
  quickEmojis: string[]
  hit: boolean
  gif: GifReactionEvent | undefined
  popoverBelow: boolean
  refCb: (el: HTMLDivElement | null) => void
  style: CSSProperties | undefined
  floating: boolean
}

function Seat({
  p, isMe, isRevealed, isFacilitator, onKick,
  flyoutOpen, onToggleFlyout, onPickEmoji, onMoreEmojis, quickEmojis,
  hit, gif, popoverBelow, refCb, style, floating,
}: SeatProps) {
  const { t } = useI18n()
  const showVote = isRevealed && p.vote !== null && p.vote !== HIDDEN_VOTE
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Close the flyout when clicking anywhere outside this seat
  useEffect(() => {
    if (!flyoutOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onToggleFlyout()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [flyoutOpen, onToggleFlyout])

  return (
    <div
      ref={(el) => {
        rootRef.current = el
        refCb(el)
      }}
      style={style}
      className={floating ? 'absolute -translate-x-1/2 -translate-y-1/2 z-10' : 'relative'}
    >
      <div
        role={isMe ? undefined : 'button'}
        title={isMe ? undefined : t('reactTo', { name: p.name })}
        onClick={isMe ? undefined : onToggleFlyout}
        className={[
          'group relative flex flex-col items-center gap-1 w-20 rounded-xl',
          isMe ? '' : 'cursor-pointer hover:bg-slate-800/40 transition-colors',
          hit ? 'animate-seat-shake' : '',
        ].join(' ')}
      >
        {flyoutOpen && (
          <EmojiFlyout emojis={quickEmojis} onPick={onPickEmoji} onMore={onMoreEmojis} below={popoverBelow} />
        )}

        {gif && <GifBubble gif={gif} below={popoverBelow} />}

        {/* Card */}
        {p.isObserver ? (
          <div
            className="w-10 h-14 rounded-lg flex items-center justify-center text-lg text-slate-500"
            title={t('observerSeatTitle')}
          >
            👁
          </div>
        ) : showVote ? (
          <div className="w-10 h-14 rounded-lg bg-brand-600 border border-brand-300/50 text-white flex items-center justify-center font-bold text-base shadow-lg animate-flip-in">
            {p.vote}
          </div>
        ) : p.hasVoted ? (
          <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-brand-600 to-brand-900 border border-brand-400/60 flex items-center justify-center shadow-lg">
            <span className="text-white/40 text-xs tracking-widest">◆◆</span>
          </div>
        ) : (
          <div className="w-10 h-14 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/40" />
        )}

        {/* Avatar */}
        <div className="relative">
          <div
            className={[
              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md',
              isMe ? 'ring-2 ring-brand-400' : '',
            ].join(' ')}
            style={{ background: avatarColor(p.name) }}
          >
            {p.name.trim().charAt(0).toUpperCase() || '?'}
          </div>
          {p.isFacilitator && (
            <span className="absolute -top-1.5 -right-1.5 text-xs" title={t('hostTitle')}>
              👑
            </span>
          )}
        </div>

        {/* Name */}
        <span
          className={[
            'text-xs max-w-full truncate px-1',
            isMe ? 'text-brand-300 font-medium' : 'text-slate-300',
          ].join(' ')}
        >
          {p.name}
          {isMe ? t('you') : ''}
        </span>

        {/* Kick (facilitator only) */}
        {isFacilitator && !isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onKick(p.id)
            }}
            className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400/60 text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('removeParticipant', { name: p.name })}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

interface EmojiFlyoutProps {
  emojis: string[]
  onPick: (emoji: string) => void
  onMore: () => void
  below: boolean
}

function EmojiFlyout({ emojis, onPick, onMore, below }: EmojiFlyoutProps) {
  const { t } = useI18n()
  return (
    <div
      className={[
        'absolute left-1/2 -translate-x-1/2 z-40 animate-bounce-in',
        below ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
      ].join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      {below && <PopoverArrow below />}
      <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-full px-2 py-1 shadow-2xl">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            className="text-lg leading-none p-1 rounded-full transition-transform hover:scale-125"
            title={t('throwEmoji', { emoji })}
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={onMore}
          className="text-sm leading-none p-1 rounded-full text-slate-400 hover:text-slate-200 transition-transform hover:scale-125"
          title={t('moreEmojis')}
        >
          ➕
        </button>
      </div>
      {!below && <PopoverArrow />}
    </div>
  )
}

function PopoverArrow({ below = false }: { below?: boolean }): ReactNode {
  return below ? (
    <div className="w-2 h-2 bg-slate-900 border-l border-t border-slate-700 rotate-45 mx-auto -mb-1" />
  ) : (
    <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 mx-auto -mt-1" />
  )
}

function GifBubble({ gif, below }: { gif: GifReactionEvent; below: boolean }) {
  const { t } = useI18n()
  return (
    <div
      className={[
        'absolute left-1/2 -translate-x-1/2 z-30 animate-bounce-in pointer-events-none w-32',
        below ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
      ].join(' ')}
    >
      {below && <PopoverArrow below />}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl">
        <img src={gifUrl(gif.gif)} alt={t('gifReaction')} className="w-full h-20 object-cover rounded-lg" />
      </div>
      {!below && <PopoverArrow />}
    </div>
  )
}

const FLY_MS = 600
const SPLAT_MS = 550

interface FlyingEmojiProps {
  item: EmojiThrownEvent
  getSeatCenter: (participantId: string) => { x: number; y: number } | null
  onDone: (id: string) => void
  onImpact: (participantId: string) => void
}

function FlyingEmoji({ item, getSeatCenter, onDone, onImpact }: FlyingEmojiProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    const to = getSeatCenter(item.targetId)
    if (!to) {
      onDone(item.id)
      return
    }
    // Sender may have left mid-flight: launch from above the target instead
    const from = getSeatCenter(item.fromId) ?? { x: to.x, y: Math.max(0, to.y - 120) }
    setStyle({
      left: from.x,
      top: from.y,
      '--tx': `${to.x - from.x}px`,
      '--ty': `${to.y - from.y}px`,
    } as CSSProperties)
    const impactTimer = setTimeout(() => onImpact(item.targetId), FLY_MS)
    const doneTimer = setTimeout(() => onDone(item.id), FLY_MS + SPLAT_MS)
    return () => {
      clearTimeout(impactTimer)
      clearTimeout(doneTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  if (!style) return null
  return (
    <span className="emoji-projectile" style={style}>
      {item.emoji}
    </span>
  )
}
