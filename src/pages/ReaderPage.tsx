import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  deleteFetchedContent,
  getArticlesCache,
  getFavoriteEntry,
  getFetchedContent,
  isFavoriteArticle,
  makeFavoriteArticleId,
  parseFavoriteArticleId,
  setFetchedContent,
  toggleFavoriteArticle,
} from '../utils/storage'
import type { Article, FavoriteArticleEntry } from '../utils/storage'
import {
  getReadingProgress,
  setReadingProgress,
  isArticleRead,
  toggleArticleRead,
} from '../utils/readingProgress'
import { getReadingPreferences, saveReadingPreferences } from '../utils/preferences'
import { fetchArticleContent } from '../hooks/useFetchArticle'
import { ReaderToolbar, FONT_OPTIONS } from '../components/ReaderToolbar'
import { t } from '../i18n'
import {
  getReaderBackground,
  type ReaderBackground,
  type ReaderBackgroundVariantId,
  type ReaderColorId,
} from '../utils/readerBackgrounds'

const DEBOUNCE_MS = 300
const DOUBLE_CLICK_MS = 350
const SETTLE_MS = 500
const JUMP_THRESHOLD_SCREENS = 2
const SHORT_CONTENT_TEXT_LEN = 120
const DOUBLE_BR_RE = /<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/i
const BLOCK_BOUNDARY_RE = /<\/(p|div|section|article)>\s*<(p|div|section|article)\b/i
const HR_RE = /<hr\b/i

interface ReaderLocationState {
  favoriteEntry?: FavoriteArticleEntry
  fromFavorites?: boolean
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

function isLikelyHtml(content?: string | null): boolean {
  if (!content) return false
  return /<[a-z][\s\S]*>/i.test(content.trim())
}

function getVisibleTextLength(content?: string | null): number {
  if (!content) return 0
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length
}

function hasVisibleBreakSignal(content?: string | null): boolean {
  if (!content) return false
  return DOUBLE_BR_RE.test(content) || BLOCK_BOUNDARY_RE.test(content) || HR_RE.test(content)
}

function isStructuredHtml(content?: string | null): boolean {
  if (!isLikelyHtml(content)) return false
  const textLen = getVisibleTextLength(content)
  if (textLen > 0 && textLen < SHORT_CONTENT_TEXT_LEN) return true
  return hasVisibleBreakSignal(content)
}

function getEffectiveProgress(rawPct: number, jumpOriginPct: number | null): number {
  if (jumpOriginPct === null) return rawPct
  return jumpOriginPct
}

function flushProgressSave(
  containerRef: React.RefObject<HTMLDivElement | null>,
  feedId: string | undefined,
  decodedId: string,
  jumpOriginPct: number | null
) {
  const el = containerRef.current
  if (!el || !feedId || !decodedId) return
  const { scrollTop, scrollHeight, clientHeight } = el
  const maxScroll = scrollHeight - clientHeight
  if (maxScroll > 0) {
    const rawPct = (scrollTop / maxScroll) * 100
    setReadingProgress(feedId, decodedId, getEffectiveProgress(rawPct, jumpOriginPct))
  }
}

function buildFallbackArticle(link: string, title?: string): Article {
  return {
    id: makeFavoriteArticleId(link),
    title: title || t('无标题', 'Untitled'),
    link,
    pubDate: '',
  }
}

function getBackgroundLayerStyle(background: ReaderBackground): React.CSSProperties {
  return {
    backgroundColor: background.fallbackColor,
    backgroundImage: `url("${background.image}")`,
    backgroundPosition: background.pagePosition,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
}

export function ReaderPage() {
  const { feedId, articleId } = useParams<{ feedId: string; articleId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as ReaderLocationState | null) ?? null
  const containerRef = useRef<HTMLDivElement>(null)
  const saveProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasRestoredRef = useRef(false)
  const lastContentClickRef = useRef(0)
  const contentClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedIdRef = useRef(feedId)
  const decodedIdRef = useRef('')
  const settledPctRef = useRef(0)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreJumpRef = useRef(false)
  const jumpOriginPctRef = useRef<number | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)
  const scrollPositionRef = useRef(0)

  const [showRefetchDialog, setShowRefetchDialog] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const prefs = getReadingPreferences()
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jumpOriginPct, setJumpOriginPct] = useState<number | null>(null)
  const [fontId, setFontId] = useState(prefs.fontId)
  const [fontSize, setFontSize] = useState(prefs.fontSize)
  const [lineHeight, setLineHeight] = useState(prefs.lineHeight)
  const [pagePadding, setPagePadding] = useState(prefs.pagePadding)
  const [colorId, setColorId] = useState<ReaderColorId>(prefs.colorId as ReaderColorId)
  const [backgroundVariantId, setBackgroundVariantId] = useState<ReaderBackgroundVariantId>(
    prefs.backgroundVariantId as ReaderBackgroundVariantId
  )
  const [brightness, setBrightness] = useState(prefs.brightness)

  const decodedId = articleId ? decodeURIComponent(articleId) : ''
  const favoriteLinkFromRoute = parseFavoriteArticleId(decodedId)
  const cached = feedId ? getArticlesCache(feedId) : null

  const favoriteEntry = useMemo(() => {
    if (!feedId) return null
    const stateEntry = locationState?.favoriteEntry
    if (stateEntry?.feedId === feedId) return stateEntry
    if (!favoriteLinkFromRoute) return null
    return (
      getFavoriteEntry(feedId, favoriteLinkFromRoute) ?? {
        feedId,
        link: favoriteLinkFromRoute,
        title: stateEntry?.title || t('无标题', 'Untitled'),
        favoritedAt: 0,
      }
    )
  }, [favoriteLinkFromRoute, feedId, locationState])

  const article = useMemo(() => {
    const directMatch = cached?.articles?.find((item) => item.id === decodedId)
    if (directMatch) return directMatch

    if (favoriteEntry) {
      const cachedByLink = cached?.articles?.find((item) => item.link === favoriteEntry.link)
      if (cachedByLink) return cachedByLink
      return buildFallbackArticle(favoriteEntry.link, favoriteEntry.title)
    }

    return null
  }, [cached?.articles, decodedId, favoriteEntry])

  const articleContent = article?.content ?? null
  const readingKey = article?.id ?? decodedId

  useEffect(() => {
    return () => {
      if (contentClickTimerRef.current) {
        clearTimeout(contentClickTimerRef.current)
        contentClickTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const flush = () => {
      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current)
        saveProgressTimerRef.current = null
      }
      flushProgressSave(containerRef, feedIdRef.current, decodedIdRef.current, jumpOriginPctRef.current)
    }
    const onBeforeUnload = () => flush()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    hasRestoredRef.current = false
  }, [feedId, readingKey])

  const [, setReadVersion] = useState(0)
  const isRead = feedId && readingKey ? isArticleRead(feedId, readingKey) : false

  const handleToggleRead = () => {
    if (!feedId || !readingKey) return
    toggleArticleRead(feedId, readingKey)
    setReadVersion((v) => v + 1)
  }

  const [, setFavoriteVersion] = useState(0)
  const isFavorited = feedId && article?.link ? isFavoriteArticle(feedId, article.link) : false

  const handleToggleFavorite = () => {
    if (!feedId || !article?.link) return
    toggleFavoriteArticle(feedId, article)
    setFavoriteVersion((v) => v + 1)
  }

  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchedContent = article ? getFetchedContent(article.link) : null
  const hasRenderableArticleContent = isStructuredHtml(articleContent)
  const hasRenderableFetchedContent = isStructuredHtml(fetchedContent)
  const usableFetchedContent = hasRenderableFetchedContent ? fetchedContent : null

  const font = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0]
  const background = getReaderBackground(colorId, backgroundVariantId)

  useEffect(() => {
    feedIdRef.current = feedId ?? ''
    decodedIdRef.current = readingKey
    jumpOriginPctRef.current = jumpOriginPct
  }, [feedId, readingKey, jumpOriginPct])

  useEffect(() => {
    if (!article?.link || !fetchedContent) return
    if (hasRenderableFetchedContent) return
    deleteFetchedContent(article.link)
    if (import.meta.env.DEV) {
      console.info('[ReaderPage] drop_weak_fetched_cache', {
        link: article.link,
        hasParagraphBreak: hasVisibleBreakSignal(fetchedContent),
        textLen: getVisibleTextLength(fetchedContent),
      })
    }
  }, [article?.link, fetchedContent, hasRenderableFetchedContent])

  const updateProgress = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) {
      setProgress(100)
      return
    }
    const rawPct = (scrollTop / maxScroll) * 100
    setProgress(rawPct)
    const effectivePct = getEffectiveProgress(rawPct, jumpOriginPctRef.current)
    if (saveProgressTimerRef.current) clearTimeout(saveProgressTimerRef.current)
    saveProgressTimerRef.current = setTimeout(() => {
      if (feedId && readingKey) setReadingProgress(feedId, readingKey, effectivePct)
      saveProgressTimerRef.current = null
    }, DEBOUNCE_MS)

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      const cur = containerRef.current
      if (!cur) return
      const { scrollTop: curTop, scrollHeight: curSH, clientHeight: curCH } = cur
      const curMax = curSH - curCH
      if (curMax <= 0) return
      const curPct = (curTop / curMax) * 100
      if (ignoreJumpRef.current) {
        ignoreJumpRef.current = false
        settledPctRef.current = curPct
        return
      }
      const settledTop = (settledPctRef.current / 100) * curMax
      const delta = Math.abs(curTop - settledTop)
      if (delta > curCH * JUMP_THRESHOLD_SCREENS) {
        const originPct = settledPctRef.current
        setJumpOriginPct(originPct)
        if (feedId && readingKey) setReadingProgress(feedId, readingKey, originPct)
      } else if (jumpOriginPctRef.current !== null && Math.abs(curPct - jumpOriginPctRef.current) < 3) {
        setJumpOriginPct(null)
        if (feedId && readingKey) setReadingProgress(feedId, readingKey, curPct)
      }
      settledPctRef.current = curPct
    }, SETTLE_MS)
  }, [feedId, readingKey])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rafId = requestAnimationFrame(() => updateProgress())
    el.addEventListener('scroll', updateProgress, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', updateProgress)
      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current)
        saveProgressTimerRef.current = null
      }
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
      const { scrollTop, scrollHeight, clientHeight } = el
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0 && feedId && readingKey) {
        const rawPct = (scrollTop / maxScroll) * 100
        setReadingProgress(feedId, readingKey, getEffectiveProgress(rawPct, jumpOriginPctRef.current))
      }
    }
  }, [updateProgress, article, feedId, readingKey])

  useEffect(() => {
    saveReadingPreferences({
      fontId,
      fontSize,
      lineHeight,
      pagePadding,
      colorId,
      backgroundVariantId,
      brightness,
    })
  }, [fontId, fontSize, lineHeight, pagePadding, colorId, backgroundVariantId, brightness])

  const contentReady = !!article && (hasRenderableArticleContent || usableFetchedContent || fetchError)
  useEffect(() => {
    if (!contentReady || !feedId || !readingKey || hasRestoredRef.current) return
    const saved = getReadingProgress(feedId, readingKey)
    if (!saved || saved.progress <= 0) return
    const el = containerRef.current
    if (!el) return
    const pct = saved.progress
    let retries = 0
    const maxRetries = 10
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const tryRestore = () => {
      const { scrollHeight, clientHeight } = el
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0) {
        ignoreJumpRef.current = true
        el.scrollTop = (pct / 100) * maxScroll
        settledPctRef.current = pct
        setProgress(pct)
        hasRestoredRef.current = true
        return
      }
      if (retries < maxRetries) {
        retries += 1
        timeoutId = setTimeout(tryRestore, 80)
      }
    }

    const rafId = requestAnimationFrame(() => requestAnimationFrame(tryRestore))
    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [contentReady, feedId, readingKey])

  const needsFetch = !!(article && !hasRenderableArticleContent && !usableFetchedContent && !fetchError)
  const shouldRefetch = refetchTrigger > 0

  useEffect(() => {
    const shouldFetch = needsFetch || shouldRefetch
    if (!shouldFetch || !article?.link) return

    const articleLink = article.link
    let cancelled = false
    const controller = new AbortController()
    fetchAbortRef.current?.abort()
    fetchAbortRef.current = controller
    queueMicrotask(() => {
      if (cancelled) return
      setFetching(true)
      setFetchError(null)
      fetchArticleContent(articleLink, { signal: controller.signal })
        .then((content) => {
          if (cancelled) return
          setFetchedContent(articleLink, content)
          if (shouldRefetch && scrollPositionRef.current > 0) {
            setTimeout(() => {
              const el = containerRef.current
              if (el) {
                el.scrollTop = scrollPositionRef.current
                scrollPositionRef.current = 0
              }
            }, 100)
          }
        })
        .catch((err) => {
          if (cancelled) return
          const msg = err instanceof Error ? err.message : t('抓取失败', 'Fetch failed')
          if (msg === t('请求已取消', 'Request cancelled')) return
          setFetchError(t('抓取失败，请刷新页面重试', 'Fetch failed, please refresh the page'))
        })
        .finally(() => {
          if (fetchAbortRef.current === controller) fetchAbortRef.current = null
          if (cancelled) return
          setFetching(false)
        })
    })
    return () => {
      cancelled = true
      controller.abort()
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null
    }
  }, [needsFetch, shouldRefetch, article?.link])

  const handleProgressChange = (value: number) => {
    const el = containerRef.current
    if (!el) return
    const { scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) return
    el.scrollTop = (value / 100) * maxScroll
    setProgress(value)
    const effectiveValue = getEffectiveProgress(value, jumpOriginPctRef.current)
    if (feedId && readingKey) setReadingProgress(feedId, readingKey, effectiveValue)
  }

  const handleContentClick = () => {
    const clearPending = () => {
      if (contentClickTimerRef.current) {
        clearTimeout(contentClickTimerRef.current)
        contentClickTimerRef.current = null
      }
    }

    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0) {
      clearPending()
      return
    }

    const now = Date.now()
    if (now - lastContentClickRef.current < DOUBLE_CLICK_MS) {
      clearPending()
      lastContentClickRef.current = 0
      return
    }
    lastContentClickRef.current = now
    clearPending()
    contentClickTimerRef.current = setTimeout(() => {
      contentClickTimerRef.current = null
      setToolbarVisible((v) => !v)
    }, 250)
  }

  const handleReturnToOrigin = () => {
    const el = containerRef.current
    if (!el || jumpOriginPct === null) return
    const { scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) return
    ignoreJumpRef.current = true
    el.scrollTo({ top: (jumpOriginPct / 100) * maxScroll, behavior: 'smooth' })
    setJumpOriginPct(null)
  }

  const handleRefetch = () => {
    setShowRefetchDialog(false)
    if (!article?.link) return

    const el = containerRef.current
    if (el) {
      scrollPositionRef.current = el.scrollTop
    }

    deleteFetchedContent(article.link)
    setFetchError(null)
    setRefetchTrigger((prev) => prev + 1)
  }

  const handleBack = () => {
    if (locationState?.fromFavorites && feedId) {
      navigate(`/feed/${feedId}/favorites`)
      return
    }
    navigate(`/feed/${feedId}`)
  }

  const contentSurfaceStyle: React.CSSProperties = {
    maxWidth: pagePadding > 0 ? `${100 - pagePadding * 2}%` : '100%',
    color: background.textColor,
    textShadow: background.isDarkScheme ? '0 1px 2px rgba(0,0,0,0.22)' : 'none',
    ['--reader-link-color' as string]: background.linkColor,
  }

  if (!article) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ color: background.textColor }}>
        <div className="absolute inset-0" style={getBackgroundLayerStyle(background)} />
        <div className="absolute inset-0" style={{ backgroundColor: background.pageScrim }} />
        <div
          className="relative z-10 text-center rounded-3xl px-8 py-10 backdrop-blur-md"
          style={{
            backgroundColor: background.surfaceOverlay,
            border: `1px solid ${background.borderColor}`,
          }}
        >
          <p className="mb-4">{t('文章未找到', 'Article not found')}</p>
          <button onClick={handleBack} className="hover:underline" style={{ color: background.linkColor }}>
            {t('返回列表', 'Back to list')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col" style={{ color: background.textColor }}>
      <div className="absolute inset-0" style={getBackgroundLayerStyle(background)} />
      <div className="absolute inset-0" style={{ backgroundColor: background.pageScrim }} />

      <div
        className={`absolute top-0 left-0 right-0 z-40 px-4 py-3 transition-transform duration-300 ease-out ${
          toolbarVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleBack()
            }}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg pointer-events-auto"
          >
            {t('\u8fd4\u56de', 'Back')}
          </button>

          <div className="flex items-center gap-2.5 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleFavorite()
              }}
              className={`p-2 rounded-lg transition-colors shadow-lg ${
                isFavorited ? 'text-amber-500' : 'hover:bg-white/10 bg-white/20'
              }`}
              style={{ backgroundColor: background.surfaceOverlay, color: background.textColor }}
              title={
                isFavorited
                  ? t('\u53d6\u6d88\u6536\u85cf', 'Remove favorite')
                  : t('\u6536\u85cf', 'Favorite')
              }
              aria-pressed={isFavorited}
            >
              <StarIcon filled={isFavorited} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowRefetchDialog(true)
              }}
              disabled={fetching}
              className={`p-2 rounded-lg transition-colors shadow-lg ${
                fetching ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 bg-white/20'
              }`}
              style={{ backgroundColor: background.surfaceOverlay, color: background.textColor }}
              title={t('\u91cd\u65b0\u6293\u53d6', 'Refetch')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={handleContentClick}
        onDoubleClick={() => {
          if (contentClickTimerRef.current) {
            clearTimeout(contentClickTimerRef.current)
            contentClickTimerRef.current = null
          }
          lastContentClickRef.current = 0
        }}
        className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-14 pb-8 px-3 sm:px-4 cursor-default"
      >
        <div className="mx-auto" style={contentSurfaceStyle}>
          <h1
            className="font-bold mb-6"
            style={{ fontFamily: font.fontFamily, fontSize: `${fontSize * 1.25}px`, lineHeight }}
          >
            {article.title}
          </h1>
          {fetching ? (
            <p className="opacity-80 py-8">{t('正在抓取正文...', 'Fetching article...')}</p>
          ) : hasRenderableArticleContent || usableFetchedContent ? (
            <article
              className="reader-content [&_img]:max-w-full [&_a]:hover:underline [&_p]:my-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_ul]:my-2 [&_ol]:my-2"
              style={{
                fontFamily: font.fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight,
                color: background.textColor,
                ['--reader-link-color' as string]: background.linkColor,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  (hasRenderableArticleContent ? articleContent : '') ||
                  usableFetchedContent ||
                  t('暂无正文', 'No content'),
              }}
            />
          ) : fetchError ? (
            <div className="space-y-4">
              <p className="opacity-80">{fetchError}</p>
            </div>
          ) : (
            <p className="opacity-80">
              {t(
                '原文抓取失败，请稍后重试，或在新窗口打开原文。',
                'Failed to fetch article. Please try again or open in a new tab.'
              )}
            </p>
          )}
          <div
            className="mt-8 pt-4 border-t flex items-center justify-between gap-4"
            style={{ borderColor: background.borderColor }}
          >
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 hover:underline"
              style={{ color: background.linkColor }}
            >
              {t('在新窗口打开原文 ->', 'Open original ->')}
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleToggleRead()
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                isRead
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isRead ? t('已标记已读', 'Read') : t('标记已读', 'Mark as read')}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          jumpOriginPct !== null
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReturnToOrigin()
          }}
          className="px-4 py-2 rounded-full backdrop-blur-md shadow-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: background.surfaceOverlay,
            color: background.textColor,
            border: `1px solid ${background.borderColor}`,
          }}
        >
          {t('返回原进度', 'Return to position')}
        </button>
      </div>

      {brightness !== 1 && (
        <div
          className="fixed inset-0 z-30 pointer-events-none"
          style={{
            backgroundColor:
              brightness < 1
                ? `rgba(0,0,0,${1 - brightness})`
                : `rgba(255,255,255,${brightness - 1})`,
          }}
        />
      )}

      {showRefetchDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowRefetchDialog(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl shadow-xl p-6"
            style={{
              backgroundColor: background.surfaceOverlay,
              color: background.textColor,
              border: `1px solid ${background.borderColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">
              {fetchError ? t('抓取失败', 'Fetch Failed') : t('重新获取文章', 'Refetch Article')}
            </h2>
            <p className="mb-6 opacity-80">
              {fetchError
                ? t('检测到抓取错误，是否重新获取？', 'Fetch error detected. Refetch now?')
                : t('确定要重新获取这篇文章吗？', 'Are you sure you want to refetch this article?')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRefetchDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg transition-colors"
                style={{ border: `1px solid ${background.borderColor}` }}
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleRefetch}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                {t('确认', 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReaderToolbar
        visible={toolbarVisible}
        progress={progress}
        onProgressChange={handleProgressChange}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
        pagePadding={pagePadding}
        onPagePaddingChange={setPagePadding}
        fontId={fontId}
        onFontChange={setFontId}
        colorId={colorId}
        onColorChange={setColorId}
        backgroundVariantId={backgroundVariantId}
        onBackgroundVariantChange={setBackgroundVariantId}
      />
    </div>
  )
}
