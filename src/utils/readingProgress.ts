const READING_PROGRESS_KEY = 'rssnow_reading_progress'
const RECENT_UNFINISHED_DISMISSED_KEY = 'rssnow_recent_unfinished_dismissed'

export interface ProgressEntry {
  progress: number
  updatedAt: number
  isRead?: boolean
}

export interface UnfinishedArticleCandidate {
  articleId: string
  progress: number
  updatedAt: number
}

export interface RecentUnfinishedDismissedEntry {
  articleId: string
  updatedAt: number
}

function getArticleKey(feedId: string, articleId: string): string {
  return `${feedId}:${articleId}`
}

function getProgressCache(): Record<string, ProgressEntry> {
  const data = localStorage.getItem(READING_PROGRESS_KEY)
  return data ? JSON.parse(data) : {}
}

function getDismissedCache(): Record<string, RecentUnfinishedDismissedEntry> {
  const data = localStorage.getItem(RECENT_UNFINISHED_DISMISSED_KEY)
  return data ? JSON.parse(data) : {}
}

export function getReadingProgress(feedId: string, articleId: string): ProgressEntry | null {
  try {
    const cache = getProgressCache()
    return cache[getArticleKey(feedId, articleId)] ?? null
  } catch {
    return null
  }
}

export function setReadingProgress(
  feedId: string,
  articleId: string,
  progress: number,
  updatedAt: number = Date.now()
): void {
  try {
    const cache = getProgressCache()
    const key = getArticleKey(feedId, articleId)
    const existing = cache[key]
    cache[key] = {
      progress,
      updatedAt,
      ...(existing?.isRead != null ? { isRead: existing.isRead } : {}),
    }

    const keys = Object.keys(cache)
    if (keys.length > 500) {
      const entries = keys.map((k) => ({ k, t: cache[k].updatedAt })).sort((a, b) => a.t - b.t)
      entries.slice(0, keys.length - 400).forEach(({ k }) => delete cache[k])
    }

    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

export function toggleArticleRead(feedId: string, articleId: string): boolean {
  try {
    const cache = getProgressCache()
    const key = getArticleKey(feedId, articleId)
    const existing = cache[key]
    const newIsRead = !existing?.isRead
    cache[key] = {
      progress: existing?.progress ?? 0,
      updatedAt: existing?.updatedAt ?? Date.now(),
      isRead: newIsRead,
    }
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(cache))
    return newIsRead
  } catch {
    return false
  }
}

export function isArticleRead(feedId: string, articleId: string): boolean {
  return getReadingProgress(feedId, articleId)?.isRead === true
}

export function getReadArticleIds(feedId: string): Set<string> {
  try {
    const cache = getProgressCache()
    const prefix = `${feedId}:`
    const ids = new Set<string>()
    for (const key of Object.keys(cache)) {
      if (key.startsWith(prefix) && cache[key].isRead) {
        ids.add(key.slice(prefix.length))
      }
    }
    return ids
  } catch {
    return new Set()
  }
}

export function getLatestUnfinishedArticle(
  feedId: string,
  allowedArticleIds: Set<string>
): UnfinishedArticleCandidate | null {
  try {
    const cache = getProgressCache()
    const prefix = `${feedId}:`
    let latest: UnfinishedArticleCandidate | null = null

    for (const [key, entry] of Object.entries(cache)) {
      if (!key.startsWith(prefix)) continue
      if (entry.isRead === true) continue

      const articleId = key.slice(prefix.length)
      if (!allowedArticleIds.has(articleId)) continue

      if (!latest || entry.updatedAt > latest.updatedAt) {
        latest = {
          articleId,
          progress: entry.progress,
          updatedAt: entry.updatedAt,
        }
      }
    }

    return latest
  } catch {
    return null
  }
}

export function getDismissedRecentUnfinished(
  feedId: string
): RecentUnfinishedDismissedEntry | null {
  try {
    const cache = getDismissedCache()
    return cache[feedId] ?? null
  } catch {
    return null
  }
}

export function setDismissedRecentUnfinished(
  feedId: string,
  articleId: string,
  updatedAt: number
): void {
  try {
    const cache = getDismissedCache()
    cache[feedId] = { articleId, updatedAt }
    localStorage.setItem(RECENT_UNFINISHED_DISMISSED_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}
