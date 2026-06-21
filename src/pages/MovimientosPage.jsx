import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useCategorias } from '../hooks/useCategorias'
import { useMetas } from '../hooks/useMetas'
import Modal from '../components/Modal'

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

const TIPOS = [
  { id: 'gasto',   label: 'Gasto',   color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/50'    },
  { id: 'ingreso', label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/50' },
  { id: 'ahorro',  label: 'Ahorro',  color: 'text-violet-400',  bg: 'bg-violet-500/20 border-violet-500/50'  },
]

const COLORES = { gasto: 'text-rose-400', ingreso: 'text-emerald-400', ahorro: 'text-violet-400' }
const SIGNOS  = { gasto: '−', ingreso: '+', ahorro: '+' }

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [editando, setEditando]       = useState(null)
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  // Filtro por rango
  const [desde, setDesde]           = useState('')
  const [hasta, setHasta]           = useState('')
  const [filtroActivo, setFiltroActivo] = useState(false)

  const { categorias } = useCategorias()
  const { metas }      = useMetas()

  // Edit form state
  const [tipo, setTipo]         = useState('gasto')
  const [monto, setMonto]       = useState('')
  const [categoriaId, setCatId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha]       = useState('')
  const [metaId, setMetaId]     = useState('')

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

  function abrirEditar(m) {
    setTipo(m.tipo)
    setMonto(String(m.monto))
    setCatId(m.categoria_id)
    setConcepto(m.concepto ?? '')
    setFecha(m.fecha)
    setMetaId(m.meta_id ?? '')
    setSelectorAbierto(false)
    setError('')
    setEditando(m)
  }

  function handleTipoEdit(nuevoTipo) {
    setTipo(nuevoTipo)
    setCatId('')
    setMetaId('')
    setSelectorAbierto(false)
  }

  async function handleGuardar() {
    if (!monto || !categoriaId) return
    setGuardando(true); setError('')
    const { error: err } = await supabase
      .from('movimientos')
      .update({
        tipo,
        monto: Number(monto),
        categoria_id: categoriaId,
        concepto: concepto.trim() || null,
        fecha,
        meta_id: (tipo === 'ahorro' && metaId) ? metaId : null,
      })
      .eq('id', editando.id)
    setGuardando(false)
    if (err) { setError(err.message); return }
    setEditando(null)
    await fetchAll()
  }

  async function handleEliminar(id) {
    await supabase.from('movimientos').delete().eq('id', id)
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
    ingresos: movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
    gastos:   movsFiltrados.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0),
    ahorro:   movsFiltrados.filter(m => m.tipo === 'ahorro').reduce((s, m) => s + m.monto, 0),
  }

  // Agrupar por YYYY-MM
  const porMes = movsFiltrados.reduce((acc, m) => {
    const mes = m.fecha.slice(0, 7)
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(m)
    return acc
  }, {})
  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a))

  const categoriasFiltradas   = categorias.filter(c => c.tipo === tipo && c.activa)
  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)
  const tipoActual            = TIPOS.find(t => t.id === tipo)

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Movimientos 📋</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Historial completo</p>
      </div>

      {/* Filtro por rango de fechas */}
      <div className="card space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Filtrar por período</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 min-w-0">
            <label className="text-xs text-zinc-600">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="input-dark" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="space-y-1 min-w-0">
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
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
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
              <p className="font-bold text-emerald-400 text-sm">{formatARS(totalFiltrado.ingresos)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Gastos</p>
              <p className="font-bold text-rose-400 text-sm">{formatARS(totalFiltrado.gastos)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Ahorro</p>
              <p className="font-bold text-violet-400 text-sm">{formatARS(totalFiltrado.ahorro)}</p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
            <p className="text-xs text-zinc-500">Balance del período</p>
            <p className={`font-bold text-sm ${totalFiltrado.ingresos - totalFiltrado.gastos - totalFiltrado.ahorro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          <p className="text-zinc-400 font-medium">Sin movimientos todavía</p>
          <p className="text-zinc-500 text-sm mt-1">Registrá tu primer gasto o ingreso</p>
        </div>
      ) : (
        <div className="space-y-6">
          {meses.map(mes => (
            <div key={mes}>
              {/* Cabecera de mes */}
              <div className="flex items-center gap-3 mb-3 sticky top-0 bg-zinc-950/95 backdrop-blur-sm py-2 -mx-4 px-4 z-10">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                  {mesLabel(mes)}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 whitespace-nowrap">{porMes[mes].length} mov.</span>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {porMes[mes].map(m => (
                  <div key={m.id}
                    onClick={() => abrirEditar(m)}
                    className="card flex items-center gap-3 py-3 cursor-pointer
                               hover:border-zinc-700 active:scale-[0.99] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                      {m.categorias?.emoji ?? '💸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-200 truncate leading-tight">
                        {m.concepto || m.categorias?.nombre || m.tipo}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {diaLabel(m.fecha)} · {m.categorias?.nombre}
                      </p>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${COLORES[m.tipo]}`}>
                      {SIGNOS[m.tipo]}{formatARS(m.monto)}
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

      {/* Modal editar movimiento */}
      {editando && (
        <Modal titulo="Editar movimiento" onClose={() => setEditando(null)}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={!monto || !categoriaId || guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
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
            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(t => (
                  <button key={t.id} type="button" onClick={() => handleTipoEdit(t.id)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all
                      ${tipo === t.id ? `${t.bg} ${t.color}` : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Monto (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
                <input type="text" inputMode="numeric" placeholder="0" autoFocus
                  value={monto ? new Intl.NumberFormat('es-AR').format(Number(monto)) : ''}
                  onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
                  className="input-dark pl-8 text-lg font-bold" />
              </div>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Categoría</label>
              <button type="button" onClick={() => setSelectorAbierto(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                  ${categoriaSeleccionada ? 'bg-zinc-800 border-violet-500/50 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}
                  ${selectorAbierto ? 'border-violet-500' : 'hover:border-zinc-600'}`}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {categoriaSeleccionada
                    ? <>{categoriaSeleccionada.emoji} {categoriaSeleccionada.nombre}</>
                    : 'Seleccionar...'}
                </span>
                <span className={`text-zinc-500 transition-transform duration-200 ${selectorAbierto ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {selectorAbierto && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 overflow-hidden">
                  {categoriasFiltradas.length === 0 ? (
                    <p className="text-zinc-500 text-sm px-4 py-3">Sin categorías de {tipoActual?.label.toLowerCase()}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {categoriasFiltradas.map(cat => (
                        <button key={cat.id} type="button"
                          onClick={() => { setCatId(cat.id); setSelectorAbierto(false) }}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95
                            ${categoriaId === cat.id
                              ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
                          <span className="text-xl">{cat.emoji}</span>
                          <span className="text-[10px] font-medium leading-tight text-center">{cat.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Concepto */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Descripción</label>
              <input type="text" placeholder="Opcional..." value={concepto}
                onChange={e => setConcepto(e.target.value)} className="input-dark" />
            </div>

            {/* Meta (solo ahorro) */}
            {tipo === 'ahorro' && metas.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Meta vinculada</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setMetaId('')}
                    className={`px-3 py-2 rounded-xl border text-sm transition-all
                      ${!metaId ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    Sin meta
                  </button>
                  {metas.map(m => (
                    <button key={m.id} type="button" onClick={() => setMetaId(m.id)}
                      className={`px-3 py-2 rounded-xl border text-sm transition-all
                        ${metaId === m.id ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {m.emoji} {m.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fecha */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input-dark" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
