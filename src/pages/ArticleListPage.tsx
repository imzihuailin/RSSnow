import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getFeedById,
  getArticlesCache,
  setArticlesCache,
} from '../utils/storage'
import { fetchFeedWithArticles } from '../hooks/useRssParse'
import type { Article } from '../utils/storage'

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

  const handleBack = () => navigate('/')
  const handleArticleClick = (article: Article) => {
    navigate(`/read/${feedId}/${encodeURIComponent(article.id)}`)
  }

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
          <h1 className="text-lg font-semibold truncate">{feedTitle}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            加载中…
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            暂无文章
          </div>
        ) : (
          <ul className="space-y-2">
            {articles.map((article) => (
              <li key={article.id}>
                <button
                  onClick={() => handleArticleClick(article)}
                  className="w-full text-left px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {article.title || '无标题'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(article.pubDate)}
                  </p>
                  {article.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {article.description.replace(/<[^>]+>/g, '').slice(0, 100)}…
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
