import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getFeedById,
  getArticlesCache,
  setArticlesCache,
  deleteFeed,
} from '../utils/storage'
import { fetchFeedWithArticles } from '../hooks/useRssParse'
import type { Article } from '../utils/storage'
import { getReadArticleIds } from '../utils/readingProgress'

function formatDate(pubDate: string): string {
  if (!pubDate) return ''
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return pubDate
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ArticleListPage() {
  const { feedId } = useParams<{ feedId: string }>()
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [feedTitle, setFeedTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    feedId ? getReadArticleIds(feedId) : new Set()
  )

  // 从阅读页返回（Tab 切换 / 可见性变化）时刷新已读集合
  useEffect(() => {
    if (!feedId) return
    const refresh = () => setReadIds(getReadArticleIds(feedId))
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [feedId])

  useEffect(() => {
    if (!feedId) return

    const feed = getFeedById(feedId)
    if (!feed) {
      setError('订阅不存在')
      setLoading(false)
      return
    }

    setFeedTitle(feed.title)

    const cached = getArticlesCache(feedId)
    if (cached?.articles?.length) {
      setArticles(cached.articles)
      setLoading(false)
      return
    }

    fetchFeedWithArticles(feed.feedUrl)
      .then((data) => {
        const sorted = [...data.articles].sort((a, b) => {
          const da = new Date(a.pubDate).getTime()
          const db = new Date(b.pubDate).getTime()
          return db - da
        })
        setArticles(sorted)
        setArticlesCache(feedId, {
          feed,
          articles: sorted,
          fetchedAt: Date.now(),
        })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [feedId])

  // 文章列表渲染完毕后恢复之前保存的滚动位置
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
    if (feedId) {
      deleteFeed(feedId)
      navigate('/')
    }
  }
  const handleArticleClick = (article: Article) => {
    if (feedId) sessionStorage.setItem(`articleListScroll_${feedId}`, String(window.scrollY))
    navigate(`/read/${feedId}/${encodeURIComponent(article.id)}`)
  }

  const filteredArticles = searchQuery.trim()
    ? articles.filter((a) => {
        const q = searchQuery.toLowerCase()
        const title = (a.title || '').toLowerCase()
        const desc = (a.description || '').replace(/<[^>]+>/g, '').toLowerCase()
        return title.includes(q) || desc.includes(q)
      })
    : articles

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← 返回
            </button>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 text-red-600 dark:text-red-400">
          {error}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-semibold truncate flex-1 min-w-0">{feedTitle}</h1>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
          >
            删除
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
            <h2 className="text-lg font-semibold mb-2">确认删除</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              确定要删除订阅「{feedTitle}」吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        {!loading && articles.length > 0 && (
          <div className="mb-4">
            <input
              type="search"
              placeholder="搜索文章…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="搜索文章"
            />
          </div>
        )}
        {loading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            加载中…
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            暂无文章
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            未找到匹配「{searchQuery}」的文章
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredArticles.map((article) => {
              const isRead = readIds.has(article.id)
              return (
                <li key={article.id}>
                  <button
                    onClick={() => handleArticleClick(article)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isRead
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'
                    }`}
                  >
                    <h3
                      className={`font-medium line-clamp-2 ${
                        isRead
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {article.title || '无标题'}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      {formatDate(article.pubDate)}
                    </p>
                    {article.description && !isRead && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {article.description.replace(/<[^>]+>/g, '').slice(0, 100)}…
                      </p>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
