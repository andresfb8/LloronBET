import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({
    username:  '',
    email:     '',
    password:  '',
    password2: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function validate() {
    const errs = {}
    if (!form.username.trim())            errs.username   = 'Introduce tu nombre.'
    if (!form.email.trim())               errs.email      = 'Introduce tu email.'
    if (form.password.length < 6)         errs.password   = 'Mínimo 6 caracteres.'
    if (form.password !== form.password2) errs.password2 = 'Las contraseñas no coinciden.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setErrors({})
    setLoading(true)
    try {
      await signUp(form.email.trim(), form.password, form.username.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setErrors({ submit: mapError(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 text-center flex flex-col items-center">
        <img src="/logo.png" alt="LloronBET" className="h-24 w-auto" />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-lg">
        <h2 className="font-display text-xl font-semibold text-white mb-6">Crear cuenta</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Tu nombre"
            type="text"
            placeholder="Cómo te conocen"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
            autoComplete="nickname"
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
          />
          <Input
            label="Repite la contraseña"
            type="password"
            placeholder="••••••••"
            value={form.password2}
            onChange={set('password2')}
            error={errors.password2}
            autoComplete="new-password"
          />
          {errors.submit && (
            <p className="text-live text-sm text-center">{errors.submit}</p>
          )}

          <Button
            type="submit"
            className="w-full mt-2 py-3 text-base"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </Button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-odds hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

function mapError(err) {
  // Errores de Firebase Auth
  switch (err.code) {
    case 'auth/email-already-in-use': return 'Ese email ya está registrado.'
    case 'auth/invalid-email':        return 'Email no válido.'
    case 'auth/weak-password':        return 'Contraseña demasiado débil.'
    default:                          return 'Error al crear la cuenta. Inténtalo de nuevo.'
  }
}
