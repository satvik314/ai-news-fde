# Agentic Newsroom: AI news → content, with agents

A Vite + React app where three AI agents and a human editor turn the latest AI news into ready-to-post Twitter/X threads and LinkedIn posts.

```
 🔎 Research Agent  ──▶  🧑‍💼 You (approve ≤3)  ──▶  𝕏 Twitter Agent
   (SerpAPI + OpenAI)                             └─▶  in LinkedIn Agent
```

## How it works

| Step | Who | What happens |
|------|-----|--------------|
| 1 | **Research Agent** | Runs an autonomous tool-calling loop. It plans its own Google News searches (via SerpAPI), reads the results, follows up on leads, merges duplicates, and submits the **top 5 stories**. Each story has a summary, why it matters, a content angle, and a hype score. |
| 2 | **You (human in the loop)** | Pick **up to 3** stories to approve. |
| 3 | **Brief the agents** | The **Twitter Agent** asks how many threads per story and how many tweets per thread (plus tone, numbering, emojis, hashtags and your handle). The **LinkedIn Agent** asks for the **CTA link** to put at the end of the post (plus CTA line, tone and length). |
| 4 | **Twitter + LinkedIn Agents** | Write content for every approved story in parallel. You can copy single tweets, whole threads or posts, regenerate any piece, or export everything to Markdown. |

Every agent step (reasoning, tool calls, hand-offs) streams into the **Agent activity** console on the right.

The app has **light and dark themes**. Use the sun / moon / monitor toggle in the top bar, which defaults to your system setting and remembers your choice.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173. In the sidebar, enter:

- **OpenAI API key**: https://platform.openai.com/api-keys
- **SerpAPI key**: https://serpapi.com/manage-api-key

The model defaults to `gpt-6.1-sol`. You can change it in the sidebar, and all three agents use the same model.

Keys stay in the browser. They are only saved to `localStorage` if you turn on **Remember keys**.

## SerpAPI and CORS

SerpAPI blocks direct browser requests, so the app calls `/api/serp`:

- **`npm run dev` / `npm run preview`**: Vite proxies `/api/serp` to `https://serpapi.com/search.json` (see `vite.config.js`).
- **Production**: `api/serp.js` is a serverless function that does the same job. Deploying to Vercel works with no extra configuration. On other hosts, point `/api/serp` at an equivalent proxy.

OpenAI calls go straight from the browser to `api.openai.com/v1/responses` (the Responses API) using the user's own key. Newer reasoning models such as `gpt-6.1-sol` only support function tools on the Responses API, so the research loop and the writers' structured output both use it.

## Project structure

```
src/
  lib/
    agents.js      # Research loop + Twitter + LinkedIn agents (prompts, tool schemas)
    openai.js      # Responses API client with tool calling / structured output
    theme.js       # Light / dark / system theme hook
    serp.js        # SerpAPI Google News search
  components/
    Sidebar.jsx    # API keys, model, research settings, agent roster
    Pipeline.jsx   # Live agent graph
    ResearchStage.jsx  # Agent 1 output + human approval
    BriefStage.jsx     # Writer agents' questions (threads/tweets, CTA link)
    ResultsStage.jsx   # Tweet threads, LinkedIn preview, copy/regenerate/export
    AgentConsole.jsx   # Streaming activity log
  App.jsx          # Orchestrator / state machine
api/serp.js        # Serverless SerpAPI proxy for production
```
