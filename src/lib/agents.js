import { createResponse, forceTool, parseJson, structuredCall } from './openai.js'
import { searchNews } from './serp.js'

const today = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const TIME_LABEL = { day: 'the last 24 hours', week: 'the last 7 days', month: 'the last 30 days' }

/* ------------------------------------------------------------------ */
/* Agent 1 · Research Agent                                            */
/* An autonomous tool-calling loop: the model decides what to search,  */
/* reads the results, searches again, then submits the top 5 stories.  */
/* ------------------------------------------------------------------ */

const SEARCH_TOOL = {
  name: 'search_news',
  description:
    'Search Google News (via SerpAPI) for recent articles. Returns titles, sources, dates, links and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'A focused news search query, e.g. "OpenAI new model launch"' },
      time_range: { type: 'string', enum: ['day', 'week', 'month'], description: 'How far back to search' },
    },
    required: ['query'],
  },
}

const STORY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Clear, specific headline (rewrite clickbait into plain facts)' },
    summary: { type: 'string', description: '2-3 sentence factual summary of what happened' },
    why_it_matters: { type: 'string', description: 'One sentence on why builders / professionals should care' },
    content_angle: { type: 'string', description: 'A sharp angle a creator could take when posting about this' },
    category: {
      type: 'string',
      enum: ['Model Launch', 'Product', 'Funding', 'Research', 'Policy', 'Open Source', 'Big Tech', 'Industry'],
    },
    hype_score: { type: 'integer', description: '1-10: how much attention this will get on social media' },
    source: { type: 'string', description: 'Publication name' },
    url: { type: 'string', description: 'Link to the best source article (must come from search results)' },
    published: { type: 'string', description: 'Publication date/time as shown in search results' },
  },
  required: ['title', 'summary', 'why_it_matters', 'content_angle', 'category', 'hype_score', 'source', 'url', 'published'],
}

const SUBMIT_STORIES_TOOL = {
  name: 'submit_top_stories',
  description: 'Submit the final ranked list of exactly 5 top AI news stories. Call this once research is complete.',
  parameters: {
    type: 'object',
    properties: { stories: { type: 'array', items: STORY_SCHEMA, description: 'Exactly 5 stories, best first' } },
    required: ['stories'],
  },
}

const MAX_RESEARCH_STEPS = 7

export async function runResearchAgent({ openaiKey, serpKey, model, timeRange, focus, onLog, signal }) {
  const log = (type, text, meta) => onLog?.({ agent: 'research', type, text, meta })
  const seen = new Map()
  let lastSearchError = ''

  const system = `You are the Research Agent in an AI newsroom. Today is ${today()}.
Your job: find the 5 most important, most post-worthy AI news stories from ${TIME_LABEL[timeRange] || TIME_LABEL.day}.

How to work:
1. Use the search_news tool 3-6 times with varied, specific queries. Cover different beats: frontier model launches (OpenAI, Anthropic, Google, Meta, xAI, Mistral, DeepSeek...), AI products & agents, funding/M&A, research breakthroughs, open-source releases, policy/regulation, chips & infrastructure.
2. You may issue several searches in parallel. Follow up on promising leads with more targeted queries.
3. Merge duplicates (the same event reported by several outlets is ONE story; pick the most authoritative source).
4. Rank by: genuine significance, freshness, and how much a tech audience will want to talk about it. Avoid listicles, opinion pieces, stock-tip articles and stale news.
5. Only use facts and URLs that appear in your search results. Never invent links.
6. Finish by calling submit_top_stories with exactly 5 stories.${focus ? `\n\nThe editor asked you to pay special attention to: ${focus}` : ''}`

  // Conversation state for the Responses API: user input, then every output
  // item the model produced (reasoning, function calls) and our tool results.
  const input = [
    { role: 'user', content: 'Research the latest AI news and bring me the top 5 stories worth creating content about.' },
  ]

  log('start', 'Research Agent online. Planning search strategy…')

  for (let step = 0; step < MAX_RESEARCH_STEPS; step++) {
    const isLast = step === MAX_RESEARCH_STEPS - 1
    const reply = await createResponse({
      apiKey: openaiKey,
      model,
      instructions: system,
      input,
      tools: [SEARCH_TOOL, SUBMIT_STORIES_TOOL],
      toolChoice: isLast ? forceTool(SUBMIT_STORIES_TOOL.name) : 'auto',
      signal,
    })

    input.push(...reply.output)
    if (reply.text.trim()) log('thought', reply.text.trim().slice(0, 280))
    const calls = reply.functionCalls

    const submit = calls.find((c) => c.name === SUBMIT_STORIES_TOOL.name)
    if (submit) {
      const { stories = [] } = parseJson(submit.arguments)
      if (!stories.length) throw new Error('Research Agent submitted no stories')
      const ranked = stories.slice(0, 5).map((s, i) => ({ ...s, id: `story-${Date.now()}-${i}`, rank: i + 1 }))
      log('done', `Ranked top ${ranked.length} stories from ${seen.size} articles scanned.`)
      return { stories: ranked, articlesScanned: seen.size }
    }

    if (!calls.length) {
      input.push({ role: 'user', content: 'Now call submit_top_stories with exactly 5 stories.' })
      continue
    }

    const toolResults = await Promise.all(
      calls.map(async (call) => {
        let output
        try {
          const args = parseJson(call.arguments)
          const range = args.time_range || timeRange
          log('tool', `search_news("${args.query}")`, { range })
          const results = await searchNews({ apiKey: serpKey, query: args.query, timeRange: range, signal })
          results.forEach((r) => r.link && seen.set(r.link, r))
          log('result', `${results.length} articles for "${args.query}"`)
          output = results.length ? results : { note: 'No results. Try a broader query or a wider time range.' }
        } catch (err) {
          if (err.name === 'AbortError') throw err
          log('error', `Search failed: ${err.message}`)
          lastSearchError = err.message
          output = { error: err.message }
        }
        return { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) }
      }),
    )
    input.push(...toolResults)
    // Don't let the agent "research" with zero data — fail fast on a bad key / quota.
    if (seen.size === 0 && lastSearchError) {
      throw new Error(`SerpAPI search failed: ${lastSearchError}. Check your SerpAPI key and quota.`)
    }
    log('think', `Reviewing ${seen.size} articles so far…`)
  }

  throw new Error('Research Agent ran out of steps before submitting stories')
}

/* ------------------------------------------------------------------ */
/* Agent 2 · Twitter / X Agent                                          */
/* ------------------------------------------------------------------ */

const THREADS_TOOL = {
  name: 'submit_tweet_threads',
  description: 'Submit the finished tweet threads.',
  parameters: {
    type: 'object',
    properties: {
      threads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            angle: { type: 'string', description: 'Short label for the angle this thread takes' },
            tweets: { type: 'array', items: { type: 'string' }, description: 'Tweets in order, each ≤ 280 characters' },
          },
          required: ['angle', 'tweets'],
        },
      },
    },
    required: ['threads'],
  },
}

export async function runTwitterAgent({ openaiKey, model, story, settings, signal }) {
  const { threadsCount, tweetsPerThread, tone, emojis, hashtags, numbering, handle } = settings

  const system = `You are the Twitter/X Agent in an AI newsroom: an elite ghostwriter for tech creators.
Write tweet threads that stop the scroll and teach something.

Rules:
- Write exactly ${threadsCount} thread(s). Each thread has exactly ${tweetsPerThread} tweets.
- Each thread must take a DIFFERENT angle (e.g. breaking-news explainer, "what this means for builders", contrarian take, practical use-cases).
- Tweet 1 is the hook: specific, curiosity-driving, no throat-clearing. It must work on its own.
- Every tweet must be under 280 characters (aim for 200-260). Use line breaks for rhythm.
- Concrete over vague: names, numbers, dates, comparisons. Only use facts from the story; never invent stats.
- Banned phrases: "game-changer", "revolutionary", "buckle up", "let's dive in", "in today's fast-paced world", "unlock".
- Tone: ${tone}.
- ${emojis ? 'Use emojis sparingly (max 1 per tweet) where they add meaning.' : 'Do not use emojis.'}
- ${hashtags ? 'Add 1-2 relevant hashtags only in the final tweet.' : 'Do not use hashtags.'}
- ${numbering ? 'Prefix each tweet with its position like "1/", "2/" …' : 'Do not number the tweets.'}
- The final tweet wraps up with a takeaway${handle ? ` and invites readers to follow ${handle} for more AI news` : ' and a question or prompt to engage'}.
- Include the source link in the last tweet.`

  const user = `Story to write about:
Title: ${story.title}
Summary: ${story.summary}
Why it matters: ${story.why_it_matters}
Suggested angle: ${story.content_angle}
Source: ${story.source} — ${story.url}`

  const out = await structuredCall({ apiKey: openaiKey, model, system, user, tool: THREADS_TOOL, signal })
  if (!out?.threads?.length) throw new Error('Twitter Agent returned no threads')
  return out
}

/* ------------------------------------------------------------------ */
/* Agent 3 · LinkedIn Agent                                             */
/* ------------------------------------------------------------------ */

const LINKEDIN_TOOL = {
  name: 'submit_linkedin_post',
  description: 'Submit the finished LinkedIn post.',
  parameters: {
    type: 'object',
    properties: {
      post: { type: 'string', description: 'The full post text, ready to paste into LinkedIn, ending with the CTA and link' },
      hook_variants: {
        type: 'array',
        items: { type: 'string' },
        description: '2 alternative opening lines the author could A/B test',
      },
    },
    required: ['post', 'hook_variants'],
  },
}

const LENGTH_GUIDE = { short: '120-160 words', medium: '180-250 words', long: '280-350 words' }

export async function runLinkedInAgent({ openaiKey, model, story, settings, signal }) {
  const { ctaUrl, ctaText, tone, length, emojis } = settings

  const system = `You are the LinkedIn Agent in an AI newsroom: you write high-performing LinkedIn posts for founders and AI educators.

Rules:
- Length: ${LENGTH_GUIDE[length] || LENGTH_GUIDE.medium}.
- First 2 lines are the hook (they show before "…see more"): bold claim, surprising fact, or tension. No "I'm excited to share".
- Short paragraphs (1-2 lines), generous white space. Use a scannable list (→ or •) for the key points.
- Explain what happened, why it matters for professionals/builders, and one practical takeaway.
- Only use facts from the story. Never invent statistics or quotes.
- Tone: ${tone}.
- ${emojis ? 'Light emoji use is fine (max 3 in the whole post).' : 'Do not use emojis.'}
- Add 3-5 relevant hashtags on the last line before the CTA.
- END the post with this call-to-action on its own line(s): ${ctaText ? `"${ctaText}"` : 'a short, natural CTA sentence'} followed by the exact link ${ctaUrl}
- Plain text only: no markdown, no asterisks, no headings.`

  const user = `Story to write about:
Title: ${story.title}
Summary: ${story.summary}
Why it matters: ${story.why_it_matters}
Suggested angle: ${story.content_angle}
Source: ${story.source}`

  const out = await structuredCall({ apiKey: openaiKey, model, system, user, tool: LINKEDIN_TOOL, signal })
  if (!out?.post) throw new Error('LinkedIn Agent returned no post')
  // Guarantee the CTA link is present even if the model forgot it.
  if (ctaUrl && !out.post.includes(ctaUrl)) {
    out.post = `${out.post.trim()}\n\n${ctaText ? `${ctaText}\n` : ''}${ctaUrl}`
  }
  return out
}
