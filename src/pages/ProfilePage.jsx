import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-600 uppercase tracking-wide font-medium px-1">{title}</p>
      <div className="card space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, perfil, cargarPerfil } = useAuth()

  const [nombre, setNombre]       = useState(perfil?.nombre ?? '')
  const [savingNombre, setSavingNombre] = useState(false)
  const [nombreOk, setNombreOk]   = useState(false)
  const [nombreErr, setNombreErr] = useState('')

  const [passActual, setPassActual]   = useState('')
  const [passNueva, setPassNueva]     = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [savingPass, setSavingPass]   = useState(false)
  const [passOk, setPassOk]     = useState(false)
  const [passErr, setPassErr]   = useState('')

  const iniciales = (perfil?.nombre || user?.email || '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  async function handleGuardarNombre(e) {
    e.preventDefault()
    const nuevo = nombre.trim()
    if (!nuevo) return
    setSavingNombre(true)
    setNombreErr('')
    setNombreOk(false)
    const { error } = await supabase
      .from('users').update({ nombre: nuevo }).eq('id', user.id)
    if (error) {
      setNombreErr('No se pudo guardar. Intentá de nuevo.')
    } else {
      setNombreOk(true)
      cargarPerfil(user.id)
      setTimeout(() => setNombreOk(false), 3000)
    }
    setSavingNombre(false)
  }

  async function handleCambiarPass(e) {
    e.preventDefault()
    setPassErr('')
    setPassOk(false)
    if (passNueva.length < 6) {
      setPassErr('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (passNueva !== passConfirm) {
      setPassErr('Las contraseñas no coinciden.')
      return
    }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passNueva })
    if (error) {
      setPassErr(error.message === 'New password should be different from the old password.'
        ? 'La nueva contraseña debe ser diferente a la actual.'
        : 'No se pudo cambiar. Intentá de nuevo.')
    } else {
      setPassOk(true)
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
      setTimeout(() => setPassOk(false), 4000)
    }
    setSavingPass(false)
  }

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all">
          ‹
        </button>
        <h1 className="text-xl font-bold text-zinc-100">Mi perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-violet-700
                        flex items-center justify-center text-2xl font-bold text-white">
          {iniciales}
        </div>
        <div className="text-center">
          <p className="font-semibold text-zinc-100">{perfil?.nombre || user?.email?.split('@')[0]}</p>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
      </div>

      {/* Datos */}
      <Section title="Datos de la cuenta">
        <form onSubmit={handleGuardarNombre} className="space-y-4">
          <Field label="Nombre">
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="input-dark w-full"
            />
          </Field>
          <Field label="Email">
            <p className="text-sm text-zinc-400 bg-zinc-800/50 border border-zinc-800 rounded-xl px-3 py-2.5">
              {user?.email}
            </p>
            <p className="text-[11px] text-zinc-600">El email no se puede cambiar desde aquí.</p>
          </Field>
          {nombreErr && <p className="text-xs text-rose-400">{nombreErr}</p>}
          {nombreOk  && <p className="text-xs text-emerald-400">✓ Nombre actualizado</p>}
          <button type="submit" disabled={savingNombre || !nombre.trim()}
            className="btn-primary py-2.5 text-sm disabled:opacity-40">
            {savingNombre ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </form>
      </Section>

      {/* Contraseña */}
      <Section title="Seguridad">
        <form onSubmit={handleCambiarPass} className="space-y-4">
          <Field label="Nueva contraseña">
            <input
              type="password"
              value={passNueva}
              onChange={e => setPassNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="input-dark w-full"
            />
          </Field>
          <Field label="Confirmar contraseña">
            <input
              type="password"
              value={passConfirm}
              onChange={e => setPassConfirm(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              className="input-dark w-full"
            />
          </Field>
          {passErr && <p className="text-xs text-rose-400">{passErr}</p>}
          {passOk  && <p className="text-xs text-emerald-400">✓ Contraseña actualizada</p>}
          <button type="submit" disabled={savingPass || !passNueva || !passConfirm}
            className="btn-primary py-2.5 text-sm disabled:opacity-40">
            {savingPass ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </Section>

    </div>
  )
}
