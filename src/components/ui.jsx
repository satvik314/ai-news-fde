import { useState } from 'react'

export const AGENTS = {
  research: { name: 'Research Agent', short: 'Research', icon: '🔎', color: 'var(--c-research)', role: 'Scans the web for the latest AI news' },
  human: { name: 'You · Editor', short: 'Approval', icon: '🧑‍💼', color: 'var(--c-human)', role: 'Approves which stories get written' },
  twitter: { name: 'Twitter/X Agent', short: 'Twitter', icon: '𝕏', color: 'var(--c-twitter)', role: 'Writes scroll-stopping tweet threads' },
  linkedin: { name: 'LinkedIn Agent', short: 'LinkedIn', icon: 'in', color: 'var(--c-linkedin)', role: 'Writes LinkedIn posts with your CTA' },
  system: { name: 'Orchestrator', short: 'System', icon: '◆', color: 'var(--c-muted)', role: '' },
}

export function AgentAvatar({ agent, size = 36, pulse = false }) {
  const a = AGENTS[agent]
  return (
    <span
      className={`agent-avatar ${pulse ? 'pulse' : ''}`}
      style={{ '--agent': a.color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {a.icon}
    </span>
  )
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  )
}

export function Stepper({ value, onChange, min, max, label }) {
  return (
    <div className="stepper">
      {label && <span className="field-label">{label}</span>}
      <div className="stepper-controls">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>−</button>
        <span className="stepper-value">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text })
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <button type="button" className={`btn btn-ghost btn-sm ${className}`} onClick={copy}>
      {copied ? '✓ Copied' : label}
    </button>
  )
}
