import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ArticleListPage } from './pages/ArticleListPage'
import { ReaderPage } from './pages/ReaderPage'

// 支持 GitHub Pages 子路径：base 为 /RSSnow/ 时 basename 为 /RSSnow
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed/:feedId" element={<ArticleListPage />} />
        <Route path="/read/:feedId/:articleId" element={<ReaderPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
