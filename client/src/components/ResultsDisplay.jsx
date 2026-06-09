import { useI18n } from '../lib/i18n.jsx'

export default function ResultsDisplay({ participants, deckValues }) {
  const { t } = useI18n()
  const revealed = participants.filter((p) => !p.isObserver && p.vote && p.vote !== '🂠')

  if (revealed.length === 0) {
    return (
      <div className="text-center text-slate-400 py-6">
        {t('noVotesCast')}
      </div>
    )
  }

  // Build distribution using deck order
  const counts = {}
  revealed.forEach((p) => { counts[p.vote] = (counts[p.vote] || 0) + 1 })

  const orderedValues = deckValues
    ? deckValues.filter((v) => counts[v])
    : Object.keys(counts)

  const maxCount = Math.max(...Object.values(counts))

  const numericVotes = revealed
    .map((p) => parseFloat(p.vote))
    .filter((v) => !isNaN(v))

  const avg = numericVotes.length
    ? Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10
    : null

  const agreement = revealed.length > 1 && new Set(revealed.map((p) => p.vote)).size === 1

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 flex-wrap">
        {avg !== null && (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-brand-300">{avg}</span>
            <span className="text-slate-400 text-sm">{t('avg')}</span>
          </div>
        )}
        {agreement && (
          <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full text-sm font-medium">
            {t('consensus')}
          </span>
        )}
        <span className="text-slate-400 text-sm ml-auto">{t('votesCount', { count: revealed.length })}</span>
      </div>

      {/* Distribution bars */}
      <div className="flex items-end gap-2 h-16">
        {orderedValues.map((v) => {
          const count = counts[v] || 0
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0
          return (
            <div key={v} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-xs text-slate-400">{count}</span>
              <div
                className="w-full bg-brand-600 rounded-t-sm transition-all duration-500"
                style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
              />
              <span className="text-xs font-medium text-slate-300 truncate w-full text-center">{v}</span>
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
