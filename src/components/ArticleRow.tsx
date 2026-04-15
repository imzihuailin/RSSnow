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
    ? 'bg-slate-50 dark:bg-[#16222D]/60 border-slate-200/60 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700'
    : 'bg-white dark:bg-[#16222D] border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500'

  const titleTone = isRead
    ? 'text-slate-400 dark:text-slate-500'
    : 'text-slate-900 dark:text-slate-100'

  const favoriteTone = isFavorited
    ? 'border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20'
    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-amber-500 dark:border-slate-800 dark:bg-[#16222D] dark:text-slate-500 dark:hover:border-slate-700 dark:hover:text-amber-300'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-stretch gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className={`min-w-0 w-full rounded-lg border px-4 py-2.5 text-left transition-colors flex items-start gap-3 ${contentTone}`}
      >
        <div className="min-w-0 flex-1">
          <h3 className={`line-clamp-2 font-medium ${titleTone}`}>{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
          )}
          {description && !isRead && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          )}
        </div>
        {isRead && <span className="mt-0.5 shrink-0 text-base">✓</span>}
      </button>

      <button
        type="button"
        aria-label={favoriteLabel}
        aria-pressed={isFavorited}
        onClick={onToggleFavorite}
        className={`flex min-h-full w-12 self-stretch items-center justify-center rounded-lg border py-2.5 transition-colors ${favoriteTone}`}
      >
        <StarIcon filled={isFavorited} />
      </button>
    </div>
  )
}
