// Serverless proxy for SerpAPI (Vercel-style handler).
// The browser cannot call serpapi.com directly because of CORS, so the client
// sends its request here and we forward it. The user's own SerpAPI key travels
// with the request; nothing is stored server-side.
const ALLOWED_ENGINES = new Set(['google', 'google_news'])

export default async function handler(req, res) {
  const params = new URLSearchParams(req.query)
  if (!params.get('api_key')) {
    return res.status(400).json({ error: 'Missing SerpAPI key' })
  }
  if (!ALLOWED_ENGINES.has(params.get('engine') || 'google')) {
    return res.status(400).json({ error: 'Engine not allowed' })
  }
  try {
    const upstream = await fetch(`https://serpapi.com/search.json?${params}`)
    const body = await upstream.text()
    res.status(upstream.status).setHeader('content-type', 'application/json').send(body)
  } catch (err) {
    res.status(502).json({ error: `SerpAPI proxy failed: ${err.message}` })
  }
}
