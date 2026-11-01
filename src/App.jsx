import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Pipeline from './components/Pipeline.jsx'
import AgentConsole from './components/AgentConsole.jsx'
import ResearchStage, { MAX_SELECTED } from './components/ResearchStage.jsx'
import BriefStage from './components/BriefStage.jsx'
import ResultsStage from './components/ResultsStage.jsx'
import { runLinkedInAgent, runResearchAgent, runTwitterAgent } from './lib/agents.js'
import { Icon, ThemeToggle } from './components/ui.jsx'
import { useTheme } from './lib/theme.js'

const STORAGE_KEY = 'agentic-newsroom:config'
const DEFAULT_MODEL = 'gpt-6.1-sol'

function loadConfig() {
  const defaults = { openaiKey: '', serpKey: '', remember: false, model: DEFAULT_MODEL, timeRange: 'day', focus: '' }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return defaults
  }
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
let logId = 0

export default function App() {
  const [config, setConfig] = useState(loadConfig)
  const [theme, setTheme] = useTheme()
  const [stage, setStage] = useState('research') // research → brief → results
  const [research, setResearch] = useState({ status: 'idle', stories: [], articlesScanned: 0, error: '' })
  const [selected, setSelected] = useState([])
  const [enabled, setEnabled] = useState({ twitter: true, linkedin: true })
  const [twitter, setTwitter] = useState({ threadsCount: 1, tweetsPerThread: 5, tone: 'Insightful', numbering: true, emojis: false, hashtags: false, handle: '' })
  const [linkedin, setLinkedin] = useState({ ctaUrl: '', ctaText: '', tone: 'Insightful', length: 'medium', emojis: true })
  const [outputs, setOutputs] = useState({})
  const [logs, setLogs] = useState([])
  const researchAbort = useRef(null)
  const writerAbort = useRef(null)

  useEffect(() => {
    const { openaiKey, serpKey, ...rest } = config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.remember ? config : rest))
  }, [config])

  const update = (patch) => setConfig((c) => ({ ...c, ...patch }))
  const addLog = useCallback((entry) => setLogs((l) => [...l, { id: ++logId, time: now(), type: 'info', ...entry }]), [])

  const keysReady = config.openaiKey.trim().length > 10 && config.serpKey.trim().length > 10 && config.model.trim()
  const approvedStories = research.stories.filter((s) => selected.includes(s.id))

  /* ---------------- Agent 1: research ---------------- */
  const runResearch = async () => {
    researchAbort.current?.abort()
    const controller = new AbortController()
    researchAbort.current = controller
    setStage('research')
    setSelected([])
    setOutputs({})
    setResearch({ status: 'running', stories: [], articlesScanned: 0, error: '' })
    try {
      const result = await runResearchAgent({
        openaiKey: config.openaiKey.trim(),
        serpKey: config.serpKey.trim(),
        model: config.model.trim(),
        timeRange: config.timeRange,
        focus: config.focus.trim(),
        onLog: addLog,
        signal: controller.signal,
      })
      setResearch({ status: 'done', ...result, error: '' })
      addLog({ agent: 'system', type: 'human', text: `Handing off to you: pick up to ${MAX_SELECTED} stories to approve.` })
    } catch (err) {
      if (err.name === 'AbortError') {
        addLog({ agent: 'research', type: 'error', text: 'Stopped by user.' })
        setResearch({ status: 'idle', stories: [], articlesScanned: 0, error: '' })
      } else {
        addLog({ agent: 'research', type: 'error', text: err.message })
        setResearch({ status: 'error', stories: [], articlesScanned: 0, error: err.message })
      }
    }
  }

  const toggleStory = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_SELECTED ? [...s, id] : s))

  const approve = () => {
    addLog({ agent: 'human', type: 'human', text: `Approved ${approvedStories.length} stor${approvedStories.length === 1 ? 'y' : 'ies'}: ${approvedStories.map((s) => `#${s.rank}`).join(', ')}` })
    addLog({ agent: 'system', type: 'info', text: 'Writer agents need a brief before they start.' })
    setStage('brief')
  }

  /* ---------------- Agents 2 & 3: writers ---------------- */
  const runWriter = useCallback(
    async (story, agent, signal) => {
      const label = agent === 'twitter' ? 'tweet threads' : 'LinkedIn post'
      setOutputs((o) => ({ ...o, [story.id]: { ...o[story.id], [agent]: { status: 'running' } } }))
      addLog({ agent, type: 'start', text: `Writing ${label} for #${story.rank} “${story.title.slice(0, 60)}${story.title.length > 60 ? '…' : ''}”` })
      try {
        const run = agent === 'twitter' ? runTwitterAgent : runLinkedInAgent
        const data = await run({
          openaiKey: config.openaiKey.trim(),
          model: config.model.trim(),
          story,
          settings: agent === 'twitter' ? twitter : { ...linkedin, ctaUrl: linkedin.ctaUrl.trim(), ctaText: linkedin.ctaText.trim() },
          signal,
        })
        setOutputs((o) => ({ ...o, [story.id]: { ...o[story.id], [agent]: { status: 'done', data } } }))
        const summary =
          agent === 'twitter'
            ? `${data.threads.length} thread(s), ${data.threads.reduce((n, t) => n + t.tweets.length, 0)} tweets`
            : `${data.post.split(/\s+/).length} words with CTA`
        addLog({ agent, type: 'done', text: `Finished #${story.rank}: ${summary}` })
      } catch (err) {
        if (err.name === 'AbortError') return
        setOutputs((o) => ({ ...o, [story.id]: { ...o[story.id], [agent]: { status: 'error', error: err.message } } }))
        addLog({ agent, type: 'error', text: `#${story.rank}: ${err.message}` })
      }
    },
    [config.openaiKey, config.model, twitter, linkedin, addLog],
  )

  const launchWriters = () => {
    writerAbort.current?.abort()
    const controller = new AbortController()
    writerAbort.current = controller
    setOutputs({})
    setStage('results')
    const crew = ['twitter', 'linkedin'].filter((a) => enabled[a])
    addLog({ agent: 'system', type: 'info', text: `Deploying ${crew.length} agent(s) across ${approvedStories.length} stor${approvedStories.length === 1 ? 'y' : 'ies'} in parallel.` })
    approvedStories.forEach((story) => crew.forEach((agent) => runWriter(story, agent, controller.signal)))
  }

  const retry = (story, agent) => runWriter(story, agent, writerAbort.current?.signal)

  const restart = () => {
    researchAbort.current?.abort()
    writerAbort.current?.abort()
    setStage('research')
    setSelected([])
    setOutputs({})
    setResearch({ status: 'idle', stories: [], articlesScanned: 0, error: '' })
    addLog({ agent: 'system', type: 'info', text: 'Started a new run.' })
  }

  /* ---------------- Pipeline status ---------------- */
  const { agentStatus, details } = useMemo(() => {
    const writer = (agent) => {
      if (stage === 'research') return { status: 'idle' }
      if (!enabled[agent]) return { status: 'off' }
      if (stage === 'brief') return { status: 'waiting', detail: 'Waiting for your brief' }
      const states = approvedStories.map((s) => outputs[s.id]?.[agent]?.status)
      const done = states.filter((s) => s === 'done').length
      if (states.includes('running')) return { status: 'running', detail: `Writing… ${done}/${states.length} done` }
      if (states.includes('error')) return { status: 'error', detail: `${done}/${states.length} done, some failed` }
      return { status: 'done', detail: `${done} piece${done === 1 ? '' : 's'} ready` }
    }
    const tw = writer('twitter')
    const li = writer('linkedin')
    const humanStatus = stage !== 'research' ? 'done' : research.status === 'done' ? 'waiting' : 'idle'
    return {
      agentStatus: { research: research.status, human: humanStatus, twitter: tw.status, linkedin: li.status },
      details: {
        research: research.status === 'done' ? `${research.stories.length} stories found` : undefined,
        human:
          humanStatus === 'waiting' ? `${selected.length}/${MAX_SELECTED} selected` : humanStatus === 'done' ? `${approvedStories.length} approved` : undefined,
        twitter: tw.detail,
        linkedin: li.detail,
      },
    }
  }, [stage, enabled, approvedStories, outputs, research, selected.length])

  const lastResearchLog = [...logs].reverse().find((l) => l.agent === 'research')?.text

  return (
    <div className="app">
      <Sidebar config={config} update={update} agentStatus={agentStatus} />
      <main className="main">
        <header className="topbar">
          <div>
            <h2>Content pipeline</h2>
            <p className="muted">Research → Human approval → Twitter & LinkedIn agents</p>
          </div>
          <div className="topbar-actions">
            <span className="model-pill mono"><Icon name="zap" size={12} /> {config.model || 'no model'}</span>
            <ThemeToggle value={theme} onChange={setTheme} />
          </div>
        </header>
        <Pipeline status={agentStatus} details={details} />

        {stage === 'research' && (
          <ResearchStage
            research={research}
            keysReady={keysReady}
            onRun={runResearch}
            onCancel={() => researchAbort.current?.abort()}
            selected={selected}
            onToggle={toggleStory}
            onApprove={approve}
            lastLog={lastResearchLog}
          />
        )}
        {stage === 'brief' && (
          <BriefStage
            stories={approvedStories}
            enabled={enabled}
            setEnabled={setEnabled}
            twitter={twitter}
            setTwitter={setTwitter}
            linkedin={linkedin}
            setLinkedin={setLinkedin}
            onBack={() => setStage('research')}
            onLaunch={launchWriters}
          />
        )}
        {stage === 'results' && (
          <ResultsStage
            stories={approvedStories}
            outputs={outputs}
            enabled={enabled}
            onRetry={retry}
            onRestart={restart}
            onBack={() => setStage('brief')}
          />
        )}
      </main>
      <AgentConsole logs={logs} onClear={() => setLogs([])} />
    </div>
  )
}
