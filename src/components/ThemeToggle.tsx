import { useEffect, useState } from 'react'
import { getLang, t } from '../i18n'
import { getTheme, onThemeChange, toggleTheme } from '../utils/theme'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="4.2" />
      <path strokeLinecap="round" d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23L5.46 5.46" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M14.62 2.7a1 1 0 0 1 .9 1.58 8.21 8.21 0 0 0 6.28 13.17 1 1 0 0 1 .66 1.77A10.92 10.92 0 1 1 14.1 2.82a1 1 0 0 1 .52-.12Z" />
    </svg>
  )
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setThemeState] = useState(getTheme())

  useEffect(() => {
    return onThemeChange(() => setThemeState(getTheme()))
  }, [])

  const isDark = theme === 'dark'
  const nextLabel = isDark ? t('切换到浅色模式', 'Switch to light mode') : t('切换到深色模式', 'Switch to dark mode')

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      className={`relative inline-flex h-11 w-[126px] items-center overflow-hidden rounded-full border px-4 transition-all duration-500 ease-out focus:outline-none ${className} ${
        isDark
          ? 'border-slate-600 bg-[#1E2A36] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.28)]'
          : 'border-slate-300 bg-slate-200 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(15,23,42,0.08)]'
      }`}
      aria-label={nextLabel}
      title={nextLabel}
      aria-pressed={isDark}
    >
      <span
        className={`pointer-events-none absolute top-1 flex h-9 w-12 items-center justify-center rounded-full transition-all duration-500 ease-out ${
          isDark
            ? 'left-[72px] bg-[#2D3B48] text-slate-200 shadow-[0_8px_18px_rgba(0,0,0,0.35)]'
            : 'left-[6px] bg-white text-amber-500 shadow-[0_8px_18px_rgba(148,163,184,0.45)]'
        }`}
      >
        <span className={`absolute transition-all duration-300 ${isDark ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`}>
          <SunIcon />
        </span>
        <span className={`absolute transition-all duration-300 ${isDark ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`}>
          <MoonIcon />
        </span>
      </span>
      <span
        className={`pointer-events-none absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/70 transition-all duration-500 ${
          isDark ? 'left-[24px] opacity-20' : 'right-[20px] opacity-0'
        }`}
      />
      <span
        className={`pointer-events-none absolute top-[13px] h-1 w-1 rounded-full bg-white/60 transition-all duration-500 ${
          isDark ? 'left-[34px] opacity-30' : 'right-[30px] opacity-0'
        }`}
      />
      <span className="sr-only">{getLang() === 'zh' ? `当前${isDark ? '深色' : '浅色'}模式` : `Current mode: ${isDark ? 'dark' : 'light'}`}</span>
    </button>
  )
}
