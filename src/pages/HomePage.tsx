import { useState } from 'react'
import { getFeeds, addFeed } from '../utils/storage'
import { FeedCard } from '../components/FeedCard'
import { AddFeedModal } from '../components/AddFeedModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { fetchAndParseRss } from '../hooks/useRssParse'
import { t, getLang, setLang } from '../i18n'

export function HomePage() {
  const [feeds, setFeeds] = useState(getFeeds())
  const [modalOpen, setModalOpen] = useState(false)

  const handleAddRss = () => setModalOpen(true)

  const handleAddFeed = async (url: string) => {
    const parsed = await fetchAndParseRss(url)
    const existing = feeds.find((f) => f.feedUrl === url)
    if (existing) {
      throw new Error(t('该 RSS 已订阅', 'This RSS is already subscribed'))
    }
    addFeed({
      title: parsed.title,
      link: parsed.link,
      feedUrl: url,
      description: parsed.description,
      itemCount: parsed.itemCount,
      refreshMode: 'focus',
    })
    setFeeds(getFeeds())
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0E151D] text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-[#111B24]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t('我的订阅', 'My Feeds')}</h1>
            <button
              onClick={() => setLang(getLang() === 'en' ? 'zh' : 'en')}
              className="rounded-md bg-slate-200 px-2 py-0.5 text-sm text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {getLang() === 'en' ? 'En' : '中'}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={handleAddRss}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              {t('添加 RSS', 'Add RSS')}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {feeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <p className="text-lg">{t('暂无订阅', 'No subscriptions')}</p>
            <p className="mt-2 text-sm">{t('点击上方“添加 RSS”开始订阅', 'Click "Add RSS" above to get started')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feeds.map((feed) => (
              <FeedCard
                key={feed.id}
                feedId={feed.id}
                title={feed.title}
                itemCount={feed.itemCount}
              />
            ))}
          </div>
        )}
      </main>

      <AddFeedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddFeed}
      />
    </div>
  )
}
