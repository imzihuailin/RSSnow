const READING_PROGRESS_KEY = 'rssnow_reading_progress'

export interface ProgressEntry {
  progress: number // 0-100 百分比
  updatedAt: number
  isRead?: boolean // 一旦置为 true 永不回退
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
    const key = getArticleKey(feedId, articleId)
    const existing = cache[key]
    // isRead 一旦置为 true 永远保留，不随进度更新而清除
    cache[key] = { progress, updatedAt, ...(existing?.isRead ? { isRead: true } : {}) }
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

/** 将文章标记为已读（幂等：已读后再次调用无副作用） */
export function markArticleRead(feedId: string, articleId: string): void {
  try {
    const data = localStorage.getItem(READING_PROGRESS_KEY)
    const cache: Record<string, ProgressEntry> = data ? JSON.parse(data) : {}
    const key = getArticleKey(feedId, articleId)
    const existing = cache[key]
    if (existing?.isRead) return
    cache[key] = { progress: 100, updatedAt: existing?.updatedAt ?? Date.now(), isRead: true }
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

/** 查询某篇文章是否已读 */
export function isArticleRead(feedId: string, articleId: string): boolean {
  return getReadingProgress(feedId, articleId)?.isRead === true
}

/** 获取某个 feed 下所有已读文章的 id 集合 */
export function getReadArticleIds(feedId: string): Set<string> {
  try {
    const data = localStorage.getItem(READING_PROGRESS_KEY)
    const cache: Record<string, ProgressEntry> = data ? JSON.parse(data) : {}
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
