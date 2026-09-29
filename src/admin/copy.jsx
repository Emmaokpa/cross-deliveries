import { useCallback, useEffect, useRef, useState } from 'react'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts (e.g. http previews)
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

// Renders `value` and copies it on click. Pass `navigate=true` behavior by
// wrapping in a <Link> (stopPropagation keeps the copy from triggering nav).
export default function CopyChip({ value, label, className = 'mono', title }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onClick = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (await copyText(value)) {
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      }
    },
    [value],
  )

  return (
    <button
      type="button"
      className={`copy-chip${copied ? ' copied' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={title || `Click to copy: ${value}`}
    >
      {label ?? value}
      <span aria-hidden="true" style={{ fontSize: 11, opacity: 0.75 }}>{copied ? '✓' : '⧉'}</span>
    </button>
  )
}
