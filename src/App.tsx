import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ArticleListPage } from './pages/ArticleListPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { ReaderPage } from './pages/ReaderPage'
import { getLang } from './i18n'
import { applyTheme, getTheme, onThemeChange } from './utils/theme'

// 支持 GitHub Pages 子路径：base 为 /RSSnow/ 时 basename 为 /RSSnow
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function App() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const h = () => rerender((v) => v + 1)
    window.addEventListener('langchange', h)
    return () => window.removeEventListener('langchange', h)
  }, [])

  useEffect(() => {
    applyTheme(getTheme())
    return onThemeChange(() => applyTheme(getTheme()))
  }, [])

  return (
    <BrowserRouter key={getLang()} basename={basename}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed/:feedId" element={<ArticleListPage />} />
        <Route path="/feed/:feedId/favorites" element={<FavoritesPage />} />
        <Route path="/read/:feedId/:articleId" element={<ReaderPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
