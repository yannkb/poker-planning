import { useEffect, useRef, useState } from 'react'
import type { GifSearchResult } from 'planning-poker-shared'
import { REACTION_GIFS } from '../lib/reactions'
import { useI18n } from '../lib/i18n'

interface ReactionBarProps {
  onSendGif: (gif: string) => void
}

export default function ReactionBar({ onSendGif }: ReactionBarProps) {
  const { t } = useI18n()
  const [gifOpen, setGifOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Close the picker on outside click
  useEffect(() => {
    if (!gifOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setGifOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [gifOpen])

  return (
    <div ref={rootRef} className="relative flex items-center gap-3">
      <p className="text-xs text-slate-600">{t('clickPlayerHint')}</p>

      <button
        onClick={() => setGifOpen((v) => !v)}
        className={[
          'text-xs font-bold px-3 py-1.5 rounded-full border transition-colors',
          gifOpen
            ? 'border-brand-500 text-brand-300 bg-brand-500/10'
            : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500',
        ].join(' ')}
        title={t('gifTitle')}
      >
        GIF
      </button>

      {gifOpen && (
        <GifPicker
          onPick={(gif) => {
            onSendGif(gif)
            setGifOpen(false)
          }}
        />
      )}
    </div>
  )
}

type SearchStatus = 'idle' | 'loading' | 'error' | 'unconfigured'

function GifPicker({ onPick }: { onPick: (gif: string) => void }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  // null = showing curated defaults
  const [results, setResults] = useState<GifSearchResult[] | null>(null)
  const [status, setStatus] = useState<SearchStatus>('idle')

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/gifs/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          })
          if (res.status === 503) {
            setStatus('unconfigured')
            setResults(null)
            return
          }
          if (!res.ok) throw new Error('search failed')
          const { gifs } = (await res.json()) as { gifs: GifSearchResult[] }
          setResults(gifs)
          setStatus('idle')
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            setStatus('error')
            setResults(null)
          }
        }
      })()
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="absolute bottom-full right-0 mb-2 z-40 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2.5">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchGiphy')}
        className="w-full mb-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
      />

      {status === 'unconfigured' && (
        <p className="text-xs text-amber-400/80 px-1 pb-2">{t('gifUnconfigured')}</p>
      )}
      {status === 'error' && <p className="text-xs text-red-400/80 px-1 pb-2">{t('gifError')}</p>}
      {status === 'loading' && <p className="text-xs text-slate-500 px-1 pb-2">{t('searching')}</p>}

      <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
        {results === null ? (
          Object.entries(REACTION_GIFS).map(([key, { label, url }]) => (
            <GifCell key={key} title={label} src={url} onClick={() => onPick(key)} />
          ))
        ) : results.length === 0 && status === 'idle' ? (
          <p className="col-span-3 text-center text-xs text-slate-500 py-4">{t('noGifs')}</p>
        ) : (
          results.map((gif) => (
            <GifCell key={gif.id} title={gif.title} src={gif.preview} onClick={() => onPick(gif.id)} />
          ))
        )}
      </div>

      {/* GIPHY attribution mark — required wherever GIPHY content is displayed */}
      <a
        href="https://giphy.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex justify-center"
      >
        <img src="/powered-by-giphy.png" alt="Powered by GIPHY" className="h-4 w-auto" />
      </a>
    </div>
  )
}

function GifCell({ title, src, onClick }: { title: string; src: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg overflow-hidden border border-slate-800 hover:border-brand-500 transition-colors bg-slate-800"
    >
      <img src={src} alt={title} loading="lazy" className="w-full h-16 object-cover" />
    </button>
  )
}
