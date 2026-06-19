import { useState } from 'react'
import { usePresupuesto } from '../hooks/usePresupuesto'
import { useMovimientos } from '../hooks/useMovimientos'
import { useCategorias } from '../hooks/useCategorias'
import Modal from '../components/Modal'

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function mesLabel(mes) {
  const [a, m] = mes.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

function formatCompact(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1,
  }).format(n)
}

function balanceFontClass(n) {
  const len = formatARS(n).length
  return len > 10 ? 'text-2xl' : len > 8 ? 'text-3xl' : 'text-4xl'
}

function BarraProgreso({ gastado, maximo }) {
  const pct = maximo > 0 ? Math.min((gastado / maximo) * 100, 100) : 0
  const excedido = gastado > maximo
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          excedido ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function PresupuestoPage() {
  const mes = mesActual()
  const { presupuestos, loading, guardar, guardarGeneral, eliminar } = usePresupuesto(mes)
  const { movimientos } = useMovimientos(mes)
  const { categorias } = useCategorias()

  const [modal, setModal]           = useState(null) // null | 'categoria' | 'general'
  const [editandoPresup, setEditandoPresup] = useState(null)
  const [catId, setCatId]           = useState('')
  const [monto, setMonto]           = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')

  // Presupuesto general (categoria_id === null)
  const presupGeneral = presupuestos.find(p => p.categoria_id === null)
  const presupCats    = presupuestos.filter(p => p.categoria_id !== null)

  // Gastos reales por categoría del mes
  const totalGastadoMes = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
  const gastosPorCat    = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => { acc[m.categoria_id] = (acc[m.categoria_id] ?? 0) + m.monto; return acc }, {})

  // Categorías de gasto disponibles para agregar presupuesto por categoría
  const catsGasto      = categorias.filter(c => c.tipo === 'gasto' && c.activa)
  const catsDisponibles = catsGasto.filter(c => !presupCats.find(p => p.categoria_id === c.id))

  async function handleGuardarCategoria() {
    if (!catId || !monto) return
    setGuardando(true); setError('')
    const { error: err } = await guardar({ categoria_id: catId, monto_max: Number(monto) })
    setGuardando(false)
    if (err) { setError(err); return }
    setModal(null); setCatId(''); setMonto(''); setEditandoPresup(null)
  }

  async function handleGuardarGeneral() {
    if (!monto) return
    setGuardando(true); setError('')
    const { error: err } = await guardarGeneral(Number(monto))
    setGuardando(false)
    if (err) { setError(err); return }
    setModal(null); setMonto('')
  }

  function abrirGeneral() {
    setMonto(presupGeneral ? String(presupGeneral.monto_max) : '')
    setError('')
    setModal('general')
  }

  function abrirEditarCategoria(p) {
    setEditandoPresup(p)
    setCatId(p.categoria_id)
    setMonto(String(p.monto_max))
    setError('')
    setModal('categoria')
  }

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Presupuesto 📊</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{mesLabel(mes)}</p>
        </div>
        <button
          onClick={() => { setModal('categoria'); setCatId(''); setMonto(''); setError('') }}
          className="bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold
                     rounded-xl px-4 py-2 transition-all"
        >
          + Categoría
        </button>
      </div>

      {/* Presupuesto general del mes */}
      <div className="card bg-gradient-to-br from-violet-900/30 to-zinc-900 border-violet-800/20">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Presupuesto total del mes</p>
          <button
            onClick={abrirGeneral}
            className="text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20
                       border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all font-medium"
          >
            {presupGeneral ? 'Editar' : 'Definir'}
          </button>
        </div>

        {presupGeneral ? (
          <>
            {/* Restante — dato principal */}
            <div className="mb-3">
              {(() => {
                const restante = presupGeneral.monto_max - totalGastadoMes
                const excedido = restante < 0
                const pct = (restante / presupGeneral.monto_max) * 100
                const color = excedido ? 'text-rose-500'
                  : pct <= 20 ? 'text-rose-400'
                  : pct <= 50 ? 'text-amber-400'
                  : 'text-emerald-400'
                return (
                  <>
                    <p className="text-xs text-zinc-500 mb-0.5">{excedido ? 'Excediste el presupuesto en' : 'Disponible'}</p>
                    <p className={`${balanceFontClass(Math.abs(restante))} font-extrabold tracking-tight ${color}`}>
                      {formatARS(Math.abs(restante))}
                    </p>
                  </>
                )
              })()}
            </div>

            {/* Gastado y máximo — secundario */}
            <div className="flex justify-between text-sm text-zinc-500 mb-1 gap-2">
              <span className="min-w-0 truncate">{formatCompact(totalGastadoMes)} <span className="text-zinc-600">gastados</span></span>
              <span className="text-zinc-600 flex-shrink-0">de {formatCompact(presupGeneral.monto_max)}</span>
            </div>
            <BarraProgreso gastado={totalGastadoMes} maximo={presupGeneral.monto_max} />
          </>
        ) : (
          <p className="text-zinc-500 text-sm mt-1">Sin presupuesto general definido</p>
        )}
      </div>

      {/* Presupuestos por categoría */}
      {loading ? (
        <div className="py-8 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : presupCats.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-zinc-400 font-medium">Sin presupuestos por categoría</p>
          <p className="text-zinc-600 text-sm mt-1">Tocá "+ Categoría" para crear uno</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presupCats.map(p => {
            const gastado  = gastosPorCat[p.categoria_id] ?? 0
            const restante = p.monto_max - gastado
            const excedido = gastado > p.monto_max
            const pct      = Math.min(Math.round((gastado / p.monto_max) * 100), 100)

            return (
              <div key={p.id} className="card space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.categorias?.emoji ?? '📦'}</span>
                    <span className="font-semibold text-zinc-200">{p.categorias?.nombre}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      excedido ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {excedido ? '⚠️ Excedido' : `${pct}%`}
                    </span>
                    <button
                      onClick={() => abrirEditarCategoria(p)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-violet-500/20 flex items-center justify-center
                                 text-zinc-500 hover:text-violet-400 text-xs transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => eliminar(p.id)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                 text-zinc-500 hover:text-rose-400 text-xs transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mt-1 gap-2">
                  <span className={`min-w-0 truncate ${excedido ? 'text-rose-400 font-semibold' : 'text-zinc-300'}`}>
                    {formatCompact(gastado)} gastados
                  </span>
                  <span className="text-zinc-500 flex-shrink-0">máx. {formatCompact(p.monto_max)}</span>
                </div>

                <BarraProgreso gastado={gastado} maximo={p.monto_max} />

                {!excedido && (
                  <p className="text-xs text-zinc-600 mt-1">{formatCompact(restante)} disponibles</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: presupuesto general */}
      {modal === 'general' && (
        <Modal
          titulo={presupGeneral ? 'Editar presupuesto general' : 'Definir presupuesto del mes'}
          onClose={() => setModal(null)}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardarGeneral} disabled={!monto || guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          }
        >
          {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4"><p className="text-rose-400 text-sm">{error}</p></div>}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Monto máximo del mes (ARS)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
              <input
                type="text" inputMode="numeric" placeholder="0" autoFocus
                value={monto ? new Intl.NumberFormat('es-AR').format(Number(monto)) : ''}
                onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
                className="input-dark pl-8"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: presupuesto por categoría (nueva o editar) */}
      {modal === 'categoria' && (
        <Modal
          titulo={editandoPresup ? 'Editar presupuesto' : 'Presupuesto por categoría'}
          onClose={() => { setModal(null); setEditandoPresup(null) }}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => { setModal(null); setEditandoPresup(null) }} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardarCategoria} disabled={!catId || !monto || guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          }
        >
          {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4"><p className="text-rose-400 text-sm">{error}</p></div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Categoría</label>
              {editandoPresup ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm">
                  <span>{editandoPresup.categorias?.emoji}</span>
                  <span className="font-medium">{editandoPresup.categorias?.nombre}</span>
                </div>
              ) : catsDisponibles.length === 0 ? (
                <p className="text-zinc-500 text-sm py-2">Ya tenés presupuesto en todas tus categorías de gasto.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {catsDisponibles.map(c => (
                    <button key={c.id} type="button" onClick={() => setCatId(c.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                        ${catId === c.id ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'}`}
                    >
                      <span>{c.emoji}</span> {c.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Monto máximo (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
                <input type="text" inputMode="numeric" placeholder="0" autoFocus
                  value={monto ? new Intl.NumberFormat('es-AR').format(Number(monto)) : ''}
                  onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
                  className="input-dark pl-8"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
