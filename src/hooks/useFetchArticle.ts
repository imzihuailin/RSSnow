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

/** 移除正文中的首个 h1，避免与 RSS 标题重复 */
function stripFirstH1(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstH1 = doc.body?.querySelector('h1')
  if (firstH1) firstH1.remove()
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
    const html = makeLinksAbsolute(best.el.innerHTML, url)
    return stripFirstH1(html)
  }

  const body = doc.body
  if (!body) return ''

  const tables = body.querySelectorAll('table')
  for (const table of Array.from(tables)) {
    const text = table.textContent?.trim() || ''
    if (text.length > 300) {
      const html = makeLinksAbsolute(table.innerHTML, url)
      return stripFirstH1(html)
    }
  }

  const text = body.textContent?.trim() || ''
  if (text.length > 200) {
    const html = makeLinksAbsolute(body.innerHTML, url)
    return stripFirstH1(html)
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
