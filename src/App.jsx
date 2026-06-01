import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MatchListPage from './pages/MatchListPage'
import MatchDetailPage from './pages/MatchDetailPage'
import StandingsPage from './pages/StandingsPage'
import LongTermPage from './pages/LongTermPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import FaqPage from './pages/FaqPage'
import BottomNav from './components/layout/BottomNav'
import Navbar from './components/layout/Navbar'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-svh bg-bg text-white font-body">
      <Navbar />
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/"               element={<MatchListPage />} />
          <Route path="/match/:matchId" element={<MatchDetailPage />} />
          <Route path="/standings"      element={<StandingsPage />} />
          <Route path="/longterm"       element={<LongTermPage />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/faq"            element={<FaqPage />} />
          <Route path="/admin"          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
