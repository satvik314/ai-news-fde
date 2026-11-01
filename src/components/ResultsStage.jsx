import { useState } from 'react'
import { AgentAvatar, CopyButton, Spinner } from './ui.jsx'

const threadText = (thread) => thread.tweets.join('\n\n')

function TwitterOutput({ result, onRetry }) {
  if (!result) return null
  if (result.status === 'running') return <Working agent="twitter" text="Drafting tweet threads…" />
  if (result.status === 'error') return <Failed text={result.error} onRetry={onRetry} />
  return (
    <div className="threads">
      {result.data.threads.map((thread, ti) => (
        <div key={ti} className="thread">
          <div className="thread-head">
            <span className="chip">Thread {ti + 1}</span>
            <strong>{thread.angle}</strong>
            <CopyButton text={threadText(thread)} label="Copy thread" />
          </div>
          <ol className="tweets">
            {thread.tweets.map((t, i) => (
              <li key={i} className="tweet">
                <div className="tweet-rail"><span className="tweet-avatar">𝕏</span>{i < thread.tweets.length - 1 && <span className="tweet-line" />}</div>
                <div className="tweet-body">
                  <p>{t}</p>
                  <div className="tweet-foot">
                    <span className={`chars ${t.length > 280 ? 'over' : ''}`}>{t.length}/280</span>
                    <CopyButton text={t} label="Copy" className="btn-xs" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

function LinkedInOutput({ result, onRetry }) {
  const [expanded, setExpanded] = useState(true)
  if (!result) return null
  if (result.status === 'running') return <Working agent="linkedin" text="Writing LinkedIn post…" />
  if (result.status === 'error') return <Failed text={result.error} onRetry={onRetry} />
  const { post, hook_variants: hooks = [] } = result.data
  return (
    <div className="li-wrap">
      <div className="li-post">
        <div className="li-author">
          <span className="li-avatar">You</span>
          <div><strong>Your Name</strong><span>Founder · AI educator · now</span></div>
        </div>
        <div className={`li-text ${expanded ? '' : 'clamped'}`}>{post}</div>
        <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)}>{expanded ? 'Show less' : '…see more'}</button>
        <div className="li-foot">
          <span>{post.split(/\s+/).filter(Boolean).length} words</span>
          <CopyButton text={post} label="Copy post" />
        </div>
      </div>
      {hooks.length > 0 && (
        <div className="hooks">
          <span className="field-label">Alternative hooks to A/B test</span>
          {hooks.map((h, i) => (
            <div key={i} className="hook"><p>{h}</p><CopyButton text={h} label="Copy" className="btn-xs" /></div>
          ))}
        </div>
      )}
    </div>
  )
}

function Working({ agent, text }) {
  return (
    <div className="out-working">
      <AgentAvatar agent={agent} size={36} pulse />
      <span><Spinner size={13} /> {text}</span>
      <div className="shimmer-lines"><span /><span /><span /></div>
    </div>
  )
}

function Failed({ text, onRetry }) {
  return (
    <div className="alert">
      ⚠ {text}
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Retry</button>
    </div>
  )
}

export function toMarkdown(stories, outputs) {
  return stories
    .map((s) => {
      const o = outputs[s.id] || {}
      let md = `# ${s.title}\n\nSource: ${s.source} — ${s.url}\n`
      if (o.twitter?.status === 'done') {
        md += `\n## Twitter / X\n`
        o.twitter.data.threads.forEach((t, i) => {
          md += `\n### Thread ${i + 1}: ${t.angle}\n\n${t.tweets.map((tw) => `${tw}\n`).join('\n---\n\n')}`
        })
      }
      if (o.linkedin?.status === 'done') md += `\n## LinkedIn\n\n${o.linkedin.data.post}\n`
      return md
    })
    .join('\n\n========================================\n\n')
}

export default function ResultsStage({ stories, outputs, enabled, onRetry, onRestart, onBack }) {
  const [active, setActive] = useState(stories[0]?.id)
  const story = stories.find((s) => s.id === active) || stories[0]
  const out = outputs[story.id] || {}
  const allDone = stories.every((s) =>
    ['twitter', 'linkedin'].every((a) => !enabled[a] || ['done', 'error'].includes(outputs[s.id]?.[a]?.status)),
  )

  const download = () => {
    const blob = new Blob([toMarkdown(stories, outputs)], { type: 'text/markdown' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `ai-news-content-${new Date().toISOString().slice(0, 10)}.md`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <span className="eyebrow">Step 4 · Content ready for review</span>
          <h2>{allDone ? 'Your content is ready' : 'Writer agents are drafting…'}</h2>
          <p className="muted">Review, tweak and copy. Regenerate any piece you don’t love.</p>
        </div>
        <div className="stage-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={!allDone}>← Re-brief agents</button>
          <button type="button" className="btn btn-ghost" onClick={download} disabled={!allDone}>⬇ Export .md</button>
          <button type="button" className="btn btn-primary" onClick={onRestart}>New run</button>
        </div>
      </div>

      <div className="tabs">
        {stories.map((s) => {
          const busy = ['twitter', 'linkedin'].some((a) => outputs[s.id]?.[a]?.status === 'running')
          return (
            <button key={s.id} type="button" className={`tab ${s.id === story.id ? 'active' : ''}`} onClick={() => setActive(s.id)}>
              {busy ? <Spinner size={12} /> : <span className="tab-rank">#{s.rank}</span>}
              <span className="tab-title">{s.title}</span>
            </button>
          )
        })}
      </div>

      <div className={`results-grid ${enabled.twitter && enabled.linkedin ? '' : 'single'}`}>
        {enabled.twitter && (
          <section className="result-col" style={{ '--agent': 'var(--c-twitter)' }}>
            <header>
              <AgentAvatar agent="twitter" size={30} />
              <h3>Twitter/X threads</h3>
              {out.twitter?.status === 'done' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRetry(story, 'twitter')}>↻ Regenerate</button>
              )}
            </header>
            <TwitterOutput result={out.twitter} onRetry={() => onRetry(story, 'twitter')} />
          </section>
        )}
        {enabled.linkedin && (
          <section className="result-col" style={{ '--agent': 'var(--c-linkedin)' }}>
            <header>
              <AgentAvatar agent="linkedin" size={30} />
              <h3>LinkedIn post</h3>
              {out.linkedin?.status === 'done' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRetry(story, 'linkedin')}>↻ Regenerate</button>
              )}
            </header>
            <LinkedInOutput result={out.linkedin} onRetry={() => onRetry(story, 'linkedin')} />
          </section>
        )}
      </div>
    </div>
  )
}
