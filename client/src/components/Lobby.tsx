import { useState, useEffect, type ReactNode } from 'react'
import { DECKS, DECK_KEYS } from 'planning-poker-shared'
import { useI18n } from '../lib/i18n'
import LangSwitcher from './LangSwitcher'

interface LobbyProps {
  onCreateRoom: (name: string, facilitatorName: string, deck: string) => Promise<void>
  onJoinRoom: (roomId: string, playerName: string) => void
  error: string | null
  clearError: () => void
  defaultJoinCode: string | null
}

export default function Lobby({ onCreateRoom, onJoinRoom, error, clearError, defaultJoinCode }: LobbyProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'create' | 'join'>(defaultJoinCode ? 'join' : 'create')
  const [loading, setLoading] = useState(false)

  // Create form
  const [sessionName, setSessionName] = useState('')
  const [hostName, setHostName] = useState('')
  const [deck, setDeck] = useState<string>('fibonacci')

  // Reset loading when a socket error arrives
  useEffect(() => {
    if (error) setLoading(false)
  }, [error])

  // Join form
  const [roomCode, setRoomCode] = useState(defaultJoinCode ?? '')
  const [playerName, setPlayerName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!hostName.trim()) return
    setLoading(true)
    await onCreateRoom(sessionName.trim() || t('defaultSessionName'), hostName.trim(), deck)
    setLoading(false)
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!roomCode.trim() || !playerName.trim()) return
    setLoading(true)
    onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim())
    // Join is async via socket; loading cleared by the error effect on failure
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <LangSwitcher />
      </div>

      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="text-5xl mb-3">🃏</div>
        <h1 className="text-3xl font-bold text-slate-100">Planning Poker</h1>
        <p className="text-slate-400 mt-1">{t('tagline')}</p>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div role="tablist" aria-label={t('tagline')} className="flex border-b border-slate-800">
          {(['create', 'join'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key)
                clearError()
              }}
              className={[
                'flex-1 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'text-brand-300 border-b-2 border-brand-500 bg-brand-500/5'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {key === 'create' ? t('createRoom') : t('joinRoom')}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label={t('yourName')} required>
                <Input name="hostName" value={hostName} onChange={setHostName} placeholder={t('phHostName')} autoFocus />
              </Field>
              <Field label={t('sessionName')}>
                <Input name="sessionName" value={sessionName} onChange={setSessionName} placeholder={t('phSession')} />
              </Field>
              <Field label={t('cardDeck')}>
                <select
                  name="deck"
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  {DECK_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {DECKS[key].emoji} {t(`deck_${key}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                disabled={loading || !hostName.trim()}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? t('creating') : t('createRoom')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <Field label={t('yourName')} required>
                <Input name="playerName" value={playerName} onChange={setPlayerName} placeholder={t('phPlayerName')} autoFocus />
              </Field>
              <Field label={t('roomCode')} required>
                <Input
                  name="roomCode"
                  value={roomCode}
                  onChange={(v) => setRoomCode(v.toUpperCase())}
                  placeholder={t('phCode')}
                  maxLength={6}
                  className="uppercase tracking-widest"
                />
              </Field>
              <button
                type="submit"
                disabled={loading || !roomCode.trim() || !playerName.trim()}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? t('joining') : t('joinRoom')}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-slate-400 text-xs">{t('shareHint')}</p>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  // Wrapping the control in the <label> implicitly associates the two, so
  // assistive tech announces every field with its name.
  return (
    <label className="block">
      <span className="block text-sm text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

interface InputProps {
  value: string
  onChange: (value: string) => void
  name?: string
  placeholder?: string
  autoFocus?: boolean
  maxLength?: number
  className?: string
}

function Input({ value, onChange, name, placeholder, autoFocus, maxLength, className = '' }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      name={name}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      className={[
        'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-100',
        'placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors',
        className,
      ].join(' ')}
    />
  )
}
