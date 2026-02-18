const CORS_PROXIES = [
  // r.jina.ai 对部分站点稳定性更好（返回精简正文/Markdown）
  (u: string) => `https://r.jina.ai/http://${u.replace(/^https?:\/\//, '')}`,
  (u: string) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
]

const REQUEST_TIMEOUT_MS = 8000

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
  '.post-body',
  '.entry',
  '.article',
  'td[width="435"]',
]

const NOISE_SELECTORS = [
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'iframe',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.nav',
  '.navbar',
  '.navigation',
  '.menu',
  '.sidebar',
  '.breadcrumb',
  '.toc',
  '.table-of-contents',
  '#nav',
  '#menu',
  '#sidebar',
  '#toc',
]

const NEGATIVE_HINT_RE = /(nav|menu|sidebar|breadcrumb|toc|table-of-contents|目录|导航)/i
const SENTENCE_RE = /[。！？.!?]/g

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function extractMarkdownPayload(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (/<[a-z][\s\S]*>/i.test(text)) return null

  let content = text
  const marker = 'Markdown Content:'
  const markerIndex = content.indexOf(marker)
  if (markerIndex >= 0) content = content.slice(markerIndex + marker.length).trim()

  content = content
    .split('\n')
    .filter((line) => !/^(Title|URL Source|Published Time|Markdown Content)\s*:/i.test(line.trim()))
    .join('\n')
    .trim()

  if (!content) return null
  const looksMarkdown =
    /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m.test(content) ||
    markerIndex >= 0
  return looksMarkdown ? content : null
}

function renderMarkdownInline(text: string, baseUrl: string): string {
  const tokens: string[] = []
  const pushToken = (html: string) => {
    const key = `\u0000TOKEN_${tokens.length}\u0000`
    tokens.push(html)
    return key
  }

  let s = text
  s = s.replace(/`([^`]+)`/g, (_, code: string) => pushToken(`<code>${escapeHtml(code)}</code>`))
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, src: string) =>
    pushToken(
      `<img src="${escapeHtml(toAbsoluteUrl(baseUrl, src.trim()))}" alt="${escapeHtml(alt.trim())}" />`
    )
  )
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) =>
    pushToken(
      `<a href="${escapeHtml(toAbsoluteUrl(baseUrl, href.trim()))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        label.trim()
      )}</a>`
    )
  )

  s = escapeHtml(s)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  for (let i = 0; i < tokens.length; i += 1) {
    s = s.replace(new RegExp(`\\u0000TOKEN_${i}\\u0000`, 'g'), tokens[i])
  }
  return s
}

function markdownToHtml(md: string, baseUrl: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      closeLists()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      closeLists()
      const level = heading[1].length
      out.push(`<h${level}>${renderMarkdownInline(heading[2], baseUrl)}</h${level}>`)
      continue
    }

    const ul = line.match(/^[-*+]\s+(.+)$/)
    if (ul) {
      if (inOl) {
        out.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        out.push('<ul>')
        inUl = true
      }
      out.push(`<li>${renderMarkdownInline(ul[1], baseUrl)}</li>`)
      continue
    }

    const ol = line.match(/^\d+\.\s+(.+)$/)
    if (ol) {
      if (inUl) {
        out.push('</ul>')
        inUl = false
      }
      if (!inOl) {
        out.push('<ol>')
        inOl = true
      }
      out.push(`<li>${renderMarkdownInline(ol[1], baseUrl)}</li>`)
      continue
    }

    closeLists()
    out.push(`<p>${renderMarkdownInline(line, baseUrl)}</p>`)
  }

  closeLists()
  return out.join('\n')
}

/** 移除正文中的首个 h1，避免与 RSS 标题重复 */
function stripFirstH1(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstH1 = doc.body?.querySelector('h1')
  if (firstH1) firstH1.remove()
  return doc.body?.innerHTML || ''
}

function countTextLength(el: Element): number {
  return (el.textContent || '').replace(/\s+/g, ' ').trim().length
}

function calcLinkDensity(el: Element, textLen: number): number {
  if (textLen <= 0) return 1
  let linkTextLen = 0
  el.querySelectorAll('a').forEach((a) => {
    linkTextLen += ((a.textContent || '').replace(/\s+/g, ' ').trim().length)
  })
  return linkTextLen / textLen
}

function getClassIdToken(el: Element): string {
  return `${el.id || ''} ${el.getAttribute('class') || ''}`.toLowerCase()
}

function isLikelyNavigationBlock(el: Element, textLen?: number, linkDensity?: number): boolean {
  const contentLen = textLen ?? countTextLength(el)
  if (contentLen === 0) return true
  const density = linkDensity ?? calcLinkDensity(el, contentLen)
  const links = el.querySelectorAll('a').length
  const listItems = el.querySelectorAll('li').length
  const classId = getClassIdToken(el)
  const text = (el.textContent || '').slice(0, 300).toLowerCase()

  if (NEGATIVE_HINT_RE.test(classId)) return true
  if (NEGATIVE_HINT_RE.test(text) && links >= 4) return true
  if (density > 0.5 && links >= 5) return true
  if (listItems >= 6 && links >= Math.ceil(listItems * 0.7)) return true
  if (contentLen < 500 && density > 0.35 && links >= 3) return true
  return false
}

function scoreContentCandidate(el: Element): number {
  const textLen = countTextLength(el)
  if (textLen < 200) return Number.NEGATIVE_INFINITY

  const linkDensity = calcLinkDensity(el, textLen)
  if (isLikelyNavigationBlock(el, textLen, linkDensity)) return Number.NEGATIVE_INFINITY

  const paragraphs = el.querySelectorAll('p').length
  const headings = el.querySelectorAll('h2, h3, h4').length
  const images = el.querySelectorAll('img').length
  const listItems = el.querySelectorAll('li').length
  const sentenceCount = ((el.textContent || '').match(SENTENCE_RE) || []).length

  let score = textLen
  score += paragraphs * 80
  score += Math.min(sentenceCount, 40) * 30
  score += headings * 40
  score += images * 25
  score -= linkDensity * 1800
  score -= Math.max(0, listItems - paragraphs * 2) * 25

  return score
}

function sanitizeForFallback(root: Element): void {
  root.querySelectorAll(NOISE_SELECTORS.join(', ')).forEach((el) => el.remove())
  root.querySelectorAll('section, div, ul, ol, table').forEach((el) => {
    if (isLikelyNavigationBlock(el)) el.remove()
  })
}

function extractContent(html: string, url: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll(NOISE_SELECTORS.join(', ')).forEach((el) => el.remove())

  let best: { el: Element; score: number } | null = null

  for (const sel of CONTENT_SELECTORS) {
    const els = doc.querySelectorAll(sel)
    for (const el of Array.from(els)) {
      if (el.closest('nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]')) continue
      const score = scoreContentCandidate(el)
      if (score !== Number.NEGATIVE_INFINITY && (!best || score > best.score)) {
        best = { el, score }
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
  let bestTable: { el: Element; score: number } | null = null
  for (const table of Array.from(tables)) {
    const score = scoreContentCandidate(table)
    if (score !== Number.NEGATIVE_INFINITY && (!bestTable || score > bestTable.score)) {
      bestTable = { el: table, score }
    }
  }
  if (bestTable) {
    const html = makeLinksAbsolute(bestTable.el.innerHTML, url)
    return stripFirstH1(html)
  }

  const bodyClone = body.cloneNode(true) as HTMLElement
  sanitizeForFallback(bodyClone)
  const text = bodyClone.textContent?.trim() || ''
  const bodyHtml = bodyClone.innerHTML || ''
  // 仅当 body 本身包含结构化标签时，才走 HTML 兜底；纯文本交给 Markdown/文本转换逻辑
  if (text.length > 200 && /<[^>]+>/.test(bodyHtml)) {
    if (isLikelyNavigationBlock(bodyClone, text.length, calcLinkDensity(bodyClone, text.length))) return ''
    const html = makeLinksAbsolute(bodyHtml, url)
    return stripFirstH1(html)
  }

  return ''
}

export async function fetchArticleContent(url: string): Promise<string> {
  const runSingleProxy = async (toProxyUrl: (u: string) => string): Promise<string> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const proxiedUrl = toProxyUrl(url)
      const res = await fetch(proxiedUrl, { signal: controller.signal })
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      let html = await res.text()

      if (html.trim().startsWith('{')) {
        const json = JSON.parse(html)
        if (json.contents) html = json.contents
        else if (json.error) throw new Error(json.error.message || json.error)
      }

      const markdownPayload = extractMarkdownPayload(html)
      if (markdownPayload) return stripFirstH1(markdownToHtml(markdownPayload, url))
      const content = extractContent(html, url)
      if (content) return content
      throw new Error('未提取到正文')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`请求超时（>${REQUEST_TIMEOUT_MS}ms）`)
      }
      throw err instanceof Error ? err : new Error(String(err))
    } finally {
      clearTimeout(timeoutId)
    }
  }

  try {
    // 并行请求多个代理，谁先拿到有效正文就直接返回
    return await Promise.any(CORS_PROXIES.map((toProxyUrl) => runSingleProxy(toProxyUrl)))
  } catch (err) {
    if (err instanceof AggregateError) {
      const first = err.errors?.[0]
      const msg = first instanceof Error ? first.message : '无法抓取原文'
      throw new Error(`${msg}。可在新窗口打开原文查看。`)
    }
    throw new Error('无法抓取原文，请稍后重试或在新窗口打开')
  }
}
