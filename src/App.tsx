import { Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from './hooks/useToast'
import Header from './components/Header'
import Landing from './pages/Landing'
import Home from './pages/Home'
import WordLibrary from './pages/WordLibrary'
import Settings from './pages/Settings'

export default function App() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  return (
    <ToastProvider>
      <div className="min-h-screen bg-paper text-ink">
        {!isLanding && <Header />}
        <main className={isLanding ? '' : 'mx-auto max-w-5xl px-5 pb-24 pt-8 sm:pt-12'}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/write" element={<Home />} />
            <Route path="/word-library" element={<WordLibrary />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        {!isLanding && (
          <footer className="mx-auto max-w-5xl px-5 pb-10 text-center text-xs text-muted/70">
            词雾 · 一个安静的词汇灵感写作工具 · 数据仅保存在本机浏览器
          </footer>
        )}
      </div>
    </ToastProvider>
  )
}
