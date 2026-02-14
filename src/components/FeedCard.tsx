import { Link } from 'react-router-dom'

interface FeedCardProps {
  feedId: string
  title: string
  itemCount?: number
}

export function FeedCard({ feedId, title, itemCount }: FeedCardProps) {
  return (
    <Link to={`/feed/${feedId}`}>
      <article className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-slate-200 dark:border-slate-700 cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xl shrink-0">
          📰
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          {itemCount != null && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {itemCount} 篇文章
            </p>
          )}
        </div>
      </div>
    </article>
    </Link>
  )
}
