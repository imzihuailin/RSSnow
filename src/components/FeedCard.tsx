import { Link } from 'react-router-dom'
import { t } from '../i18n'

interface FeedCardProps {
  feedId: string
  title: string
  itemCount?: number
}

export function FeedCard({ feedId, title, itemCount }: FeedCardProps) {
  return (
    <Link to={`/feed/${feedId}`}>
      <article className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-[#16222D] dark:shadow-black/20">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xl dark:bg-slate-700">
            📰
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {itemCount != null && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {itemCount} {t('篇文章', 'articles')}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
