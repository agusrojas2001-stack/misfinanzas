import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useCategorias } from '../hooks/useCategorias'
import { useMetas } from '../hooks/useMetas'
import EditarMovimientoModal from '../components/Movimientos/EditarMovimientoModal'
import { montoEnPesos } from '../lib/dolar'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

function mesLabel(yearMonth) {
  const [a, m] = yearMonth.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function diaLabel(fechaStr) {
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const COLORES = { gasto: 'text-rose-400', ingreso: 'text-emerald-400', ahorro: 'text-violet-400' }
const SIGNOS  = { gasto: '−', ingreso: '+', ahorro: '+' }

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [editando, setEditando]       = useState(null)

  // Filtro por rango
  const [desde, setDesde]           = useState('')
  const [hasta, setHasta]           = useState('')
  const [filtroActivo, setFiltroActivo] = useState(false)

  const { categorias } = useCategorias()
  const { metas }      = useMetas()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('movimientos')
      .select('*, categorias(nombre, emoji)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setMovimientos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function guardarMovimiento(id, datos) {
    const { error } = await supabase.from('movimientos').update(datos).eq('id', id)
    if (error) return { error: error.message }
    await fetchAll()
    return { error: null }
  }

  async function handleEliminar(id) {
    await supabase.rpc('eliminar_movimiento', { p_movimiento_id: id })
    setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  function aplicarFiltro() {
    if (desde || hasta) setFiltroActivo(true)
  }

  function limpiarFiltro() {
    setDesde(''); setHasta(''); setFiltroActivo(false)
  }

  // Movimientos filtrados por rango (o todos si no hay filtro)
  const movsFiltrados = filtroActivo
    ? movimientos.filter(m => {
        if (desde && m.fecha < desde) return false
        if (hasta && m.fecha > hasta) return false
        return true
      })
    : movimientos

  // Totales del período filtrado
  const totalFiltrado = {
    ingresos: movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + montoEnPesos(m), 0),
    gastos:   movsFiltrados.filter(m => m.tipo === 'gasto').reduce((s, m) => s + montoEnPesos(m), 0),
    ahorro:   movsFiltrados.filter(m => m.tipo === 'ahorro').reduce((s, m) => s + montoEnPesos(m), 0),
  }

  // Agrupar por YYYY-MM
  const porMes = movsFiltrados.reduce((acc, m) => {
    const mes = m.fecha.slice(0, 7)
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(m)
    return acc
  }, {})
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-zinc-100">Movimientos 📋</h1>
        <p className="text-sm font-normal text-zinc-400 mt-0.5">Todos tus movimientos</p>
      </div>

      {/* Filtro por rango de fechas */}
      <div className="card space-y-3 overflow-hidden">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Filtrar por período</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-600">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="input-dark" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-600">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="input-dark" style={{ colorScheme: 'dark' }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={aplicarFiltro} disabled={!desde && !hasta}
            className="btn-primary py-2 text-sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
            Aplicar filtro
          </button>
          {filtroActivo && (
            <button onClick={limpiarFiltro}
              className="btn-secondary py-2 text-sm px-4">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resumen del período filtrado */}
      {filtroActivo && (
        <div className="card bg-gradient-to-br from-violet-900/20 to-zinc-900 border-violet-800/20 space-y-2">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
            Resumen del período
            {desde && hasta && (
              <span className="normal-case text-zinc-600 ml-1">
                ({diaLabel(desde)} – {diaLabel(hasta)})
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Ingresos</p>
              <p className="font-extrabold font-num text-emerald-400 text-sm">{formatARS(totalFiltrado.ingresos)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Gastos</p>
              <p className="font-extrabold font-num text-rose-400 text-sm">{formatARS(totalFiltrado.gastos)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Ahorro</p>
              <p className="font-extrabold font-num text-violet-400 text-sm">{formatARS(totalFiltrado.ahorro)}</p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
            <p className="text-xs text-zinc-500">Balance del período</p>
            <p className={`font-extrabold font-num text-sm ${totalFiltrado.ingresos - totalFiltrado.gastos - totalFiltrado.ahorro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatARS(totalFiltrado.ingresos - totalFiltrado.gastos - totalFiltrado.ahorro)}
            </p>
          </div>
          <p className="text-xs text-zinc-600">{movsFiltrados.length} movimientos encontrados</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : meses.length === 0 ? (
        <div className="card py-12 text-center border-dashed border-zinc-700">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-zinc-400 font-medium">Acá van a aparecer todos tus movimientos.</p>
          <p className="text-zinc-500 text-sm mt-1">Cargá tu primer gasto o plata que cobrés.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {meses.map(mes => (
            <div key={mes}>
              {/* Cabecera de mes */}
              <div className="flex items-center gap-3 mb-3 sticky top-0 bg-zinc-950/95 py-2 -mx-4 px-4 z-10">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  {mesLabel(mes)}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 whitespace-nowrap">{porMes[mes].length} mov.</span>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {porMes[mes].map(m => (
                  <div key={m.id}
                    onClick={() => setEditando(m)}
                    className="card flex items-center gap-3 py-3 cursor-pointer
                               active:scale-[0.99] transition-transform">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                      {m.categorias?.emoji ?? '💸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-zinc-100 truncate leading-tight">
                        {m.concepto || m.categorias?.nombre || m.tipo}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {diaLabel(m.fecha)} · {m.categorias?.nombre}
                      </p>
                    </div>
                    <p className={`font-extrabold font-num text-sm flex-shrink-0 ${COLORES[m.tipo]}`}>
                      {SIGNOS[m.tipo]}{m.moneda === 'USD' ? `USD ${Number(m.monto).toLocaleString('es-AR')}` : formatARS(m.monto)}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); handleEliminar(m.id) }}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                 text-zinc-600 hover:text-rose-400 text-xs transition-all flex-shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <EditarMovimientoModal
          movimiento={editando}
          categorias={categorias}
          metas={metas}
          onSave={guardarMovimiento}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}