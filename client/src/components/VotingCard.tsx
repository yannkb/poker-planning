interface VotingCardProps {
  value: string
  selected: boolean
  onClick: () => void
}

export default function VotingCard({ value, selected, onClick }: VotingCardProps) {
  const isSpecial = value === '?' || value === '☕'

  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col items-center justify-center',
        'w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 font-bold text-lg sm:text-xl',
        'transition-all duration-150 select-none cursor-pointer',
        selected
          ? 'border-brand-500 bg-brand-500/20 text-brand-300 -translate-y-3 shadow-lg shadow-brand-500/30'
          : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400 hover:bg-slate-700 hover:-translate-y-1',
        isSpecial ? 'text-2xl' : '',
      ].join(' ')}
    >
      <span>{value}</span>
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 rounded-full border-2 border-slate-950" />
      )}
    </button>
  )
}
