// Minimal OpenAI Chat Completions client that runs in the browser with the
// user's own key. Tool calling is used both for the research agent's search
// loop and for structured (JSON) output from the writer agents.
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export async function chatCompletion({ apiKey, model, messages, tools, toolChoice, signal }) {
  const body = { model, messages }
  if (tools?.length) {
    body.tools = tools.map((fn) => ({ type: 'function', function: fn }))
    body.tool_choice = toolChoice ?? 'auto'
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed (HTTP ${res.status})`)
  }
  const message = data?.choices?.[0]?.message
  if (!message) throw new Error('OpenAI returned an empty response')
  return message
}

export function forceTool(name) {
  return { type: 'function', function: { name } }
}

/** Ask the model to answer by calling exactly one tool, and return its parsed arguments. */
export async function structuredCall({ apiKey, model, system, user, tool, signal }) {
  const message = await chatCompletion({
    apiKey,
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    tools: [tool],
    toolChoice: forceTool(tool.name),
    signal,
  })
  const call = message.tool_calls?.find((c) => c.function?.name === tool.name)
  if (call) return parseJson(call.function.arguments)
  return parseJson(message.content)
}

export function parseJson(text) {
  if (!text) throw new Error('Model returned no content')
  try {
    return JSON.parse(text)
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse the model output as JSON')
  }
}
