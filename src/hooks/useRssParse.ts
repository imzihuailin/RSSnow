import type { Article } from '../utils/storage'
import { readResponseTextWithEmDashFix } from '../utils/textFix'

const CORS_PROXIES = [
  (u: string) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
]

function scoreContentCandidate(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const textLen = trimmed.replace(/\s+/g, ' ').length
  const hasHtml = /<[^>]+>/.test(trimmed)
  return textLen + (hasHtml ? 300 : 0)
}

function pickBestContent(candidates: string[]): string {
  let best = ''
  let bestScore = 0
  for (const value of candidates) {
    const score = scoreContentCandidate(value)
    if (score > bestScore) {
      best = value.trim()
      bestScore = score
    }
  }
  return best
}

function parseItem(el: Element, index: number): Article {
  const getText = (sel: string) => el.querySelector(sel)?.textContent?.trim() || ''
  const getLink = () => {
    const linkEl = el.querySelector('link')
    const href = el.querySelector('link[href]')
    return href?.getAttribute('href') || linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || ''
  }
  const getContent = () => {
    const childEls = Array.from(el.children)
    const byName = (names: string[]) =>
      childEls.filter((c) => {
        const fullName = String(c.tagName || '').toLowerCase()
        const localName = String(c.localName || '').toLowerCase()
        return names.includes(fullName) || names.includes(localName)
      })

    const contentCandidates = [
      ...byName(['content:encoded', 'encoded', 'content', 'description', 'summary']),
      ...childEls.filter((c) => String(c.tagName || '').toLowerCase().includes('encoded')),
    ]

    const candidates: string[] = []
    for (const node of contentCandidates) {
      if (node.innerHTML) candidates.push(node.innerHTML)
      const text = node.textContent?.trim()
      if (text) candidates.push(text)
    }

    return pickBestContent(candidates)
  }
  const getDate = () => {
    const pub = el.querySelector('pubDate')
    const updated = el.querySelector('updated')
    const dcDate = el.querySelector('dc\\:date')
    return pub?.textContent?.trim() || updated?.textContent?.trim() || dcDate?.textContent?.trim() || ''
  }

  const link = getLink()
  const pubDate = getDate()
  const pathPart = link.split('/').filter(Boolean).pop()?.replace(/[^a-zA-Z0-9-_]/g, '_') || String(index)
  return {
    id: `article_${index}_${pathPart}`,
    title: getText('title'),
    link,
    pubDate,
    content: getContent() || undefined,
    description: el.querySelector('description')?.textContent?.trim() || undefined,
  }
}

function parseFeedWithArticles(xmlText: string): {
  title: string
  link: string
  description?: string
  articles: Article[]
} {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('RSS 格式解析失败')
  }

  let title = ''
  let link = ''
  let description = ''

  const channel = doc.querySelector('channel')
  const feed = doc.querySelector('feed')

  if (channel) {
    title = channel.querySelector('title')?.textContent?.trim() || ''
    const linkEl = channel.querySelector('link')
    link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || ''
    description = channel.querySelector('description')?.textContent?.trim() || ''
    const items = Array.from(channel.querySelectorAll('item'))
    const articles = items.map((el, i) => parseItem(el, i))
    return {
      title: title || '未命名订阅',
      link: link || '',
      description: description || undefined,
      articles,
    }
  }

  if (feed) {
    title = feed.querySelector('title')?.textContent?.trim() || ''
    const linkEl = feed.querySelector('link[href]')
    link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || ''
    description =
      feed.querySelector('subtitle')?.textContent?.trim() ||
      feed.querySelector('description')?.textContent?.trim() ||
      ''
    const entries = Array.from(feed.querySelectorAll('entry'))
    const articles = entries.map((el, i) => {
      const getText = (sel: string) => el.querySelector(sel)?.textContent?.trim() || ''
      const linkHref = el.querySelector('link[href]')?.getAttribute('href') ||
        el.querySelector('link')?.textContent?.trim() || ''
      const contentEls = Array.from(el.querySelectorAll('content, summary'))
      const contentCandidates = contentEls.flatMap((node) => {
        const values: string[] = []
        if (node.innerHTML) values.push(node.innerHTML)
        const text = node.textContent?.trim()
        if (text) values.push(text)
        return values
      })
      const content = pickBestContent(contentCandidates)
      const updated = el.querySelector('updated, published')
      const pubDate = updated?.textContent?.trim() || ''
      const pathPart = linkHref.split('/').filter(Boolean).pop()?.replace(/[^a-zA-Z0-9-_]/g, '_') || String(i)
      return {
        id: `article_${i}_${pathPart}`,
        title: getText('title'),
        link: linkHref,
        pubDate,
        content: content || undefined,
        description: el.querySelector('summary')?.textContent?.trim() || undefined,
      } satisfies Article
    })
    return {
      title: title || '未命名订阅',
      link: link || '',
      description: description || undefined,
      articles,
    }
  }

  return { title: '未命名订阅', link: '', articles: [] }
}

function parseRssXml(xmlText: string): {
  title: string
  link: string
  description?: string
  itemCount: number
} {
  const parsed = parseFeedWithArticles(xmlText)
  return {
    ...parsed,
    itemCount: parsed.articles.length,
  }
}

export async function fetchAndParseRss(url: string): Promise<{
  title: string
  link: string
  description?: string
  itemCount: number
}> {
  let lastError: Error | null = null

  for (const toProxyUrl of CORS_PROXIES) {
    try {
      const proxiedUrl = toProxyUrl(url)
      const res = await fetch(proxiedUrl)
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      let xml = await readResponseTextWithEmDashFix(res)

      if (xml.trim().startsWith('{')) {
        const json = JSON.parse(xml)
        if (json.contents) xml = json.contents
        else if (json.error)
          throw new Error(json.error.message || json.error)
      }

      const feed = parseRssXml(xml)
      return {
        ...feed,
        link: feed.link || url,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw new Error(
    lastError?.message ?? '无法获取 RSS。请检查地址是否正确，或稍后重试。'
  )
}

export async function fetchFeedWithArticles(url: string): Promise<{
  title: string
  link: string
  description?: string
  articles: Article[]
}> {
  let lastError: Error | null = null

  for (const toProxyUrl of CORS_PROXIES) {
    try {
      const proxiedUrl = toProxyUrl(url)
      const res = await fetch(proxiedUrl)
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      let xml = await readResponseTextWithEmDashFix(res)

      if (xml.trim().startsWith('{')) {
        const json = JSON.parse(xml)
        if (json.contents) xml = json.contents
        else if (json.error)
          throw new Error(json.error.message || json.error)
      }

      const parsed = parseFeedWithArticles(xml)
      const sorted = [...parsed.articles].sort((a, b) => {
        const da = new Date(a.pubDate).getTime()
        const db = new Date(b.pubDate).getTime()
        return db - da
      })
      return {
        ...parsed,
        link: parsed.link || url,
        articles: sorted,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw new Error(
    lastError?.message ?? '无法获取 RSS。请检查地址是否正确，或稍后重试。'
  )
}
