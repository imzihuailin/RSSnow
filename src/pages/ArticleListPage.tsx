import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArticleRow } from '../components/ArticleRow'
import { fetchFeedWithArticles } from '../hooks/useRssParse'
import { t, getLang } from '../i18n'
import {
  deleteFeed,
  getArticlesCache,
  getFavoritesByFeed,
  getFeedById,
  setArticlesCache,
  toggleFavoriteArticle,
  updateFeed,
} from '../utils/storage'
import type { Article, Feed, FeedRefreshMode } from '../utils/storage'
import {
  getDismissedRecentUnfinished,
  getLatestUnfinishedArticle,
  getReadArticleIds,
  setDismissedRecentUnfinished,
} from '../utils/readingProgress'

function formatDate(pubDate: string): string {
  if (!pubDate) return ''
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return pubDate
  return d.toLocaleDateString(getLang() === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sortArticlesByPubDate(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const da = new Date(a.pubDate).getTime()
    const db = new Date(b.pubDate).getTime()
    return db - da
  })
}

function hasArticleListChanged(prev: Article[], next: Article[]): boolean {
  if (prev.length !== next.length) return true
  for (let i = 0; i < prev.length; i += 1) {
    if (
      prev[i].id !== next[i].id ||
      prev[i].link !== next[i].link ||
      prev[i].pubDate !== next[i].pubDate
    ) {
      return true
    }
  }
  return false
}

function FocusIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-400" />
    </span>
  )
}

function InfoIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
    >
      <span className="text-sm font-semibold leading-none">i</span>
    </span>
  )
}

export function ArticleListPage() {
  const { feedId } = useParams<{ feedId: string }>()
  const navigate = useNavigate()

  const [feed, setFeed] = useState<Feed | null>(() => (feedId ? getFeedById(feedId) ?? null : null))
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    feedId ? getReadArticleIds(feedId) : new Set()
  )
  const [favoriteLinks, setFavoriteLinks] = useState<Set<string>>(() =>
    feedId ? new Set(getFavoritesByFeed(feedId).map((entry) => entry.link)) : new Set()
  )
  const [dismissedFeedIdInSession, setDismissedFeedIdInSession] = useState<string | null>(null)

  const feedTitle = feed?.title ?? ''
  const refreshMode: FeedRefreshMode = feed?.refreshMode ?? 'focus'

  useEffect(() => {
    if (!feedId) return
    const refresh = () => {
      setReadIds(getReadArticleIds(feedId))
      setFavoriteLinks(new Set(getFavoritesByFeed(feedId).map((entry) => entry.link)))
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [feedId])

  useEffect(() => {
    if (!feedId) return

    let cancelled = false
    const currentFeed = getFeedById(feedId)
    queueMicrotask(() => {
      if (!cancelled) setFeed(currentFeed ?? null)
    })
    if (!currentFeed) {
      queueMicrotask(() => {
        setError(t('订阅不存在', 'Subscription not found'))
        setLoading(false)
      })
      return
    }

    const cached = getArticlesCache(feedId)
    const cachedArticles = cached?.articles ?? []
    const hasCachedArticles = cachedArticles.length > 0

    const syncFeedMeta = (incomingArticles: Article[]) => {
      const nextItemCount = incomingArticles.length
      if (currentFeed.itemCount === nextItemCount) return currentFeed
      const updatedFeed = updateFeed(feedId, { itemCount: nextItemCount })
      const mergedFeed = updatedFeed ?? { ...currentFeed, itemCount: nextItemCount }
      if (!cancelled) setFeed(mergedFeed)
      return mergedFeed
    }

    if (refreshMode === 'focus' && hasCachedArticles) {
      queueMicrotask(() => {
        if (cancelled) return
        setArticles(cachedArticles)
        setError('')
        setLoading(false)
      })
    } else {
      queueMicrotask(() => {
        if (cancelled) return
        setLoading(true)
        setError('')
      })
    }

    fetchFeedWithArticles(currentFeed.feedUrl)
      .then((data) => {
        if (cancelled) return
        const sortedArticles = sortArticlesByPubDate(data.articles)
        const nextFeed = syncFeedMeta(sortedArticles)
        const shouldUpdateVisibleList =
          !hasCachedArticles ||
          refreshMode === 'live' ||
          hasArticleListChanged(cachedArticles, sortedArticles)

        if (shouldUpdateVisibleList) {
          setArticles(sortedArticles)
        }

        setArticlesCache(feedId, {
          feed: nextFeed,
          articles: sortedArticles,
          fetchedAt: Date.now(),
        })
        setError('')
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        if (hasCachedArticles) {
          setArticles(cachedArticles)
          setError('')
        } else {
          setError(err instanceof Error ? err.message : t('加载失败', 'Failed to load'))
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [feedId, refreshMode])

  useEffect(() => {
    if (loading || articles.length === 0 || !feedId) return
    const key = `articleListScroll_${feedId}`
    const saved = sessionStorage.getItem(key)
    if (saved) {
      sessionStorage.removeItem(key)
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10))
      })
    }
  }, [loading, articles.length, feedId])

  const handleBack = () => navigate('/')

  const handleDelete = () => {
    if (!feedId) return
    deleteFeed(feedId)
    navigate('/')
  }

  const handleArticleClick = (article: Article) => {
    if (feedId) sessionStorage.setItem(`articleListScroll_${feedId}`, String(window.scrollY))
    if (refreshMode === 'live' && article.link) {
      window.location.assign(article.link)
      return
    }
    navigate(`/read/${feedId}/${encodeURIComponent(article.id)}`)
  }

  const handleToggleFavorite = (article: Article) => {
    if (!feedId) return
    toggleFavoriteArticle(feedId, article)
    setFavoriteLinks(new Set(getFavoritesByFeed(feedId).map((entry) => entry.link)))
  }

  const handleToggleRefreshMode = () => {
    if (!feedId || !feed) return
    const nextMode: FeedRefreshMode = feed.refreshMode === 'live' ? 'focus' : 'live'
    const updatedFeed = updateFeed(feedId, { refreshMode: nextMode })
    if (!updatedFeed) return
    setFeed(updatedFeed)
  }

  const recentUnfinishedData = useMemo(() => {
    if (!feedId || loading || articles.length === 0) return null

    const allowedArticleIds = new Set(articles.map((article) => article.id))
    const latest = getLatestUnfinishedArticle(feedId, allowedArticleIds)
    if (!latest) return null

    const dismissed = getDismissedRecentUnfinished(feedId)
    const shouldHideByDismissed =
      dismissed?.articleId === latest.articleId && latest.updatedAt <= dismissed.updatedAt
    if (shouldHideByDismissed) return null

    const article = articles.find((item) => item.id === latest.articleId)
    if (!article) return null

    return {
      article,
      progress: latest.progress,
      updatedAt: latest.updatedAt,
    }
  }, [feedId, loading, articles])

  const handleDismissRecentUnfinished = () => {
    if (!feedId || !recentUnfinishedData) return
    setDismissedRecentUnfinished(feedId, recentUnfinishedData.article.id, recentUnfinishedData.updatedAt)
    setDismissedFeedIdInSession(feedId)
  }

  const showRecentUnfinishedCard =
    !loading &&
    !!recentUnfinishedData &&
    articles.length > 0 &&
    !(dismissedFeedIdInSession != null && dismissedFeedIdInSession === feedId)

  const displayedArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const indexed = articles.map((article, originalIndex) => ({ article, originalIndex }))
    const filtered = q
      ? indexed.filter(({ article }) => {
          const title = (article.title || '').toLowerCase()
          const desc = (article.description || '').replace(/<[^>]+>/g, '').toLowerCase()
          return title.includes(q) || desc.includes(q)
        })
      : indexed

    const getTimestamp = (article: Article): number | null => {
      const ts = Date.parse(article.pubDate)
      return Number.isNaN(ts) ? null : ts
    }

    const compareByPubDateDesc = (
      a: { article: Article; originalIndex: number },
      b: { article: Article; originalIndex: number }
    ): number => {
      const ta = getTimestamp(a.article)
      const tb = getTimestamp(b.article)
      if (ta != null && tb != null && ta !== tb) return tb - ta
      if (ta != null && tb == null) return -1
      if (ta == null && tb != null) return 1
      return a.originalIndex - b.originalIndex
    }

    if (q) {
      return [...filtered].sort(compareByPubDateDesc).map(({ article }) => article)
    }

    const unread: Array<{ article: Article; originalIndex: number }> = []
    const read: Array<{ article: Article; originalIndex: number }> = []
    for (const item of filtered) {
      if (readIds.has(item.article.id)) read.push(item)
      else unread.push(item)
    }

    unread.sort(compareByPubDateDesc)
    read.sort(compareByPubDateDesc)
    return [...unread, ...read].map(({ article }) => article)
  }, [articles, readIds, searchQuery])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-[52rem] mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {t('返回', 'Back')}
            </button>
          </div>
        </header>
        <main className="max-w-[52rem] mx-auto px-4 py-8 text-red-600 dark:text-red-400">{error}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[52rem] mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            {t('返回', 'Back')}
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 min-w-0">{feedTitle}</h1>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRefreshMode}
              className="h-[46px] px-3 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm text-slate-700 dark:text-slate-200 inline-flex items-center gap-2"
              aria-label={
                refreshMode === 'live'
                  ? t('当前为 live 模式，点击切换到 focus 模式', 'Currently in live mode, click to switch to focus mode')
                  : t('当前为 focus 模式，点击切换到 live 模式', 'Currently in focus mode, click to switch to live mode')
              }
              title={
                refreshMode === 'live'
                  ? t('当前为 live 模式，点击切换到 focus 模式', 'Currently in live mode, click to switch to focus mode')
                  : t('当前为 focus 模式，点击切换到 live 模式', 'Currently in focus mode, click to switch to live mode')
              }
            >
              <span>{refreshMode}</span>
              {refreshMode === 'live' ? (
                <span aria-hidden="true" className="text-sm leading-none">🟢</span>
              ) : (
                <FocusIcon />
              )}
            </button>
            <div className="relative group shrink-0">
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                aria-label={t('刷新模式说明', 'Refresh mode help')}
                title={t('live：每次打开都更新；focus：有变化才更新', 'live: refresh on every open; focus: update only when changes are detected')}
              >
                <InfoIcon />
              </button>
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {t('live：每次打开都更新；focus：有变化才更新', 'live: refresh on every open; focus: update only when changes are detected')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="shrink-0 h-[46px] px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
          >
            {t('删除', 'Delete')}
          </button>
        </div>
      </header>

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">{t('确认删除', 'Confirm Delete')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t(`确定要删除订阅“${feedTitle}”吗？此操作不可恢复。`, `Are you sure you want to delete "${feedTitle}"? This cannot be undone.`)}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                {t('确认', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[52rem] mx-auto px-4 py-6">
        {!loading && (
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 w-full">
            <input
              type="search"
              placeholder={t('搜索文章...', 'Search articles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label={t('搜索文章', 'Search articles')}
            />
            <button
              type="button"
              onClick={() => navigate(`/feed/${feedId}/favorites`)}
              className="h-[46px] px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              {t('我的收藏', 'My Favorites')}
            </button>
          </div>
        )}

        {showRecentUnfinishedCard && recentUnfinishedData && (
          <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/30 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {t('最近阅读', 'Recently Read')}
                </p>
                <button
                  type="button"
                  onClick={() => handleArticleClick(recentUnfinishedData.article)}
                  className="mt-1 text-left text-base font-semibold text-slate-900 dark:text-slate-100 hover:underline line-clamp-2"
                >
                  {recentUnfinishedData.article.title || t('无标题', 'Untitled')}
                </button>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {t(`上次进度 ${Math.round(recentUnfinishedData.progress)}%`, `Last progress ${Math.round(recentUnfinishedData.progress)}%`)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismissRecentUnfinished}
                className="shrink-0 h-[46px] px-4 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {t('关闭', 'Dismiss')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleArticleClick(recentUnfinishedData.article)}
              className="mt-2.5 inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('继续阅读', 'Continue')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">{t('加载中...', 'Loading...')}</div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">{t('暂无文章', 'No articles')}</div>
        ) : displayedArticles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t(`未找到匹配“${searchQuery}”的文章`, `No articles matching "${searchQuery}"`)}
          </div>
        ) : (
          <ul className="space-y-2">
            {displayedArticles.map((article) => {
              const isRead = readIds.has(article.id)
              const isFavorited = favoriteLinks.has(article.link)
              return (
                <li key={article.id}>
                  <ArticleRow
                    title={article.title || t('无标题', 'Untitled')}
                    subtitle={formatDate(article.pubDate)}
                    description={article.description?.replace(/<[^>]+>/g, '').slice(0, 100)}
                    isRead={isRead}
                    isFavorited={isFavorited}
                    onOpen={() => handleArticleClick(article)}
                    onToggleFavorite={() => handleToggleFavorite(article)}
                    openLabel={t('打开文章', 'Open article')}
                    favoriteLabel={
                      isFavorited
                        ? t('取消收藏', 'Remove favorite')
                        : t('收藏文章', 'Favorite article')
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
