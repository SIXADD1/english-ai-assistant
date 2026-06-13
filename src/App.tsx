import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Home from './pages/Home/Home'
import Material from './pages/Material/Material'
import Training from './pages/Training/Training'
import TopicAnalysis from './pages/Training/TopicAnalysis/TopicAnalysis'
import MaterialApply from './pages/Training/MaterialApply/MaterialApply'
import OpenClose from './pages/Training/OpenClose/OpenClose'
import Format from './pages/Training/Format/Format'
import Writing from './pages/Writing/Writing'
import WritingPage from './pages/Writing/WritingPage'
import CorrectionSimple from './pages/Correction/CorrectionSimple'
import Personal from './pages/Personal/Personal'
import MockExam from './pages/MockExam/MockExam'
import ExamPage from './pages/MockExam/ExamPage'
import ExamResultPage from './pages/MockExam/ExamResultPage'
import Feedback from './pages/Feedback/Feedback'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import AdminLayout from './pages/Admin/AdminLayout'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import { useUserStore } from './stores/userStore'

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userInfo, isLoggedIn } = useUserStore()
  if (!isLoggedIn || userInfo?.role !== 'admin') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const App: React.FC = () => {
  const { userInfo, isLoggedIn } = useUserStore()

  if (isLoggedIn && userInfo?.role === 'admin') {
    return (
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#2563eb',
            colorLink: '#2563eb',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            borderRadius: 8,
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      >
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorLink: '#2563eb',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/material" element={<Material />} />
              <Route path="/training" element={<Training />} />
              <Route path="/training/topic" element={<TopicAnalysis />} />
              <Route path="/training/material" element={<MaterialApply />} />
              <Route path="/training/open-close" element={<OpenClose />} />
              <Route path="/training/format" element={<Format />} />
              <Route path="/writing" element={<Writing />} />
              <Route path="/writing/:id" element={<WritingPage />} />
              <Route path="/correction/:id" element={<CorrectionSimple />} />
              <Route path="/personal" element={<Personal />} />
              <Route path="/mock-exam" element={<MockExam />} />
              <Route path="/mock-exam/:examId/start" element={<ExamPage />} />
              <Route path="/mock-exam/result/:participationId" element={<ExamResultPage />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/admin/*" element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App