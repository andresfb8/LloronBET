import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { BADGES } from '../utils/constants'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [editing, setEditing]   = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function startEdit() {
    setNewName(profile.username ?? '')
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError('')
  }

  async function handleSave() {
    const trimmed = newName.trim()
    if (!trimmed) { setError('El nombre no puede estar vacío.'); return }
    if (trimmed === profile.username) { setEditing(false); return }

    setSaving(true)
    setError('')
    try {
      await updateDoc(doc(db, 'users', user.uid), { username: trimmed })
      setEditing(false)
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
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
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit() }}
                autoFocus
                maxLength={30}
                className="w-full bg-odds-default border border-primary rounded-lg px-3 py-1.5 text-white text-sm font-body focus:outline-none"
              />
              {error && <p className="text-xs text-live">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary text-white text-xs font-display font-semibold py-1.5 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 bg-odds-default text-muted text-xs font-display font-semibold py-1.5 rounded-lg border border-border"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-display font-bold text-xl text-white truncate">{profile.username}</p>
              <button
                onClick={startEdit}
                className="shrink-0 text-muted hover:text-white text-xs font-display font-semibold transition-colors"
                title="Cambiar nombre"
              >
                ✏️
              </button>
            </div>
          )}
          {!editing && (
            <>
              <p className="text-muted text-sm truncate">{profile.email}</p>
              {profile.role === 'admin' && (
                <span className="text-xs font-display font-semibold text-odds">ADMIN</span>
              )}
            </>
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
