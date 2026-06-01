import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!profile) return null

  const initials = profile.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">
      {/* Avatar + nombre */}
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center font-display font-bold text-xl text-white flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-xl text-white truncate">{profile.username}</p>
          <p className="text-muted text-sm truncate">{profile.email}</p>
          {profile.role === 'admin' && (
            <span className="text-xs font-display font-semibold text-odds">ADMIN</span>
          )}
        </div>
      </div>

      {/* Puntos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-xs font-display uppercase tracking-widest text-muted mb-1">Puntos totales</p>
          <p className="font-display font-bold text-3xl text-win">{(profile.totalPoints ?? 0).toFixed(1)}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-xs font-display uppercase tracking-widest text-muted mb-1">Pre-Mundial</p>
          <p className="font-display font-bold text-3xl text-odds">{(profile.longTermPoints ?? 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Links */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <Link to="/faq" className="flex items-center justify-between px-4 py-4 border-b border-border hover:bg-odds-default transition-colors">
          <span className="text-sm font-body font-semibold text-white">❓ Preguntas frecuentes</span>
          <span className="text-muted">›</span>
        </Link>
        {profile.role === 'admin' && (
          <Link to="/admin" className="flex items-center justify-between px-4 py-4 border-b border-border hover:bg-odds-default transition-colors">
            <span className="text-sm font-body font-semibold text-odds">⚙️ Panel de administración</span>
            <span className="text-muted">›</span>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-odds-default transition-colors"
        >
          <span className="text-sm font-body font-semibold text-live">Cerrar sesión</span>
          <span className="text-muted">›</span>
        </button>
      </div>
    </div>
  )
}
