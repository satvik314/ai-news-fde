import { AgentAvatar, Spinner } from './ui.jsx'

export const MAX_SELECTED = 3

function StoryCard({ story, selected, disabled, onToggle }) {
  return (
    <article
      className={`story ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onToggle(story.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !disabled && (e.preventDefault(), onToggle(story.id))}
    >
      <div className="story-top">
        <span className="story-rank">#{story.rank}</span>
        <span className="chip">{story.category}</span>
        <span className="hype" title={`Hype score ${story.hype_score}/10`}>
          <span className="hype-bar"><span style={{ width: `${(Number(story.hype_score) || 0) * 10}%` }} /></span>
          🔥 {story.hype_score}
        </span>
        <span className={`checkbox ${selected ? 'on' : ''}`}>{selected ? '✓' : ''}</span>
      </div>
      <h4>{story.title}</h4>
      <p className="story-summary">{story.summary}</p>
      <div className="story-insight">
        <span>Why it matters</span>
        <p>{story.why_it_matters}</p>
      </div>
      <div className="story-insight angle">
        <span>Content angle</span>
        <p>{story.content_angle}</p>
      </div>
      <div className="story-meta">
        <span>{story.source}{story.published ? ` · ${story.published}` : ''}</span>
        {story.url && (
          <a href={story.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Read source ↗</a>
        )}
      </div>
    </article>
  )
}

export default function ResearchStage({ research, keysReady, onRun, onCancel, selected, onToggle, onApprove, lastLog }) {
  if (research.status === 'idle' || research.status === 'error') {
    return (
      <div className="hero card">
        <AgentAvatar agent="research" size={56} />
        <div className="hero-text">
          <span className="eyebrow">Step 1 · Agent 1</span>
          <h2>Find today’s top AI stories</h2>
          <p>
            The Research Agent plans its own searches, queries Google News through SerpAPI, de-duplicates
            coverage and ranks the <strong>5 stories</strong> most worth posting about. You then pick up to {MAX_SELECTED}.
          </p>
          {research.status === 'error' && <div className="alert">⚠ {research.error}</div>}
          {!keysReady && <div className="alert soft">Add your OpenAI and SerpAPI keys in the sidebar to begin.</div>}
          <button type="button" className="btn btn-primary btn-lg" disabled={!keysReady} onClick={onRun}>
            {research.status === 'error' ? 'Retry research' : 'Run Research Agent'} →
          </button>
        </div>
      </div>
    )
  }

  if (research.status === 'running') {
    return (
      <div className="card working">
        <div className="working-head">
          <AgentAvatar agent="research" size={44} pulse />
          <div>
            <h3>Research Agent is working</h3>
            <p className="working-status"><Spinner size={13} /> {lastLog || 'Starting up…'}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Stop</button>
        </div>
        <div className="story-grid">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="story skeleton" style={{ animationDelay: `${i * 120}ms` }} />)}
        </div>
      </div>
    )
  }

  const count = selected.length
  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <span className="eyebrow human">Step 2 · Human in the loop</span>
          <h2>Approve the stories to write about</h2>
          <p className="muted">
            {research.articlesScanned} articles scanned · select up to {MAX_SELECTED} stories for the writer agents.
          </p>
        </div>
        <div className="stage-actions">
          <button type="button" className="btn btn-ghost" onClick={onRun}>↻ Re-run research</button>
          <button type="button" className="btn btn-primary" disabled={!count} onClick={onApprove}>
            Approve {count || ''} {count === 1 ? 'story' : 'stories'} →
          </button>
        </div>
      </div>
      <div className="selection-meter">
        {Array.from({ length: MAX_SELECTED }).map((_, i) => <span key={i} className={i < count ? 'on' : ''} />)}
        <em>{count}/{MAX_SELECTED} selected</em>
      </div>
      <div className="story-grid">
        {research.stories.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            selected={selected.includes(s.id)}
            disabled={!selected.includes(s.id) && count >= MAX_SELECTED}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
