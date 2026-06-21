import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCategorias } from '../hooks/useCategorias'
import { useMetas } from '../hooks/useMetas'
import Header from '../components/Layout/Header'

const TIPOS = [
  { id: 'gasto',   label: 'Gasto',   emoji: '📉', color: 'text-rose-400',    bg: 'bg-rose-500/20   border-rose-500/50'   },
  { id: 'ingreso', label: 'Ingreso', emoji: '📈', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/50' },
  { id: 'ahorro',  label: 'Ahorro',  emoji: '🏦', color: 'text-violet-400',  bg: 'bg-violet-500/20  border-violet-500/50'  },
]

function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default function RegistrarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { categorias } = useCategorias()
  const { metas } = useMetas()

  const [tipo, setTipo]               = useState('gasto')
  const [monto, setMonto]             = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [metaId, setMetaId]           = useState('')
  const [concepto, setConcepto]       = useState('')
  const [fecha, setFecha]             = useState(hoy())
  const [guardando, setGuardando]     = useState(false)
  const [exito, setExito]             = useState(false)
  const [error, setError]             = useState('')

  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const tipoActual = TIPOS.find(t => t.id === tipo)
  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo && c.activa)
  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)

  function handleTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    setCategoriaId('')
    setMetaId('')
    setSelectorAbierto(false)
    setError('')
  }

  function seleccionarCategoria(id) {
    setCategoriaId(id)
    setSelectorAbierto(false)
  }

  function handleMonto(e) {
    setMonto(e.target.value.replace(/\D/g, ''))
  }

  function formatearMonto(val) {
    if (!val) return ''
    return new Intl.NumberFormat('es-AR').format(Number(val))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!monto || !categoriaId) return

    setGuardando(true)
    setError('')

    const { error: err } = await supabase.from('movimientos').insert({
      user_id:      user.id,
      tipo,
      categoria_id: categoriaId,
      monto:        Number(monto),
      concepto:     concepto.trim() || null,
      fecha,
      meta_id:      (tipo === 'ahorro' && metaId) ? metaId : null,
    })

    setGuardando(false)

    if (err) {
      setError('No se pudo guardar. Intentá de nuevo.')
      return
    }

    setExito(true)
    setTimeout(() => navigate('/'), 1200)
  }

  const canSubmit = monto && categoriaId && !guardando

  return (
    <div className="page-enter px-4 pt-4 pb-6">
      <Header title="Registrar" subtitle="Nuevo movimiento" />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTipo(t.id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200
                ${tipo === t.id
                  ? `${t.bg} ${t.color} font-semibold scale-105 shadow-lg`
                  : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-sm">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Monto */}
        <div className="card space-y-2">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            Monto (ARS)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold text-xl">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatearMonto(monto)}
              onChange={handleMonto}
              className="input-dark pl-10 text-3xl font-bold text-center py-4"
            />
          </div>
        </div>

        {/* Selector de categoría */}
        <div className="card space-y-2">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide block">
            Categoría
          </label>

          {/* Botón disparador */}
          <button
            type="button"
            onClick={() => setSelectorAbierto(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all
              ${categoriaSeleccionada
                ? 'bg-zinc-800 border-violet-500/50 text-zinc-100'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'}
              ${selectorAbierto ? 'border-violet-500' : 'hover:border-zinc-600'}`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {categoriaSeleccionada
                ? <><span className="text-lg">{categoriaSeleccionada.emoji}</span> {categoriaSeleccionada.nombre}</>
                : 'Seleccionar categoría...'}
            </span>
            <span className={`text-zinc-500 transition-transform duration-200 ${selectorAbierto ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {/* Panel desplegable */}
          {selectorAbierto && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 overflow-hidden">
              {categoriasFiltradas.length === 0 ? (
                <p className="text-zinc-500 text-sm px-4 py-3">
                  No hay categorías de {tipoActual.label.toLowerCase()}.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-3">
                  {categoriasFiltradas.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => seleccionarCategoria(cat.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95
                        ${categoriaId === cat.id
                          ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight text-center">{cat.nombre}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Crear nueva categoría */}
              <div className="border-t border-zinc-700 px-3 py-2">
                <button
                  type="button"
                  onClick={() => navigate('/categorias')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-violet-400
                             hover:bg-violet-500/10 transition-all text-sm font-medium"
                >
                  <span className="text-base">＋</span> Nueva categoría
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="card space-y-2">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide block">
            Descripción (opcional)
          </label>
          <input
            type="text"
            placeholder={tipo === 'gasto' ? '¿En qué gastaste?' : tipo === 'ingreso' ? '¿De dónde viene?' : '¿Para qué meta?'}
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            className="input-dark"
          />
        </div>

        {/* Vincular a meta (solo ahorro) */}
        {tipo === 'ahorro' && metas.length > 0 && (
          <div className="card space-y-2">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide block">
              Vincular a meta (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMetaId('')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all
                  ${!metaId ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                Sin meta
              </button>
              {metas.map(m => (
                <button key={m.id} type="button" onClick={() => setMetaId(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all
                    ${metaId === m.id ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {m.emoji} {m.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fecha */}
        <div className="card space-y-2 overflow-hidden">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wide block">
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="input-dark min-w-0 max-w-full"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || exito}
          className={`btn-primary py-4 text-lg transition-all ${
            exito ? 'bg-emerald-600 hover:bg-emerald-600 border-emerald-600' : ''
          }`}
        >
          {exito ? '✅ ¡Registrado!' : guardando ? 'Guardando...' : `Registrar ${tipoActual.label}`}
        </button>
      </form>
    </div>
  )
}
