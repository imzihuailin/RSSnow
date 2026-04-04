const FEEDS_KEY = 'rssnow_feeds'
const ARTICLES_CACHE_KEY = 'rssnow_articles_cache'
const FAVORITES_KEY = 'rssnow_favorites'
const FAVORITE_ARTICLE_ID_PREFIX = 'favorite-link:'

export type FeedRefreshMode = 'focus' | 'live'

export interface Feed {
  id: string
  title: string
  link: string
  feedUrl: string
  description?: string
  itemCount?: number
  refreshMode: FeedRefreshMode
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

export interface FavoriteArticleEntry {
  feedId: string
  link: string
  title: string
  favoritedAt: number
}

export function getFeeds(): Feed[] {
  try {
    const data = localStorage.getItem(FEEDS_KEY)
    const raw = data ? JSON.parse(data) : []
    return raw.map((f: Partial<Feed>) => ({
      ...f,
      feedUrl: f.feedUrl ?? f.link ?? '',
      refreshMode: f.refreshMode === 'live' ? 'live' : 'focus',
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

export function updateFeed(feedId: string, updates: Partial<Omit<Feed, 'id'>>): Feed | null {
  const feeds = getFeeds()
  const index = feeds.findIndex((feed) => feed.id === feedId)
  if (index < 0) return null
  const nextFeed = {
    ...feeds[index],
    ...updates,
  }
  feeds[index] = nextFeed
  saveFeeds(feeds)
  return nextFeed
}

export function deleteFeed(feedId: string): void {
  const feeds = getFeeds().filter((f) => f.id !== feedId)
  saveFeeds(feeds)
  try {
    const data = localStorage.getItem(ARTICLES_CACHE_KEY)
    const cache: Record<string, FeedWithArticles> = data ? JSON.parse(data) : {}
    delete cache[feedId]
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }

  deleteFavoritesForFeed(feedId)
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

function getFavorites(): FavoriteArticleEntry[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY)
    const raw = data ? JSON.parse(data) : []
    if (!Array.isArray(raw)) return []
    return raw.filter((entry): entry is FavoriteArticleEntry => {
      return (
        !!entry &&
        typeof entry.feedId === 'string' &&
        typeof entry.link === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.favoritedAt === 'number'
      )
    })
  } catch {
    return []
  }
}

function saveFavorites(entries: FavoriteArticleEntry[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(entries))
}

export function getFavoritesByFeed(feedId: string): FavoriteArticleEntry[] {
  return getFavorites()
    .filter((entry) => entry.feedId === feedId)
    .sort((a, b) => a.favoritedAt - b.favoritedAt)
}

export function getFavoriteEntry(feedId: string, link: string): FavoriteArticleEntry | null {
  return getFavorites().find((entry) => entry.feedId === feedId && entry.link === link) ?? null
}

export function isFavoriteArticle(feedId: string, link: string): boolean {
  return getFavoriteEntry(feedId, link) !== null
}

export function toggleFavoriteArticle(
  feedId: string,
  article: Pick<Article, 'title' | 'link'>
): boolean {
  try {
    const favorites = getFavorites()
    const existingIndex = favorites.findIndex(
      (entry) => entry.feedId === feedId && entry.link === article.link
    )

    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1)
      saveFavorites(favorites)
      return false
    }

    favorites.push({
      feedId,
      link: article.link,
      title: article.title || 'Untitled',
      favoritedAt: Date.now(),
    })
    saveFavorites(favorites)
    return true
  } catch {
    return false
  }
}

export function deleteFavoritesForFeed(feedId: string): void {
  try {
    const favorites = getFavorites().filter((entry) => entry.feedId !== feedId)
    saveFavorites(favorites)
  } catch {
    // ignore
  }
}

export function makeFavoriteArticleId(link: string): string {
  return `${FAVORITE_ARTICLE_ID_PREFIX}${link}`
}

export function parseFavoriteArticleId(articleId: string): string | null {
  return articleId.startsWith(FAVORITE_ARTICLE_ID_PREFIX)
    ? articleId.slice(FAVORITE_ARTICLE_ID_PREFIX.length)
    : null
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

export function deleteFetchedContent(articleLink: string): void {
  try {
    const raw = localStorage.getItem(FETCHED_CONTENT_KEY)
    const cache: Record<string, string> = raw ? JSON.parse(raw) : {}
    if (!(articleLink in cache)) return
    delete cache[articleLink]
    localStorage.setItem(FETCHED_CONTENT_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}
