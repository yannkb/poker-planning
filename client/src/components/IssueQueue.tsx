import { useState } from 'react'
import type { Issue } from 'planning-poker-shared'
import { useI18n } from '../lib/i18n'
import TruncatedText from './TruncatedText'

interface IssueQueueProps {
  issues: Issue[]
  currentIssueId: string | null
  isFacilitator: boolean
  onAddIssue: (title: string) => void
  onSelectIssue: (issueId: string) => void
  onSetEstimate: (issueId: string, estimate: string) => void
}

export default function IssueQueue({
  issues, currentIssueId, isFacilitator, onAddIssue, onSelectIssue, onSetEstimate,
}: IssueQueueProps) {
  const { t } = useI18n()
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    onAddIssue(title)
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{t('issues')}</h3>
        {isFacilitator && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {adding ? t('cancel') : t('add')}
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('issueTitlePh')}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {t('addShort')}
          </button>
        </form>
      )}

      {issues.length === 0 && !adding && (
        <p className="text-slate-500 text-sm text-center py-3">
          {isFacilitator ? t('addIssuesPrompt') : t('noIssuesYet')}
        </p>
      )}

      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            isActive={issue.id === currentIssueId}
            isFacilitator={isFacilitator}
            onSelect={() => isFacilitator && onSelectIssue(issue.id)}
            onSetEstimate={onSetEstimate}
          />
        ))}
      </div>
    </div>
  )
}

interface IssueRowProps {
  issue: Issue
  isActive: boolean
  isFacilitator: boolean
  onSelect: () => void
  onSetEstimate: (issueId: string, estimate: string) => void
}

function IssueRow({ issue, isActive, isFacilitator, onSelect, onSetEstimate }: IssueRowProps) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [estValue, setEstValue] = useState(issue.estimate ?? '')

  function handleEstimate(e: React.FormEvent) {
    e.preventDefault()
    onSetEstimate(issue.id, estValue)
    setEditing(false)
  }

  const selectable = isFacilitator && !isActive

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              // Only react to keys on the row itself, not ones bubbling up from
              // the nested estimate-edit form (where Enter must submit, not select).
              if (e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      className={[
        'rounded-lg px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-brand-500/15 border border-brand-500/40' : 'bg-slate-800/60 border border-transparent',
        selectable
          ? 'cursor-pointer hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
          : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 flex-1 min-w-0">
          {isActive && <span className="text-brand-400 shrink-0">▶</span>}
          <TruncatedText
            text={issue.title}
            className={['flex-1 min-w-0', isActive ? 'text-brand-200' : 'text-slate-300'].join(' ')}
          />
        </span>
        {issue.estimate !== null ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              if (isFacilitator) setEditing(true)
            }}
            className="text-xs font-bold bg-brand-600/30 text-brand-300 border border-brand-600/40 px-2 py-0.5 rounded cursor-pointer"
          >
            {issue.estimate}
          </span>
        ) : isFacilitator && isActive ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t('set')}
          </button>
        ) : null}
      </div>

      {editing && (
        <form onSubmit={handleEstimate} onClick={(e) => e.stopPropagation()} className="flex gap-2 mt-2">
          <input
            autoFocus
            value={estValue}
            onChange={(e) => setEstValue(e.target.value)}
            placeholder={t('estimatePh')}
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          />
          <button type="submit" className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-500">
            {t('save')}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-200 px-1"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  )
}
