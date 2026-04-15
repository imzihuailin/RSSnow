import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArticleRow } from '../components/ArticleRow'
import { t } from '../i18n'
import {
  getArticlesCache,
  getFavoriteEntry,
  getFavoritesByFeed,
  getFeedById,
  makeFavoriteArticleId,
  toggleFavoriteArticle,
} from '../utils/storage'
import { getReadArticleIds } from '../utils/readingProgress'

function getFavoriteSubtitle(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

export function FavoritesPage() {
  const { feedId } = useParams<{ feedId: string }>()
  const navigate = useNavigate()
  const feed = feedId ? getFeedById(feedId) : undefined
  const [favorites, setFavorites] = useState(() => (feedId ? getFavoritesByFeed(feedId) : []))

  const readIds = useMemo(() => {
    return feedId ? getReadArticleIds(feedId) : new Set<string>()
  }, [feedId])

  const cachedArticles = useMemo(() => {
    return feedId ? getArticlesCache(feedId)?.articles ?? [] : []
  }, [feedId])

  if (!feedId || !feed) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0E151D] flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#111B24] backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-[52rem] mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {t('返回', 'Back')}
            </button>
          </div>
        </header>
        <main className="max-w-[52rem] mx-auto px-4 py-8 text-red-600 dark:text-red-400">
          {t('订阅不存在', 'Subscription not found')}
        </main>
      </div>
    )
  }

  const handleToggleFavorite = (link: string) => {
    const entry = getFavoriteEntry(feedId, link)
    if (!entry) return
    toggleFavoriteArticle(feedId, { title: entry.title, link: entry.link })
    setFavorites(getFavoritesByFeed(feedId))
  }

  const handleOpenFavorite = (link: string) => {
    const entry = getFavoriteEntry(feedId, link)
    if (!entry) return
    navigate(`/read/${feedId}/${encodeURIComponent(makeFavoriteArticleId(entry.link))}`, {
      state: {
        favoriteEntry: entry,
        fromFavorites: true,
      },
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0E151D] text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#111B24] backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[52rem] mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/feed/${feedId}`)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            {t('返回', 'Back')}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">{t('我的收藏', 'My Favorites')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300 truncate">{feed.title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-[52rem] mx-auto px-4 py-6">
        {favorites.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t('当前订阅还没有收藏文章', 'No favorites in this feed yet')}
          </div>
        ) : (
          <ul className="space-y-2">
            {favorites.map((entry) => {
              const cachedArticle = cachedArticles.find((article) => article.link === entry.link)
              return (
                <li key={entry.link}>
                  <ArticleRow
                    title={entry.title || t('无标题', 'Untitled')}
                    subtitle={getFavoriteSubtitle(entry.link)}
                    description={cachedArticle?.description?.replace(/<[^>]+>/g, '').slice(0, 100)}
                    isRead={cachedArticle ? readIds.has(cachedArticle.id) : false}
                    isFavorited={true}
                    onOpen={() => handleOpenFavorite(entry.link)}
                    onToggleFavorite={() => handleToggleFavorite(entry.link)}
                    openLabel={t('打开收藏文章', 'Open favorite article')}
                    favoriteLabel={t('取消收藏', 'Remove favorite')}
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
