import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ArticleListPage } from './pages/ArticleListPage'
import { ReaderPage } from './pages/ReaderPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed/:feedId" element={<ArticleListPage />} />
        <Route path="/read/:feedId/:articleId" element={<ReaderPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
