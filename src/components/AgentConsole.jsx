import { useEffect, useRef } from 'react'
import { AGENTS, Icon } from './ui.jsx'

const TYPE_ICON = { start: '▸', think: '…', thought: '∴', tool: 'ƒ', result: '↳', done: '✓', error: '✕', info: '·', human: '◆' }

export default function AgentConsole({ logs, onClear }) {
  const bodyRef = useRef(null)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs.length])

  return (
    <aside className="console">
      <div className="console-head">
        <Icon name="terminal" size={14} /> Agent activity <span className="live-dot" />
        {logs.length > 0 && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={onClear}>Clear</button>
        )}
      </div>
      <div className="console-body" ref={bodyRef}>
        {logs.length === 0 && <p className="console-empty">Agent reasoning, tool calls and hand-offs will stream here.</p>}
        {logs.map((l) => (
          <div key={l.id} className={`log log-${l.type}`} style={{ '--agent': AGENTS[l.agent]?.color }}>
            <span className="log-time">{l.time}</span>
            <span className="log-agent">{AGENTS[l.agent]?.short}</span>
            <span className="log-icon">{TYPE_ICON[l.type] || '•'}</span>
            <span className="log-text">{l.text}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
