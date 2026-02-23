import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArticlesCache, getFetchedContent, setFetchedContent, deleteFetchedContent } from '../utils/storage'
import { getReadingProgress, setReadingProgress, isArticleRead, toggleArticleRead } from '../utils/readingProgress'
import { getReadingPreferences, saveReadingPreferences } from '../utils/preferences'
import { fetchArticleContent } from '../hooks/useFetchArticle'
import { ReaderToolbar, FONT_OPTIONS, BG_OPTIONS } from '../components/ReaderToolbar'

const DEBOUNCE_MS = 300
const DOUBLE_CLICK_MS = 350
const SETTLE_MS = 500
const JUMP_THRESHOLD_SCREENS = 2
const SHORT_CONTENT_TEXT_LEN = 120
const DOUBLE_BR_RE = /<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/i
const BLOCK_BOUNDARY_RE = /<\/(p|div|section|article)>\s*<(p|div|section|article)\b/i
const HR_RE = /<hr\b/i

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

export function ReaderPage() {
  const { feedId, articleId } = useParams<{ feedId: string; articleId: string }>()
  const navigate = useNavigate()
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

  const prefs = getReadingPreferences()
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jumpOriginPct, setJumpOriginPct] = useState<number | null>(null)
  const [fontId, setFontId] = useState(prefs.fontId)
  const [fontSize, setFontSize] = useState(prefs.fontSize)
  const [lineHeight, setLineHeight] = useState(prefs.lineHeight)
  const [pagePadding, setPagePadding] = useState(prefs.pagePadding)
  const [bgId, setBgId] = useState(prefs.bgId)
  const [brightness, setBrightness] = useState(prefs.brightness)

  const decodedId = articleId ? decodeURIComponent(articleId) : ''
  const cached = feedId ? getArticlesCache(feedId) : null
  const article = cached?.articles?.find((a) => a.id === decodedId)
  const articleContent = article?.content ?? null

  useEffect(() => {
    return () => {
      if (contentClickTimerRef.current) {
        clearTimeout(contentClickTimerRef.current)
        contentClickTimerRef.current = null
      }
    }
  }, [])

  // 关闭标签页或切到后台时即时保存进度，防止丢失
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
  }, [feedId, decodedId])

  const [, setReadVersion] = useState(0)
  const isRead = feedId && decodedId ? isArticleRead(feedId, decodedId) : false

  const handleToggleRead = () => {
    if (!feedId || !decodedId) return
    toggleArticleRead(feedId, decodedId)
    setReadVersion((v) => v + 1)
  }

  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchedContent = article ? getFetchedContent(article.link) : null
  const hasRenderableArticleContent = isStructuredHtml(articleContent)
  const hasRenderableFetchedContent = isStructuredHtml(fetchedContent)
  const usableFetchedContent = hasRenderableFetchedContent ? fetchedContent : null

  const font = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0]
  const bg = BG_OPTIONS.find((b) => b.id === bgId) ?? BG_OPTIONS[0]

  useEffect(() => {
    feedIdRef.current = feedId ?? ''
    decodedIdRef.current = decodedId
    jumpOriginPctRef.current = jumpOriginPct
  }, [feedId, decodedId, jumpOriginPct])

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
    // 防抖保存进度
    if (saveProgressTimerRef.current) clearTimeout(saveProgressTimerRef.current)
    saveProgressTimerRef.current = setTimeout(() => {
      if (feedId && decodedId) setReadingProgress(feedId, decodedId, effectivePct)
      saveProgressTimerRef.current = null
    }, DEBOUNCE_MS)
    // 停留点检测：500ms 无新 scroll → 用户已停下，比较与上一停留点的距离
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
        if (feedId && decodedId) setReadingProgress(feedId, decodedId, originPct)
      } else if (jumpOriginPctRef.current !== null && Math.abs(curPct - jumpOriginPctRef.current) < 3) {
        setJumpOriginPct(null)
        if (feedId && decodedId) setReadingProgress(feedId, decodedId, curPct)
      }
      settledPctRef.current = curPct
    }, SETTLE_MS)
  }, [feedId, decodedId])

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
      // 离开页面前即时保存当前进度
      const { scrollTop, scrollHeight, clientHeight } = el
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll > 0 && feedId && decodedId) {
        const rawPct = (scrollTop / maxScroll) * 100
        setReadingProgress(feedId, decodedId, getEffectiveProgress(rawPct, jumpOriginPctRef.current))
      }
    }
  }, [updateProgress, article, feedId, decodedId])

  // 偏好变更时持久化
  useEffect(() => {
    saveReadingPreferences({ fontId, fontSize, lineHeight, pagePadding, bgId, brightness })
  }, [fontId, fontSize, lineHeight, pagePadding, bgId, brightness])

  // 进入页面时恢复阅读进度（上次读到哪里，下次接着读）
  const contentReady = article && (hasRenderableArticleContent || usableFetchedContent || fetchError)
  useEffect(() => {
    if (!contentReady || !feedId || !decodedId || hasRestoredRef.current) return
    const saved = getReadingProgress(feedId, decodedId)
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
  }, [contentReady, feedId, decodedId])

  const needsFetch = !!(article && !hasRenderableArticleContent && !usableFetchedContent && !fetchError)
  useEffect(() => {
    if (!needsFetch || !article?.link) return
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
        })
        .catch((err) => {
          if (cancelled) return
          const msg = err instanceof Error ? err.message : '抓取失败'
          if (msg === '请求已取消') return
          setFetchError('抓取失败，请刷新标签页')
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
  }, [needsFetch, article?.link])

  const handleProgressChange = (value: number) => {
    const el = containerRef.current
    if (!el) return
    const { scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) return
    el.scrollTop = (value / 100) * maxScroll
    setProgress(value)
    const effectiveValue = getEffectiveProgress(value, jumpOriginPctRef.current)
    if (feedId && decodedId) setReadingProgress(feedId, decodedId, effectiveValue)
  }

  const handleContentClick = () => {
    const clearPending = () => {
      if (contentClickTimerRef.current) {
        clearTimeout(contentClickTimerRef.current)
        contentClickTimerRef.current = null
      }
    }
    // 拖动选中文字或双击选中文字时，不呼出操作栏
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0) {
      clearPending()
      return
    }
    const now = Date.now()
    if (now - lastContentClickRef.current < DOUBLE_CLICK_MS) {
      // 双击：取消待执行的切换，不呼出操作栏
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

  const handleBack = () => navigate(`/feed/${feedId}`)

  if (!article) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: bg.bg, color: bg.text }}
      >
        <div className="text-center">
          <p className="mb-4">文章未找到</p>
          <button
            onClick={handleBack}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: bg.bg, color: bg.text }}
    >
      {/* 顶部返回按钮 - 与操作栏同步显示/隐藏 */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-3 transition-transform duration-300 ease-out ${
          toolbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <button
          onClick={handleBack}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          ← 返回
        </button>
      </div>

      {/* 可滚动内容区 - 单击唤出/收起操作栏，双击不触发 */}
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
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-14 pb-8 px-3 sm:px-4 cursor-default"
      >
        <div className="mx-auto" style={{ maxWidth: pagePadding > 0 ? `${100 - pagePadding * 2}%` : '100%' }}>
          <h1 className="font-bold mb-6" style={{ fontFamily: font.fontFamily, fontSize: `${fontSize * 1.25}px`, lineHeight }}>
            {article.title}
          </h1>
          {fetching ? (
            <p className="opacity-80 py-8">抓取原文中…</p>
          ) : (hasRenderableArticleContent || usableFetchedContent) ? (
              <article
                className={`reader-content [&_img]:max-w-full [&_a]:hover:underline [&_p]:my-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_ul]:my-2 [&_ol]:my-2 ${
                  bgId === 'dark' ? '[&_a]:text-sky-300' : '[&_a]:text-blue-600'
                }`}
                style={{ fontFamily: font.fontFamily, fontSize: `${fontSize}px`, lineHeight }}
                dangerouslySetInnerHTML={{
                  __html:
                    (hasRenderableArticleContent ? articleContent : '') ||
                    usableFetchedContent ||
                    '暂无正文',
                }}
              />
          ) : fetchError ? (
            <div className="space-y-4">
              <p className="opacity-80">{fetchError}</p>
            </div>
          ) : (
            <p className="opacity-80">原文抓取失败，请退出重试，或在新窗口打开原文</p>
          )}
          <div className="mt-8 pt-4 border-t flex items-center justify-between" style={{ borderColor: bg.text }}>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`opacity-35 ${bgId === 'dark' ? 'text-sky-300 hover:underline' : 'text-blue-600 hover:underline'}`}
            >
              在新窗口打开原文 →
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleRead() }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                isRead
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isRead ? '✅ 已标记' : '标记已读'}
            </button>
          </div>
        </div>
      </div>

      {/* 回到原进度按钮 */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          jumpOriginPct !== null
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleReturnToOrigin() }}
          className="px-4 py-2 rounded-full backdrop-blur-md shadow-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: bgId === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            color: bg.text,
          }}
        >
          ↑ 回到原进度
        </button>
      </div>

      {/* 屏幕亮度遮罩：覆盖整个阅读区域，模拟调节屏幕亮度 */}
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
        bgId={bgId}
        onBgChange={setBgId}
      />
    </div>
  )
}
