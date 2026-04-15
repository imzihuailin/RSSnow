import { useState } from 'react'
import { t } from '../i18n'

interface AddFeedModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (url: string) => Promise<void>
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function AddFeedModal({ isOpen, onClose, onAdd }: AddFeedModalProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = url.trim()
    if (!trimmed) {
      setError(t('请输入 RSS 地址', 'Please enter an RSS URL'))
      return
    }
    if (!isValidUrl(trimmed)) {
      setError(t('请输入有效的 URL 地址', 'Please enter a valid URL'))
      return
    }

    setLoading(true)
    try {
      await onAdd(trimmed)
      setUrl('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('添加失败，请检查 RSS 地址是否正确', 'Failed to add. Please check the RSS URL.'))
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-transparent bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#16222D] dark:shadow-black/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{t('添加 RSS 订阅', 'Add RSS Feed')}</h2>
        <div className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          <p className="mb-2 font-medium text-slate-700 dark:text-slate-200">{t('如何获取 RSS 地址？', 'How to get an RSS URL?')}</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>{t('打开博客或网站，查找“订阅”“RSS”或“Feed”等链接', 'Open a blog or website, look for "Subscribe", "RSS", or "Feed" links')}</li>
            <li>
              {t('常见形式：', 'Common formats: ')}
              <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">/feed</code>
              {' '}
              <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">/rss.xml</code>
              {' '}
              <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">/atom.xml</code>
            </li>
            <li>{t('右键链接，复制链接地址，粘贴到下方', 'Right-click the link, copy link address, paste below')}</li>
            <li>
              {t('地址需以', 'URL must start with ')}
              <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">http://</code>
              {' '}
              {t('或', 'or')}
              {' '}
              <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">https://</code>
              {' '}
              {t('开头', '')}
            </li>
          </ol>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('请输入 RSS 地址，例如 https://example.com/feed.xml', 'Enter RSS URL, e.g. https://example.com/feed.xml')}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {t('取消', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('添加中...', 'Adding...') : t('添加', 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
