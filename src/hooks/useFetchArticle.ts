const CORS_PROXIES = [
  (u: string) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
]

const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-body',
  '.entry-content',
  '.content',
  '.article-content',
  '.post',
  '#content',
  '.prose',
  'td[width="435"]',
  'td[width=435]',
  'body > table td',
  'body > div',
]

function toAbsoluteUrl(baseUrl: string, href: string): string {
  if (!href || href.startsWith('#')) return href
  if (href.startsWith('http')) return href
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

function makeLinksAbsolute(html: string, baseUrl: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')
    if (href) a.setAttribute('href', toAbsoluteUrl(baseUrl, href))
  })
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src')
    if (src) img.setAttribute('src', toAbsoluteUrl(baseUrl, src))
  })
  return doc.body?.innerHTML || ''
}

function extractContent(html: string, url: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('script, style, nav, header, footer, aside, form, iframe').forEach((el) => el.remove())

  let best: { el: Element; len: number } | null = null

  for (const sel of CONTENT_SELECTORS) {
    const els = doc.querySelectorAll(sel)
    for (const el of Array.from(els)) {
      const text = el.textContent?.trim() || ''
      if (text.length > 200 && (!best || text.length > best.len)) {
        best = { el, len: text.length }
      }
    }
  }

  if (best) {
    return makeLinksAbsolute(best.el.innerHTML, url)
  }

  const body = doc.body
  if (!body) return ''

  const tables = body.querySelectorAll('table')
  for (const table of Array.from(tables)) {
    const text = table.textContent?.trim() || ''
    if (text.length > 300) {
      return makeLinksAbsolute(table.innerHTML, url)
    }
  }

  const text = body.textContent?.trim() || ''
  if (text.length > 200) {
    return makeLinksAbsolute(body.innerHTML, url)
  }

  return ''
}

export async function fetchArticleContent(url: string): Promise<string> {
  let lastError: Error | null = null

  for (const toProxyUrl of CORS_PROXIES) {
    try {
      const proxiedUrl = toProxyUrl(url)
      const res = await fetch(proxiedUrl)
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      let html = await res.text()

      if (html.trim().startsWith('{')) {
        const json = JSON.parse(html)
        if (json.contents) html = json.contents
        else if (json.error) throw new Error(json.error.message || json.error)
      }

      const content = extractContent(html, url)
      if (content) return content
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw new Error(lastError?.message ?? '无法抓取原文，请稍后重试或在新窗口打开')
}
