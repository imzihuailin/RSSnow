const READING_PROGRESS_KEY = 'rssnow_reading_progress'

export interface ProgressEntry {
  progress: number // 0-100 百分比
  updatedAt: number
}

function getArticleKey(feedId: string, articleId: string): string {
  return `${feedId}:${articleId}`
}

export function getReadingProgress(feedId: string, articleId: string): ProgressEntry | null {
  try {
    const data = localStorage.getItem(READING_PROGRESS_KEY)
    const cache: Record<string, ProgressEntry> = data ? JSON.parse(data) : {}
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
    const data = localStorage.getItem(READING_PROGRESS_KEY)
    const cache: Record<string, ProgressEntry> = data ? JSON.parse(data) : {}
    cache[getArticleKey(feedId, articleId)] = { progress, updatedAt }
    // 限制条目数量，保留最近 500 篇
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
