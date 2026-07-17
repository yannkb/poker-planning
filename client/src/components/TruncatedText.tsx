import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface TruncatedTextProps {
  text: string
  className?: string
  /** Max lines before clamping; 1 = single-line ellipsis. */
  lines?: number
}

interface Tip {
  left: number
  top: number
  placement: 'above' | 'below'
}

// Truncates text and reveals the full value in a tooltip — but only when it
// actually overflows. The tooltip is portaled to <body> so it is never clipped
// by an ancestor's overflow:hidden (issue list, header, table center).
export default function TruncatedText({ text, className = '', lines = 1 }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const tooltipId = useId()
  const [overflowing, setOverflowing] = useState(false)
  const [tip, setTip] = useState<Tip | null>(null)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(
      lines > 1 ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1,
    )
  }, [lines])

  useLayoutEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, text])

  const show = useCallback(() => {
    const el = ref.current
    if (!el || !overflowing) return
    const r = el.getBoundingClientRect()
    const placement: Tip['placement'] = r.top > 96 ? 'above' : 'below'
    setTip({
      left: Math.min(Math.max(r.left + r.width / 2, 12), window.innerWidth - 12),
      top: placement === 'above' ? r.top - 6 : r.bottom + 6,
      placement,
    })
  }, [overflowing])

  const hide = useCallback(() => setTip(null), [])

  // A tooltip pinned to viewport coords goes stale on scroll/resize — just drop it.
  useEffect(() => {
    if (!tip) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [tip, hide])

  const style: CSSProperties | undefined =
    lines > 1
      ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
      : undefined

  return (
    <>
      <span
        ref={ref}
        className={[lines > 1 ? '' : 'truncate', className].filter(Boolean).join(' ')}
        style={style}
        tabIndex={overflowing ? 0 : undefined}
        aria-describedby={tip ? tooltipId : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {text}
      </span>
      {tip &&
        createPortal(
          <div
            role="tooltip"
            id={tooltipId}
            className="pointer-events-none fixed z-[60] max-w-xs whitespace-normal break-words rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 shadow-xl"
            style={{
              left: tip.left,
              top: tip.top,
              transform: `translate(-50%, ${tip.placement === 'above' ? '-100%' : '0'})`,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}
