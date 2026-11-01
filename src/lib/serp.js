// SerpAPI Google News search. Requests go through /api/serp (Vite proxy in
// dev/preview, serverless function in production) because SerpAPI blocks CORS.
const TIME_FILTER = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m' }

export async function searchNews({ apiKey, query, timeRange = 'day', num = 10, signal }) {
  const params = new URLSearchParams({
    engine: 'google',
    tbm: 'nws',
    q: query,
    tbs: TIME_FILTER[timeRange] || TIME_FILTER.day,
    num: String(num),
    hl: 'en',
    gl: 'us',
    api_key: apiKey,
  })
  const res = await fetch(`/api/serp?${params}`, { signal })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error || `SerpAPI request failed (HTTP ${res.status})`)
  }
  return (data.news_results || []).slice(0, num).map((r) => ({
    title: r.title,
    source: typeof r.source === 'object' ? r.source?.name : r.source,
    date: r.date,
    link: r.link,
    snippet: r.snippet,
  }))
}
