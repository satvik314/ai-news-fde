import { AgentAvatar, Icon, Segmented, Stepper, Toggle } from './ui.jsx'

const TONES = ['Insightful', 'Punchy', 'Educational', 'Contrarian', 'Casual']

export function isValidUrl(v) {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function AgentBrief({ agent, enabled, onEnable, question, children }) {
  return (
    <div className={`brief card ${enabled ? '' : 'off'}`} style={{ '--agent': `var(--c-${agent})` }}>
      <div className="brief-head">
        <AgentAvatar agent={agent} size={40} pulse={enabled} />
        <div className="bubble">{question}</div>
        <Toggle checked={enabled} onChange={onEnable} />
      </div>
      <div className="brief-body">{children}</div>
    </div>
  )
}

export default function BriefStage({ stories, enabled, setEnabled, twitter, setTwitter, linkedin, setLinkedin, onBack, onLaunch }) {
  const ctaOk = !enabled.linkedin || isValidUrl(linkedin.ctaUrl.trim())
  const canLaunch = (enabled.twitter || enabled.linkedin) && ctaOk
  const n = stories.length

  return (
    <div className="stage">
      <div className="stage-head">
        <div>
          <span className="eyebrow">Step 3 · Brief the writer agents</span>
          <h2>The agents have a few questions</h2>
          <p className="muted">Answer them, then deploy. Both agents work on all {n} approved {n === 1 ? 'story' : 'stories'} in parallel.</p>
        </div>
      </div>

      <div className="approved-list">
        {stories.map((s) => (
          <span key={s.id} className="approved-chip"><b>#{s.rank}</b> {s.title}</span>
        ))}
      </div>

      <div className="brief-grid">
        <AgentBrief
          agent="twitter"
          enabled={enabled.twitter}
          onEnable={(v) => setEnabled({ ...enabled, twitter: v })}
          question={<>How many threads should I write per story, and how many tweets in each thread?</>}
        >
          <div className="row">
            <Stepper label="Threads per story" value={twitter.threadsCount} min={1} max={5} onChange={(v) => setTwitter({ ...twitter, threadsCount: v })} />
            <Stepper label="Tweets per thread" value={twitter.tweetsPerThread} min={2} max={15} onChange={(v) => setTwitter({ ...twitter, tweetsPerThread: v })} />
          </div>
          <div className="field">
            <span className="field-label">Tone</span>
            <Segmented value={twitter.tone} onChange={(v) => setTwitter({ ...twitter, tone: v })} options={TONES.map((t) => ({ value: t, label: t }))} />
          </div>
          <div className="row wrap">
            <Toggle checked={twitter.numbering} onChange={(v) => setTwitter({ ...twitter, numbering: v })} label="Number tweets (1/)" />
            <Toggle checked={twitter.emojis} onChange={(v) => setTwitter({ ...twitter, emojis: v })} label="Emojis" />
            <Toggle checked={twitter.hashtags} onChange={(v) => setTwitter({ ...twitter, hashtags: v })} label="Hashtags" />
          </div>
          <div className="field">
            <span className="field-label">Your X handle (optional, used in the closing tweet)</span>
            <input className="text-input" value={twitter.handle} onChange={(e) => setTwitter({ ...twitter, handle: e.target.value })} placeholder="@yourhandle" />
          </div>
          <p className="estimate">
            Output: {n * twitter.threadsCount} thread{n * twitter.threadsCount === 1 ? '' : 's'} · {n * twitter.threadsCount * twitter.tweetsPerThread} tweets
          </p>
        </AgentBrief>

        <AgentBrief
          agent="linkedin"
          enabled={enabled.linkedin}
          onEnable={(v) => setEnabled({ ...enabled, linkedin: v })}
          question={<>What’s the CTA link you want at the end of the post?</>}
        >
          <div className="field">
            <span className="field-label">CTA link <em className="req">required</em></span>
            <input
              className={`text-input ${linkedin.ctaUrl && !ctaOk ? 'invalid' : ''}`}
              value={linkedin.ctaUrl}
              onChange={(e) => setLinkedin({ ...linkedin, ctaUrl: e.target.value })}
              placeholder="https://buildfastwithai.com/..."
              type="url"
            />
            {linkedin.ctaUrl && !ctaOk && <span className="field-error">Enter a full URL starting with https://</span>}
          </div>
          <div className="field">
            <span className="field-label">CTA line (optional)</span>
            <input className="text-input" value={linkedin.ctaText} onChange={(e) => setLinkedin({ ...linkedin, ctaText: e.target.value })} placeholder="e.g. Join our free Agentic AI workshop" />
          </div>
          <div className="field">
            <span className="field-label">Tone</span>
            <Segmented value={linkedin.tone} onChange={(v) => setLinkedin({ ...linkedin, tone: v })} options={TONES.map((t) => ({ value: t, label: t }))} />
          </div>
          <div className="row wrap">
            <div className="field">
              <span className="field-label">Length</span>
              <Segmented
                value={linkedin.length}
                onChange={(v) => setLinkedin({ ...linkedin, length: v })}
                options={[{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }]}
              />
            </div>
            <Toggle checked={linkedin.emojis} onChange={(v) => setLinkedin({ ...linkedin, emojis: v })} label="Emojis" />
          </div>
          <p className="estimate">Output: {n} LinkedIn post{n === 1 ? '' : 's'} ending with your CTA</p>
        </AgentBrief>
      </div>

      <div className="stage-foot">
        <button type="button" className="btn btn-ghost" onClick={onBack}><Icon name="arrowLeft" size={15} /> Change stories</button>
        <button type="button" className="btn btn-primary btn-lg" disabled={!canLaunch} onClick={onLaunch}>
          <Icon name="sparkles" size={16} /> Deploy agents
        </button>
      </div>
    </div>
  )
}
