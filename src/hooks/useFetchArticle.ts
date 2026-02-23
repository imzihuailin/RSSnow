import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { readResponseTextWithEmDashFix } from '../utils/textFix'

const CORS_PROXIES = [
  // r.jina.ai 对部分站点稳定性更好（返回精简正文/Markdown）
  { name: 'r.jina.ai', toProxyUrl: (u: string) => `https://r.jina.ai/http://${u.replace(/^https?:\/\//, '')}` },
  { name: 'api.cors.lol', toProxyUrl: (u: string) => `https://api.cors.lol/?url=${encodeURIComponent(u)}` },
  { name: 'corsproxy.io', toProxyUrl: (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { name: 'allorigins', toProxyUrl: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
]

const REQUEST_TIMEOUT_MS = 8000
const OVERALL_TIMEOUT_MS = 12000

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

function markdownToHtml(md: string, baseUrl: string): string {
  const rendered = marked.parse(md) as string
  const withAbsoluteLinks = makeLinksAbsolute(rendered, baseUrl)
  return DOMPurify.sanitize(withAbsoluteLinks, { USE_PROFILES: { html: true } })
}

/** 移除正文中的首个 h1，避免与 RSS 标题重复 */
function stripFirstH1(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const firstH1 = doc.body?.querySelector('h1')
  if (firstH1) firstH1.remove()
  return doc.body?.innerHTML || ''
}

/** 仅用于抓取原文结果：移除所有图片相关标签 */
function stripAllImages(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('img, picture, source').forEach((el) => el.remove())
  return doc.body?.innerHTML || ''
}

function countTextLength(el: Element): number {
  return (el.textContent || '').replace(/\s+/g, ' ').trim().length
}

function scoreContentCandidate(el: Element): number {
  const textLen = countTextLength(el)

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
  score -= Math.max(0, listItems - paragraphs * 2) * 25

  return score
}

function sanitizeForFallback(root: Element): void {
  root.querySelectorAll(NOISE_SELECTORS.join(', ')).forEach((el) => el.remove())
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
      if (!best || score > best.score) {
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
    if (!bestTable || score > bestTable.score) {
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
  if (text.length > 0 && /<[^>]+>/.test(bodyHtml)) {
    const html = makeLinksAbsolute(bodyHtml, url)
    return stripFirstH1(html)
  }

  return ''
}

function errorToMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

export async function fetchArticleContent(url: string, options?: { signal?: AbortSignal }): Promise<string> {
  const overallController = new AbortController()
  const externalSignal = options?.signal
  let timedOut = false
  let externallyAborted = false
  const startedAt = Date.now()

  const onExternalAbort = () => {
    externallyAborted = true
    overallController.abort(externalSignal?.reason)
  }

  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }

  const overallTimeoutId = setTimeout(() => {
    timedOut = true
    overallController.abort()
  }, OVERALL_TIMEOUT_MS)

  const runSingleProxy = async (proxy: { name: string; toProxyUrl: (u: string) => string }): Promise<string> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const proxyStartedAt = Date.now()
    const onOverallAbort = () => controller.abort()
    overallController.signal.addEventListener('abort', onOverallAbort, { once: true })
    try {
      const proxiedUrl = proxy.toProxyUrl(url)
      const res = await fetch(proxiedUrl, { signal: controller.signal })
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      let html = await readResponseTextWithEmDashFix(res)

      if (html.trim().startsWith('{')) {
        const json = JSON.parse(html)
        if (json.contents) html = json.contents
        else if (json.error) throw new Error(json.error.message || json.error)
      }

      const markdownPayload = extractMarkdownPayload(html)
      if (markdownPayload) {
        const markdownHtml = stripFirstH1(markdownToHtml(markdownPayload, url))
        return stripAllImages(markdownHtml)
      }

      const content = extractContent(html, url)
      if (content) {
        console.info('[fetchArticleContent] proxy_success', {
          proxy: proxy.name,
          durationMs: Date.now() - proxyStartedAt,
        })
        return stripAllImages(content)
      }
      throw new Error('未提取到正文')
    } catch (err) {
      const reason = errorToMessage(err)
      console.warn('[fetchArticleContent] proxy_failed', {
        proxy: proxy.name,
        durationMs: Date.now() - proxyStartedAt,
        reason,
      })
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (externallyAborted) throw new Error('请求已取消')
        if (timedOut) throw new Error(`抓取超时（>${OVERALL_TIMEOUT_MS}ms）`)
        throw new Error(`请求超时（>${REQUEST_TIMEOUT_MS}ms）`)
      }
      throw err instanceof Error ? err : new Error(String(err))
    } finally {
      clearTimeout(timeoutId)
      overallController.signal.removeEventListener('abort', onOverallAbort)
    }
  }

  try {
    // 并行请求多个代理，谁先拿到有效正文就直接返回
    const content = await Promise.any(CORS_PROXIES.map((proxy) => runSingleProxy(proxy)))
    console.info('[fetchArticleContent] fetch_success', {
      durationMs: Date.now() - startedAt,
    })
    return content
  } catch (err) {
    if (externallyAborted) throw new Error('请求已取消')
    if (timedOut) throw new Error('抓取超时，请点击下方在新窗口打开原文')
    if (err instanceof AggregateError) {
      const first = err.errors?.[0]
      const msg = first instanceof Error ? first.message : '无法抓取原文'
      console.warn('[fetchArticleContent] fetch_failed', {
        durationMs: Date.now() - startedAt,
        reason: msg,
      })
      throw new Error(`${msg}。可在新窗口打开原文查看。`)
    }
    console.warn('[fetchArticleContent] fetch_failed', {
      durationMs: Date.now() - startedAt,
      reason: errorToMessage(err),
    })
    throw new Error('无法抓取原文，请稍后重试或在新窗口打开')
  } finally {
    clearTimeout(overallTimeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }
}
