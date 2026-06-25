import { useState } from 'react'
import { useMetas } from '../hooks/useMetas'
import Modal from '../components/Modal'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
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
  const [modal, setModal]           = useState(null)
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

  const metasOrdenadas = [...(metas ?? [])].sort((a, b) => {
    const aL = (a.movimientos ?? []).reduce((s, m) => s + m.monto, 0) >= a.monto_objetivo
    const bL = (b.movimientos ?? []).reduce((s, m) => s + m.monto, 0) >= b.monto_objetivo
    return aL === bL ? 0 : aL ? -1 : 1
  })

  return (
    <div className="page-enter px-4 pt-4 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-black text-zinc-100">Metas</h1>
        <button
          onClick={abrirNueva}
          className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95
                     text-white text-2xl font-light flex items-center justify-center
                     transition-all shadow-lg shadow-violet-900/50"
        >
          +
        </button>
      </div>
      <p className="text-sm text-zinc-500 mb-5">¿Para qué estás ahorrando?</p>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : metas.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center border-dashed border-zinc-700">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-zinc-300 font-semibold">Todavía no tenés ninguna meta.</p>
          <p className="text-zinc-500 text-sm mt-1">¿Para qué estás ahorrando? Ponele nombre y veamos cuánto te falta.</p>
          <button onClick={abrirNueva} className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium">
            + Crear meta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {metasOrdenadas.map(meta => {
            const montoActual = (meta.movimientos ?? []).reduce((s, m) => s + m.monto, 0)
            const pct     = Math.min(100, Math.round((montoActual / meta.monto_objetivo) * 100))
            const falta   = Math.max(meta.monto_objetivo - montoActual, 0)
            const lograda = montoActual >= meta.monto_objetivo
            const meses   = meta.fecha_objetivo ? mesesHasta(meta.fecha_objetivo) : null
            const porMes  = (meses && falta > 0) ? Math.ceil(falta / meses) : null

            /* ── META CUMPLIDA ───────────────────────────────────── */
            if (lograda) {
              return (
                <div
                  key={meta.id}
                  className="card"
                  style={{
                    background: 'rgba(245,200,75,.04)',
                    border: '1px solid rgba(245,200,75,.35)',
                    borderRadius: '18px',
                  }}
                >
                  {/* Fila: Monedita + emoji + nombre + acciones */}
                  <div className="flex items-center gap-3">
                    <img
                      src="/monedita/monedita-celebrando.svg"
                      alt="¡Meta lograda!"
                      className="w-10 h-10 object-contain flex-shrink-0"
                    />
                    <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
                    <p className="text-lg font-extrabold text-zinc-100 leading-tight flex-1 min-w-0">
                      {meta.nombre}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <button
                        onClick={() => abrirEditar(meta)}
                        className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-violet-500/20 flex items-center justify-center
                                   text-zinc-500 hover:text-violet-400 text-xs transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminar(meta.id)}
                        className="w-7 h-7 rounded-lg bg-zinc-800/80 hover:bg-rose-500/20 flex items-center justify-center
                                   text-zinc-500 hover:text-rose-400 text-xs transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold mt-3" style={{ color: 'var(--mn-gold)' }}>
                    ¡La rompiste! Meta cumplida 🎉
                  </p>
                </div>
              )
            }

            /* ── META EN PROGRESO ────────────────────────────────── */
            return (
              <div key={meta.id} className="card">

                {/* Fila 1: emoji + nombre + porcentaje + acciones */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
                  <p className="text-lg font-extrabold text-zinc-100 leading-tight flex-1 min-w-0 truncate">
                    {meta.nombre}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-num font-extrabold text-lg text-violet-400">{pct}%</span>
                    <button
                      onClick={() => abrirEditar(meta)}
                      className="w-7 h-7 ml-1 rounded-lg bg-zinc-800 hover:bg-violet-500/20 flex items-center justify-center
                                 text-zinc-500 hover:text-violet-400 text-xs transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => eliminar(meta.id)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                 text-zinc-500 hover:text-rose-400 text-xs transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Fila 2: barra de progreso */}
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Fila 3: montos */}
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <div className="min-w-0 overflow-hidden">
                    <span className="font-num font-extrabold text-zinc-100">
                      {formatARS(montoActual)}
                    </span>
                    <span className="font-semibold text-zinc-500 text-sm ml-1">
                      / {formatARS(meta.monto_objetivo)}
                    </span>
                  </div>
                  <span className="text-sm font-normal text-zinc-400 flex-shrink-0 whitespace-nowrap">
                    Te faltan {formatARS(falta)}
                  </span>
                </div>

                {/* Fila 4: proyección mensual */}
                {porMes !== null && (
                  <div
                    className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                    style={{ background: 'rgba(39,39,42,.6)' }}
                  >
                    <span className="text-xs text-zinc-400">Para llegar en fecha, ahorrá</span>
                    <span className="font-num font-extrabold text-violet-400 flex-shrink-0 whitespace-nowrap">
                      {formatARS(porMes)}/mes
                    </span>
                  </div>
                )}

                {/* Fecha objetivo */}
                {meta.fecha_objetivo && (
                  <p className="text-xs text-zinc-600 mt-2">
                    Objetivo: {fechaLabel(meta.fecha_objetivo)}
                  </p>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva / editar meta — sin cambios */}
      {modal && (
        <Modal
          titulo={modal === 'editar' ? 'Editar meta' : 'Nueva meta de ahorro'}
          onClose={() => setModal(null)}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={!nombre.trim() || !montoObj || guardando} className="btn-primary">
                {guardando ? 'Guardando...' : modal === 'editar' ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </div>
          }
        >
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Emoji</label>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">{emoji}</div>
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
                  placeholder="Pegá un emoji" className="input-dark" maxLength={4} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Nombre</label>
              <input type="text" placeholder="Ej: Viaje a Europa" value={nombre}
                onChange={e => setNombre(e.target.value)} className="input-dark" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">¿Cuánto querés juntar? (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
                <input type="text" inputMode="numeric" placeholder="0"
                  value={montoObj ? new Intl.NumberFormat('es-AR').format(Number(montoObj)) : ''}
                  onChange={e => setMontoObj(e.target.value.replace(/\D/g, ''))}
                  className="input-dark pl-8" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Fecha objetivo <span className="text-zinc-600 normal-case">(opcional)</span>
              </label>
              <input type="date" value={fechaObj} onChange={e => setFechaObj(e.target.value)}
                className="input-dark min-w-0" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
