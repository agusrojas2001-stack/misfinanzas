import { useState } from 'react'
import { useMetas } from '../hooks/useMetas'
import Modal from '../components/Modal'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

function formatCompact(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1,
  }).format(n)
}

function mesesHasta(fechaStr) {
  const hoy = new Date()
  const objetivo = new Date(fechaStr + 'T00:00:00')
  const diff = (objetivo.getFullYear() - hoy.getFullYear()) * 12 + (objetivo.getMonth() - hoy.getMonth())
  return Math.max(1, diff)
}

function fechaLabel(fechaStr) {
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export default function MetasPage() {
  const { metas, loading, crear, actualizar, archivar, eliminar } = useMetas()
  const [modal, setModal]           = useState(null) // null | 'nueva' | 'editar'
  const [editandoMeta, setEditando] = useState(null)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')

  const [nombre, setNombre]     = useState('')
  const [emoji, setEmoji]       = useState('🎯')
  const [montoObj, setMontoObj] = useState('')
  const [fechaObj, setFechaObj] = useState('')

  function abrirNueva() {
    setNombre(''); setEmoji('🎯'); setMontoObj(''); setFechaObj(''); setError('')
    setEditando(null)
    setModal('nueva')
  }

  function abrirEditar(meta) {
    setNombre(meta.nombre)
    setEmoji(meta.emoji)
    setMontoObj(String(meta.monto_objetivo))
    setFechaObj(meta.fecha_objetivo ?? '')
    setError('')
    setEditando(meta)
    setModal('editar')
  }

  async function handleGuardar() {
    if (!nombre.trim() || !montoObj) return
    setGuardando(true); setError('')
    const datos = {
      nombre: nombre.trim(),
      emoji,
      monto_objetivo: Number(montoObj),
      fecha_objetivo: fechaObj || null,
    }
    const { error: err } = modal === 'editar'
      ? await actualizar(editandoMeta.id, datos)
      : await crear(datos)
    setGuardando(false)
    if (err) { setError(err); return }
    setModal(null)
  }

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Metas 🎯</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Tus objetivos de ahorro</p>
        </div>
        <button onClick={abrirNueva}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold
                     rounded-xl px-4 py-2 transition-all active:scale-95">
          + Nueva
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : metas.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center border-dashed border-zinc-700">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-zinc-300 font-semibold">Sin metas todavía</p>
          <p className="text-zinc-500 text-sm mt-1">Creá tu primera meta de ahorro</p>
          <button onClick={abrirNueva}
            className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium">
            + Crear meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metas.map(meta => {
            const montoActual = (meta.movimientos ?? []).reduce((s, m) => s + m.monto, 0)
            const pct     = Math.min(100, Math.round((montoActual / meta.monto_objetivo) * 100))
            const falta   = Math.max(meta.monto_objetivo - montoActual, 0)
            const lograda = montoActual >= meta.monto_objetivo
            const meses   = meta.fecha_objetivo ? mesesHasta(meta.fecha_objetivo) : null
            const porMes  = (meses && falta > 0) ? Math.ceil(falta / meses) : null

            return (
              <div key={meta.id} className="card space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-100 leading-tight">{meta.nombre}</p>
                    {meta.fecha_objetivo && (
                      <p className="text-xs text-zinc-500 mt-0.5">Objetivo: {fechaLabel(meta.fecha_objetivo)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-base font-bold ${lograda ? 'text-emerald-400' : 'text-violet-400'}`}>
                      {pct}%
                    </span>
                    <button onClick={() => abrirEditar(meta)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-violet-500/20 flex items-center justify-center
                                 text-zinc-600 hover:text-violet-400 text-xs transition-all ml-1">
                      ✏️
                    </button>
                    <button onClick={() => eliminar(meta.id)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                 text-zinc-600 hover:text-rose-400 text-xs transition-all">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: lograda
                          ? 'linear-gradient(to right, #10b981, #34d399)'
                          : 'linear-gradient(to right, #7c3aed, #a78bfa)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 gap-2">
                    <span className="min-w-0 truncate">{formatCompact(montoActual)} ahorrado</span>
                    <span className="flex-shrink-0">{lograda ? '¡Meta lograda! 🎉' : `Falta ${formatCompact(falta)}`}</span>
                  </div>
                </div>

                {/* Proyección */}
                {!lograda && porMes !== null && (
                  <div className="bg-zinc-800/50 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Para llegar a tiempo, ahorrá</span>
                    <span className="text-sm font-bold text-violet-400 flex-shrink-0">{formatCompact(porMes)}/mes</span>
                  </div>
                )}

                {lograda && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center">
                    <span className="text-sm text-emerald-400 font-semibold">¡Alcanzaste tu meta! 🎉</span>
                  </div>
                )}

                <button onClick={() => archivar(meta.id)}
                  className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1">
                  Archivar meta
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva / editar meta */}
      {modal && (
        <Modal
          titulo={modal === 'editar' ? 'Editar meta' : 'Nueva meta de ahorro'}
          onClose={() => setModal(null)}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={!nombre.trim() || !montoObj || guardando}
                className="btn-primary">
                {guardando ? 'Guardando...' : modal === 'editar' ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </div>
          }
        >
          {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4"><p className="text-rose-400 text-sm">{error}</p></div>}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Emoji</label>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">{emoji}</div>
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
                  placeholder="Pegá un emoji" className="input-dark" maxLength={4} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Nombre</label>
              <input type="text" placeholder="Ej: Viaje a Europa" value={nombre}
                onChange={e => setNombre(e.target.value)} className="input-dark" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Monto objetivo (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
                <input type="text" inputMode="numeric" placeholder="0"
                  value={montoObj ? new Intl.NumberFormat('es-AR').format(Number(montoObj)) : ''}
                  onChange={e => setMontoObj(e.target.value.replace(/\D/g, ''))}
                  className="input-dark pl-8" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Fecha objetivo <span className="text-zinc-600 normal-case">(opcional)</span></label>
              <input type="date" value={fechaObj} onChange={e => setFechaObj(e.target.value)}
                className="input-dark" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
