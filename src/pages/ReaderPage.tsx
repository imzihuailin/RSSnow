import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArticlesCache, getFetchedContent, setFetchedContent } from '../utils/storage'
import { fetchArticleContent } from '../hooks/useFetchArticle'
import { ReaderToolbar, FONT_OPTIONS, BG_OPTIONS } from '../components/ReaderToolbar'

export function ReaderPage() {
  const { feedId, articleId } = useParams<{ feedId: string; articleId: string }>()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fontId, setFontId] = useState('serif')
  const [bgId, setBgId] = useState('white')

  const decodedId = articleId ? decodeURIComponent(articleId) : ''
  const cached = feedId ? getArticlesCache(feedId) : null
  const article = cached?.articles?.find((a) => a.id === decodedId)
  const [fetchedContent, setFetchedContentState] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!article) return
    if (article.content || article.description) return
    const cached = getFetchedContent(article.link)
    if (cached) setFetchedContentState(cached)
  }, [article])

  const font = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0]
  const bg = BG_OPTIONS.find((b) => b.id === bgId) ?? BG_OPTIONS[0]

  const updateProgress = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) {
      setProgress(100)
      return
    }
    setProgress((scrollTop / maxScroll) * 100)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    updateProgress()
    el.addEventListener('scroll', updateProgress, { passive: true })
    return () => el.removeEventListener('scroll', updateProgress)
  }, [updateProgress, article])

  const needsFetch = article && !article.content && !article.description && !fetchedContent && !fetching && !fetchError
  useEffect(() => {
    if (!needsFetch || !article?.link) return
    setFetching(true)
    setFetchError(null)
    fetchArticleContent(article.link)
      .then((content) => {
        setFetchedContentState(content)
        setFetchedContent(article.link, content)
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : '抓取失败')
      })
      .finally(() => {
        setFetching(false)
      })
  }, [needsFetch, article?.link])

  const handleProgressChange = (value: number) => {
    const el = containerRef.current
    if (!el) return
    const { scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    if (maxScroll <= 0) return
    el.scrollTop = (value / 100) * maxScroll
    setProgress(value)
  }

  const handleContentClick = () => {
    setToolbarVisible((v) => !v)
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
      {/* 顶部返回按钮 - 始终可见 */}
      <div className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center px-4 py-3">
        <button
          onClick={handleBack}
          className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          style={{ color: bg.text }}
        >
          ← 返回
        </button>
      </div>

      {/* 可滚动内容区 - 点击唤出/收起操作栏 */}
      <div
        ref={containerRef}
        onClick={handleContentClick}
        className="flex-1 overflow-y-auto overscroll-contain pt-14 pb-8 px-4 cursor-default"
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: font.fontFamily }}>
            {article.title}
          </h1>
          {fetching ? (
            <p className="opacity-80 py-8">抓取原文中…</p>
          ) : (article.content || article.description || fetchedContent) ? (
              <article
                className={`reader-content [&_img]:max-w-full [&_a]:hover:underline [&_p]:my-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_ul]:my-2 [&_ol]:my-2 ${
                  bgId === 'dark' ? '[&_a]:text-sky-300' : '[&_a]:text-blue-600'
                }`}
                style={{ fontFamily: font.fontFamily }}
                dangerouslySetInnerHTML={{
                  __html:
                    article.content ||
                    article.description ||
                    fetchedContent ||
                    '暂无正文',
                }}
              />
          ) : fetchError ? (
            <div className="space-y-4">
              <p className="opacity-80">{fetchError}</p>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className={bgId === 'dark' ? 'text-sky-300 hover:underline' : 'text-blue-600 hover:underline'}
              >
                在新窗口打开原文 →
              </a>
            </div>
          ) : (
            <p className="opacity-80">暂无正文</p>
          )}
          <p className="mt-8 pt-4 border-t opacity-20" style={{ borderColor: bg.text }}>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className={bgId === 'dark' ? 'text-sky-300 hover:underline' : 'text-blue-600 hover:underline'}
            >
              在新窗口打开原文 →
            </a>
          </p>
        </div>
      </div>

      <ReaderToolbar
        visible={toolbarVisible}
        progress={progress}
        onProgressChange={handleProgressChange}
        fontId={fontId}
        onFontChange={setFontId}
        bgId={bgId}
        onBgChange={setBgId}
      />
    </div>
  )
}
