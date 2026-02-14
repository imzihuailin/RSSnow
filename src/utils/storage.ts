const FEEDS_KEY = 'rssnow_feeds'
const ARTICLES_CACHE_KEY = 'rssnow_articles_cache'

export interface Feed {
  id: string
  title: string
  link: string
  feedUrl: string
  description?: string
  itemCount?: number
}

export interface Article {
  id: string
  title: string
  link: string
  pubDate: string
  content?: string
  description?: string
}

export interface FeedWithArticles {
  feed: Feed
  articles: Article[]
  fetchedAt: number
}

export function getFeeds(): Feed[] {
  try {
    const data = localStorage.getItem(FEEDS_KEY)
    const raw = data ? JSON.parse(data) : []
    return raw.map((f: Partial<Feed>) => ({
      ...f,
      feedUrl: f.feedUrl ?? f.link ?? '',
    }))
  } catch {
    return []
  }
}

export function saveFeeds(feeds: Feed[]): void {
  localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds))
}

export function addFeed(feed: Omit<Feed, 'id'>): Feed {
  const feeds = getFeeds()
  const id = `feed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const newFeed: Feed = { ...feed, id }
  saveFeeds([...feeds, newFeed])
  return newFeed
}

export function getFeedById(id: string): Feed | undefined {
  return getFeeds().find((f) => f.id === id)
}

export function getArticlesCache(feedId: string): FeedWithArticles | null {
  try {
    const data = localStorage.getItem(ARTICLES_CACHE_KEY)
    const cache: Record<string, FeedWithArticles> = data ? JSON.parse(data) : {}
    return cache[feedId] ?? null
  } catch {
    return null
  }
}

export function setArticlesCache(feedId: string, data: Omit<FeedWithArticles, 'feed'> & { feed: Feed }): void {
  try {
    const raw = localStorage.getItem(ARTICLES_CACHE_KEY)
    const cache: Record<string, FeedWithArticles> = raw ? JSON.parse(raw) : {}
    cache[feedId] = { ...data, feed: data.feed }
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

const FETCHED_CONTENT_KEY = 'rssnow_fetched_content'

export function getFetchedContent(articleLink: string): string | null {
  try {
    const data = localStorage.getItem(FETCHED_CONTENT_KEY)
    const cache: Record<string, string> = data ? JSON.parse(data) : {}
    return cache[articleLink] ?? null
  } catch {
    return null
  }
}

export function setFetchedContent(articleLink: string, content: string): void {
  try {
    const raw = localStorage.getItem(FETCHED_CONTENT_KEY)
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {}
    cache[articleLink] = content
    const keys = Object.keys(cache)
    if (keys.length > 500) {
      const toRemove = keys.slice(0, keys.length - 400)
      toRemove.forEach((k) => delete cache[k])
    }
    localStorage.setItem(FETCHED_CONTENT_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}
