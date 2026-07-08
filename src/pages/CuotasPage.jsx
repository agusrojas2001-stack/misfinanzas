import { useState } from 'react'
import { useCuotas } from '../hooks/useCuotas'
import { useCategorias } from '../hooks/useCategorias'
import Header from '../components/Layout/Header'
import CuotaModal from '../components/Cuotas/CuotaModal'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

const ESTADO_LABEL = { activa: 'Activa', pausada: 'Pausada', completada: 'Completada' }
const ESTADO_COLOR = {
  activa: 'text-violet-400 bg-violet-500/15',
  pausada: 'text-amber-400 bg-amber-500/15',
  completada: 'text-emerald-400 bg-emerald-500/15',
}

function mesActualLabel() {
  const label = new Date().toLocaleDateString('es-AR', { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function CuotasPage() {
  const { cuotas, pagosMes, loading, crear, actualizar, pausar, reactivar, cancelar, pagarCuota } = useCuotas()
  const { categorias } = useCategorias()
  const [modal, setModal]     = useState(null) // 'nueva' | objeto cuota para editar
  const [pagandoId, setPagandoId] = useState(null)
  const [error, setError]     = useState('')

  const activas     = cuotas.filter(c => c.estado === 'activa')
  const pausadas    = cuotas.filter(c => c.estado === 'pausada')
  const completadas = cuotas.filter(c => c.estado === 'completada')

  const totalMensual = activas.reduce((s, c) => s + Number(c.monto_cuota), 0)

  async function handleGuardar(datos) {
    return modal && modal !== 'nueva'
      ? await actualizar(modal.id, datos).then(r => { if (!r.error) setModal(null); return r })
      : await crear(datos).then(r => { if (!r.error) setModal(null); return r })
  }

  async function handleCancelar(cuota) {
    if (!confirm(`¿Cancelar la cuota "${cuota.descripcion}"? Los pagos ya registrados no se borran.`)) return
    await cancelar(cuota.id)
  }

  async function handlePagar(cuota) {
    setError('')
    setPagandoId(cuota.id)
    const { error: err } = await pagarCuota(cuota)
    setPagandoId(null)
    if (err) setError(err)
  }

  const grupos = [
    ['Activas', activas],
    ['Pausadas', pausadas],
    ['Completadas', completadas],
  ]

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      <Header title="Cuotas y pagos 💳" subtitle="Tus compras en cuotas, bajo control" />

      {/* Resumen mensual */}
      <div className="card">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Comprometido este mes</p>
        <p className="font-num font-extrabold text-3xl text-zinc-100 mt-1">{formatARS(totalMensual)}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {activas.length} cuota{activas.length !== 1 ? 's' : ''} activa{activas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <button onClick={() => setModal('nueva')} className="btn-primary w-full">
        + Nueva cuota
      </button>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : cuotas.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center border-dashed border-zinc-700">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-zinc-300 font-semibold">Todavía no tenés cuotas cargadas.</p>
          <p className="text-zinc-500 text-sm mt-1">Cargá tu primera compra en cuotas para hacerle seguimiento.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(([label, lista]) => lista.length > 0 && (
            <section key={label} className="space-y-2">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide px-1">{label}</p>
              {lista.map(cuota => {
                const pct = Math.min(100, Math.round((cuota.cuotas_pagadas / cuota.total_cuotas) * 100))
                return (
                  <div key={cuota.id} className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl flex-shrink-0">{cuota.categorias?.emoji ?? '💳'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-zinc-100 truncate">{cuota.descripcion}</p>
                        <p className="text-xs text-zinc-500">{cuota.categorias?.nombre ?? 'Sin categoría'}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${ESTADO_COLOR[cuota.estado]}`}>
                        {ESTADO_LABEL[cuota.estado]}
                      </span>
                    </div>

                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-zinc-400">
                        {cuota.cuotas_pagadas}/{cuota.total_cuotas} cuotas pagadas
                      </span>
                      <span className="font-num font-bold text-zinc-100">{formatARS(cuota.monto_cuota)}/mes</span>
                    </div>

                    {cuota.estado === 'activa' && (
                      pagosMes.has(cuota.id) ? (
                        <button disabled className="w-full mb-3 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 cursor-default">
                          Pagada este mes ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePagar(cuota)}
                          disabled={pagandoId === cuota.id}
                          className="btn-primary w-full mb-3 py-2.5 text-sm"
                        >
                          {pagandoId === cuota.id ? 'Pagando...' : `Pagar cuota de ${mesActualLabel()}`}
                        </button>
                      )
                    )}

                    <div className="flex gap-2">
                      {cuota.estado !== 'completada' && (
                        <button
                          onClick={() => cuota.estado === 'activa' ? pausar(cuota.id) : reactivar(cuota.id)}
                          className="btn-secondary flex-1 text-sm py-2"
                        >
                          {cuota.estado === 'activa' ? 'Pausar' : 'Reactivar'}
                        </button>
                      )}
                      <button onClick={() => setModal(cuota)} className="btn-secondary flex-1 text-sm py-2">
                        Editar
                      </button>
                      <button
                        onClick={() => handleCancelar(cuota)}
                        className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                   text-zinc-500 hover:text-rose-400 text-sm transition-all flex-shrink-0"
                        title="Cancelar cuota"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      )}

      {modal && (
        <CuotaModal
          cuota={modal === 'nueva' ? null : modal}
          categorias={categorias}
          onSave={handleGuardar}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
