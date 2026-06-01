import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BADGES } from '../utils/constants'

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

      {/* Logros */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Mis logros</span>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map(badge => {
            const earned = (profile.badges ?? []).includes(badge.id)
            return (
              <div key={badge.id} className="flex flex-col items-center gap-1 text-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  earned ? 'bg-odds/20 border border-odds/40' : 'bg-odds-default border border-border opacity-40'
                }`}>
                  {badge.emoji}
                </div>
                <p className={`text-xs font-display font-semibold leading-tight ${earned ? 'text-white' : 'text-muted'}`}>
                  {badge.name}
                </p>
                {!earned && (
                  <p className="text-xs text-muted leading-tight" style={{ fontSize: '10px' }}>{badge.desc}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Links */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <Link to="/history" className="flex items-center justify-between px-4 py-4 border-b border-border hover:bg-odds-default transition-colors">
          <span className="text-sm font-body font-semibold text-white">📋 Mi historial de predicciones</span>
          <span className="text-muted">›</span>
        </Link>
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
