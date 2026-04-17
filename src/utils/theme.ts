export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'rssnow_theme'
const THEME_CHANGE_EVENT = 'themechange'

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function getTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return isThemeMode(value) ? value : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  const isDark = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.dataset.theme = theme
  document.body.classList.toggle('dark', isDark)
  document.body.dataset.theme = theme
  const root = document.getElementById('root')
  if (root) {
    root.classList.toggle('dark', isDark)
    root.dataset.theme = theme
  }
}

export function setTheme(theme: ThemeMode): void {
  applyTheme(theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function toggleTheme(): ThemeMode {
  const nextTheme: ThemeMode = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(nextTheme)
  return nextTheme
}

export function onThemeChange(listener: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, listener)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, listener)
}
