import { LANGS, useI18n } from '../lib/i18n'

export default function LangSwitcher() {
  const { lang, setLang } = useI18n()

  const labels: Record<string, string> = { fr: 'Français', en: 'English' }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex rounded-full border border-slate-700 overflow-hidden text-xs font-medium"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          aria-label={labels[code]}
          className={[
            'px-2 py-1 transition-colors',
            lang === code
              ? 'bg-brand-500/20 text-brand-300'
              : 'text-slate-400 hover:text-slate-200',
          ].join(' ')}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
