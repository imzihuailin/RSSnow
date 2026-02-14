import { useState } from 'react'
import { getFeeds, addFeed } from '../utils/storage'
import { FeedCard } from '../components/FeedCard'
import { AddFeedModal } from '../components/AddFeedModal'
import { fetchAndParseRss } from '../hooks/useRssParse'

export function HomePage() {
  const [feeds, setFeeds] = useState(getFeeds())
  const [modalOpen, setModalOpen] = useState(false)

  const handleAddRss = () => setModalOpen(true)

  const handleAddFeed = async (url: string) => {
    const parsed = await fetchAndParseRss(url)
    const existing = feeds.find((f) => f.feedUrl === url)
    if (existing) {
      throw new Error('该 RSS 已订阅')
    }
    addFeed({
      title: parsed.title,
      link: parsed.link,
      feedUrl: url,
      description: parsed.description,
      itemCount: parsed.itemCount,
    })
    setFeeds(getFeeds())
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">我的订阅</h1>
          <button
            onClick={handleAddRss}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            添加 RSS
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {feeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <p className="text-lg">暂无订阅</p>
            <p className="text-sm mt-2">点击上方「添加 RSS」开始订阅</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
