import { useAuth } from '../../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const onFaq     = location.pathname === '/faq'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-primary px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
      <img src="/logo.png" alt="LloronBET" className="h-9 w-auto" />
      <div className="flex items-center gap-3">
        {profile && (
          <span className="text-sm text-white/70 font-body">{profile.username}</span>
        )}
        <button
          onClick={() => navigate(onFaq ? -1 : '/faq')}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-display font-bold transition-colors ${
            onFaq
              ? 'bg-white text-primary'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title="Preguntas frecuentes"
        >
          ?
        </button>
      </div>
    </header>
  )
}
