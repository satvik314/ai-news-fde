import { AGENTS, AgentAvatar } from './ui.jsx'

const STATUS_LABEL = {
  idle: 'Idle',
  running: 'Working…',
  waiting: 'Waiting for you',
  done: 'Done',
  error: 'Error',
  off: 'Disabled',
}

function Node({ id, status, detail }) {
  return (
    <div className={`pipe-node ${status}`} style={{ '--agent': AGENTS[id].color }}>
      <AgentAvatar agent={id} size={34} pulse={status === 'running' || status === 'waiting'} />
      <div className="pipe-node-text">
        <strong>{AGENTS[id].name}</strong>
        <span>{detail || STATUS_LABEL[status]}</span>
      </div>
    </div>
  )
}

function Edge({ active, done }) {
  return <div className={`pipe-edge ${active ? 'active' : ''} ${done ? 'done' : ''}`}><span /></div>
}

export default function Pipeline({ status, details }) {
  const writersActive = status.twitter === 'running' || status.linkedin === 'running'
  const writersDone = ['done', 'off'].includes(status.twitter) && ['done', 'off'].includes(status.linkedin)
  return (
    <div className="pipeline">
      <Node id="research" status={status.research} detail={details.research} />
      <Edge active={status.research === 'done' && status.human === 'waiting'} done={status.human === 'done'} />
      <Node id="human" status={status.human} detail={details.human} />
      <Edge active={writersActive} done={writersDone && status.human === 'done'} />
      <div className="pipe-fork">
        <Node id="twitter" status={status.twitter} detail={details.twitter} />
        <Node id="linkedin" status={status.linkedin} detail={details.linkedin} />
      </div>
    </div>
  )
}
