// Minimal OpenAI Responses API client (POST /v1/responses) that runs in the
// browser with the user's own key. Newer reasoning models (e.g. gpt-6.1-sol)
// only support function tools on the Responses API, so all agents use it:
// the research agent for its search loop, the writer agents for structured output.
const RESPONSES_URL = 'https://api.openai.com/v1/responses'

/**
 * @returns {{ output: object[], text: string, functionCalls: {call_id: string, name: string, arguments: string}[] }}
 */
export async function createResponse({ apiKey, model, instructions, input, tools, toolChoice, signal }) {
  const body = { model, input }
  if (instructions) body.instructions = instructions
  if (tools?.length) {
    // strict:false because our schemas use optional fields (strict defaults to true here).
    body.tools = tools.map((fn) => ({ type: 'function', strict: false, ...fn }))
    body.tool_choice = toolChoice ?? 'auto'
  }

  const res = await fetch(RESPONSES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed (HTTP ${res.status})`)
  }
  if (data.status === 'failed') {
    throw new Error(data.error?.message || 'OpenAI response failed')
  }

  const output = Array.isArray(data.output) ? data.output : []
  const text = output
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('\n')
  const functionCalls = output.filter((item) => item.type === 'function_call')
  return { output, text, functionCalls }
}

export function forceTool(name) {
  return { type: 'function', name }
}

/** Ask the model to answer by calling exactly one tool, and return its parsed arguments. */
export async function structuredCall({ apiKey, model, system, user, tool, signal }) {
  const { functionCalls, text } = await createResponse({
    apiKey,
    model,
    instructions: system,
    input: [{ role: 'user', content: user }],
    tools: [tool],
    toolChoice: forceTool(tool.name),
    signal,
  })
  const call = functionCalls.find((c) => c.name === tool.name)
  if (call) return parseJson(call.arguments)
  return parseJson(text)
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
