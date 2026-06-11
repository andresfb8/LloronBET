import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'

const PUBLIC_PATHS = ['/faq']

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-svh bg-bg flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user && !PUBLIC_PATHS.includes(location.pathname)) return <Navigate to="/login" replace />
  if (requireAdmin && profile?.role !== 'admin') return <Navigate to="/" replace />

  return children
}
