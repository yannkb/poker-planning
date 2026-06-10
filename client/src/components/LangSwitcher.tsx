import { LANGS, useI18n } from '../lib/i18n'

export default function LangSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <div className="flex rounded-full border border-slate-700 overflow-hidden text-xs font-medium">
      {LANGS.map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={[
            'px-2 py-1 transition-colors',
            lang === code
              ? 'bg-brand-500/20 text-brand-300'
              : 'text-slate-500 hover:text-slate-300',
          ].join(' ')}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
