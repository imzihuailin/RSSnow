interface ArticleRowProps {
  title: string
  subtitle?: string
  description?: string
  isRead?: boolean
  isFavorited: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  openLabel: string
  favoriteLabel: string
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 1.4 : 1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5c.2-.62 1.08-.62 1.28 0l1.81 5.56a.68.68 0 00.65.47h5.84c.66 0 .93.84.4 1.23l-4.72 3.43a.68.68 0 00-.25.76l1.8 5.56c.2.62-.5 1.12-1.03.74l-4.72-3.44a.68.68 0 00-.8 0l-4.72 3.44c-.53.38-1.23-.12-1.03-.74l1.8-5.56a.68.68 0 00-.25-.76L2.8 10.76c-.53-.39-.26-1.23.4-1.23h5.84a.68.68 0 00.65-.47L11.48 3.5z"
      />
    </svg>
  )
}

export function ArticleRow({
  title,
  subtitle,
  description,
  isRead = false,
  isFavorited,
  onOpen,
  onToggleFavorite,
  openLabel,
  favoriteLabel,
}: ArticleRowProps) {
  const contentTone = isRead
    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'

  const titleTone = isRead
    ? 'text-slate-400 dark:text-slate-500'
    : 'text-slate-900 dark:text-slate-100'

  const favoriteTone = isFavorited
    ? 'border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20'
    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-amber-300'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-stretch gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className={`min-w-0 w-full px-4 py-2.5 rounded-lg border transition-colors flex items-start gap-3 text-left ${contentTone}`}
      >
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium line-clamp-2 ${titleTone}`}>{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
          {description && !isRead && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        {isRead && <span className="shrink-0 text-base mt-0.5">✓</span>}
      </button>

      <button
        type="button"
        aria-label={favoriteLabel}
        aria-pressed={isFavorited}
        onClick={onToggleFavorite}
        className={`w-12 min-h-full py-2.5 rounded-lg border transition-colors flex items-center justify-center self-stretch ${favoriteTone}`}
      >
        <StarIcon filled={isFavorited} />
      </button>
    </div>
  )
}
