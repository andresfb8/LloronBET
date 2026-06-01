import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(mapFirebaseError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 text-center flex flex-col items-center gap-3">
        <img src="/logo.png" alt="LloronBET" className="h-32 w-auto" />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-lg">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Iniciar sesión</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-live text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full mt-2 py-3 text-base"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-odds hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}

function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento.'
    case 'auth/user-disabled':
      return 'Cuenta deshabilitada.'
    default:
      return 'Error al iniciar sesión. Inténtalo de nuevo.'
  }
}
