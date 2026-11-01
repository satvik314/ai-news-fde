import { useState } from 'react'
import { AGENTS, AgentAvatar, Segmented, Toggle } from './ui.jsx'

function KeyField({ label, value, onChange, placeholder, href }) {
  const [show, setShow] = useState(false)
  const ok = value.trim().length > 10
  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{label}</span>
        <span className={`key-status ${ok ? 'ok' : ''}`}>{ok ? 'Connected' : 'Required'}</span>
      </div>
      <div className="key-input">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide key' : 'Show key'}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <a className="field-hint" href={href} target="_blank" rel="noreferrer">Get a key ↗</a>
    </div>
  )
}

export default function Sidebar({ config, update, agentStatus }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/favicon.svg" alt="" width="38" height="38" />
        <div>
          <h1>Agentic Newsroom</h1>
          <p>AI news → content, with agents</p>
        </div>
      </div>

      <section className="side-section">
        <h3>API keys</h3>
        <KeyField
          label="OpenAI API key"
          value={config.openaiKey}
          onChange={(v) => update({ openaiKey: v })}
          placeholder="sk-..."
          href="https://platform.openai.com/api-keys"
        />
        <KeyField
          label="SerpAPI key"
          value={config.serpKey}
          onChange={(v) => update({ serpKey: v })}
          placeholder="Your SerpAPI key"
          href="https://serpapi.com/manage-api-key"
        />
        <Toggle checked={config.remember} onChange={(v) => update({ remember: v })} label="Remember keys on this device" />
      </section>

      <section className="side-section">
        <h3>Model</h3>
        <div className="field">
          <input className="text-input mono" value={config.model} onChange={(e) => update({ model: e.target.value })} spellCheck={false} />
          <span className="field-hint muted">Shared by all three agents</span>
        </div>
      </section>

      <section className="side-section">
        <h3>Research settings</h3>
        <div className="field">
          <span className="field-label">News window</span>
          <Segmented
            value={config.timeRange}
            onChange={(v) => update({ timeRange: v })}
            options={[
              { value: 'day', label: '24 hours' },
              { value: 'week', label: '7 days' },
              { value: 'month', label: '30 days' },
            ]}
          />
        </div>
        <div className="field">
          <span className="field-label">Focus (optional)</span>
          <textarea
            className="text-input"
            rows={2}
            value={config.focus}
            onChange={(e) => update({ focus: e.target.value })}
            placeholder="e.g. AI agents, open-source models, India AI ecosystem"
          />
        </div>
      </section>

      <section className="side-section">
        <h3>Agent crew</h3>
        <ul className="roster">
          {['research', 'twitter', 'linkedin'].map((id) => (
            <li key={id}>
              <AgentAvatar agent={id} size={30} pulse={agentStatus[id] === 'running'} />
              <div>
                <strong>{AGENTS[id].name}</strong>
                <span>{AGENTS[id].role}</span>
              </div>
              <span className={`status-dot ${agentStatus[id]}`} title={agentStatus[id]} />
            </li>
          ))}
        </ul>
      </section>

      <p className="privacy">🔒 Keys stay in your browser and are only sent to OpenAI and SerpAPI.</p>
    </aside>
  )
}
