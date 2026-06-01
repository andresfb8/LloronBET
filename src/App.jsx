import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { db } from './firebase'
import { BADGES } from './utils/constants'
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
import HistoryPage from './pages/HistoryPage'
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
          <Route path="/history"        element={<HistoryPage />} />
          <Route path="/admin"          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <BadgeNotification />
    </div>
  )
}

function BadgeNotification() {
  const { user, profile } = useAuth()
  const [visible, setVisible] = useState(false)
  const [badges, setBadges]   = useState([])

  useEffect(() => {
    const newBadges = profile?.newBadges ?? []
    if (newBadges.length > 0) {
      setBadges(newBadges)
      setVisible(true)
    }
  }, [profile?.newBadges?.length])

  async function dismiss() {
    setVisible(false)
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { newBadges: [] }).catch(() => {})
    }
  }

  if (!visible || badges.length === 0) return null

  const badgeDefs = badges
    .map(id => BADGES.find(b => b.id === id))
    .filter(Boolean)

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {badgeDefs.map(badge => (
        <div
          key={badge.id}
          className="pointer-events-auto bg-surface border border-odds/50 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <span className="text-2xl shrink-0">{badge.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-semibold text-odds uppercase tracking-widest">¡Nuevo logro!</p>
            <p className="text-sm font-body font-semibold text-white">{badge.name}</p>
            <p className="text-xs text-muted">{badge.desc}</p>
          </div>
          <button onClick={dismiss} className="shrink-0 text-muted hover:text-white text-xl leading-none p-1">×</button>
        </div>
      ))}
    </div>
  )
}
