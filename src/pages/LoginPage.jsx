import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensajeOk, setMensajeOk] = useState('')

  function resetForm() {
    setError('')
    setMensajeOk('')
    setNombre('')
    setEmail('')
    setPassword('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(traducirError(error.message))
    }
    // Si no hay error, el onAuthStateChange en AuthContext redirige solo
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre || email.split('@')[0] }
      }
    })

    if (error) {
      setError(traducirError(error.message))
    } else {
      setMensajeOk('¡Cuenta creada! Revisá tu email para confirmar y después entrá.')
    }
    setLoading(false)
  }

  function traducirError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
    if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de entrar. Revisá tu bandeja.'
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email.'
    if (msg.includes('Password should be')) return 'La contraseña tiene que tener al menos 6 caracteres.'
    return msg
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <img
          src="/favicon.svg"
          alt="Mis Numeritos"
          className="w-20 h-20 mx-auto mb-4 rounded-3xl shadow-2xl shadow-violet-900/50"
        />
        <h1 className="text-3xl font-extrabold text-zinc-100">Mis Numeritos</h1>
        <p className="text-zinc-500 text-sm mt-1">Tu plata, clara y simple.</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Tabs login / signup */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setTab('login'); resetForm() }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === 'login'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('signup'); resetForm() }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={tab === 'login' ? handleLogin : handleSignup}
          className="space-y-4"
        >
          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                Tu nombre
              </label>
              <input
                type="text"
                placeholder="Agus"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="input-dark"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              placeholder="vos@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-dark"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className="input-dark"
            />
            {tab === 'signup' && (
              <p className="text-xs text-zinc-600 mt-1">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* Éxito signup */}
          {mensajeOk && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <p className="text-emerald-400 text-sm">{mensajeOk}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-4 text-base mt-2"
          >
            {loading
              ? (tab === 'login' ? 'Entrando...' : 'Creando cuenta...')
              : (tab === 'login' ? 'Entrar' : 'Crear cuenta')
            }
          </button>
        </form>

        {/* Hint confirmación email */}
        {tab === 'signup' && !mensajeOk && (
          <p className="text-center text-xs text-zinc-600 mt-4">
            Vas a recibir un email de confirmación
          </p>
        )}
      </div>
    </div>
  )
}
