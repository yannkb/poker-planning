import {
  summarizeVotes,
  nearestDeckValue,
  HIDDEN_VOTE,
  type ClientParticipant,
  type Issue,
} from 'planning-poker-shared'
import { useI18n } from '../lib/i18n'

interface ResultsDisplayProps {
  participants: ClientParticipant[]
  deckValues: readonly string[]
  currentIssue?: Issue | null
  isFacilitator?: boolean
  onSetEstimate?: (issueId: string, estimate: string) => void
}

export default function ResultsDisplay({
  participants, deckValues, currentIssue, isFacilitator, onSetEstimate,
}: ResultsDisplayProps) {
  const { t } = useI18n()
  const revealed = participants.filter(
    (p): p is ClientParticipant & { vote: string } => !p.isObserver && p.vote !== null && p.vote !== HIDDEN_VOTE,
  )

  if (revealed.length === 0) {
    return <div className="text-center text-slate-400 py-6">{t('noVotesCast')}</div>
  }

  const { average, counts, consensus } = summarizeVotes(revealed.map((p) => p.vote))
  // Snap the raw average onto a real card so estimates stay on the scale.
  const suggested = average !== null ? nearestDeckValue(average, deckValues) : null

  // Distribution bars follow deck order
  const orderedValues = deckValues.filter((v) => counts[v])
  const maxCount = Math.max(...Object.values(counts))

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 flex-wrap">
        {suggested !== null && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-300">{suggested}</span>
            <span className="text-slate-400 text-sm">{t('estimateLabel')}</span>
            {average !== null && String(average) !== suggested && (
              <span className="text-slate-500 text-xs">{t('avgValue', { value: average })}</span>
            )}
          </div>
        )}
        {consensus && (
          <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full text-sm font-medium">
            {t('consensus')}
          </span>
        )}
        {isFacilitator && currentIssue && suggested !== null && onSetEstimate && (
          <button
            onClick={() => onSetEstimate(currentIssue.id, suggested)}
            disabled={currentIssue.estimate === suggested}
            className="text-sm font-medium px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            {currentIssue.estimate === suggested ? t('estimateSet') : t('setEstimateTo', { value: suggested })}
          </button>
        )}
        <span className="text-slate-400 text-sm ml-auto">
          {t(revealed.length === 1 ? 'voteCountOne' : 'votesCount', { count: revealed.length })}
        </span>
      </div>

      {/* Distribution bars */}
      <div className="flex items-end gap-2 h-16">
        {orderedValues.map((value) => {
          const count = counts[value] ?? 0
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0
          return (
            <div key={value} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-xs text-slate-400">{count}</span>
              <div
                className="w-full bg-brand-600 rounded-t-sm transition-all duration-500"
                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
              />
              <span className="text-xs font-medium text-slate-300 truncate w-full text-center">{value}</span>
            </div>
          )
        })}
      </div>

      {/* Individual votes */}
      <div className="flex flex-wrap gap-2 pt-1">
        {revealed.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2 py-1.5 text-sm">
            <span className="font-bold text-brand-300 w-6 text-center">{p.vote}</span>
            <span className="text-slate-400">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
