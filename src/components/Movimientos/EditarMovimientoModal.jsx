import { useState } from 'react'
import Modal from '../Modal'
import { getDolarBlue } from '../../lib/dolar'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

const TIPOS = [
  { id: 'gasto',   label: 'Gasto',   color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/50'    },
  { id: 'ingreso', label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/50' },
  { id: 'ahorro',  label: 'Ahorro',  color: 'text-violet-400',  bg: 'bg-violet-500/20 border-violet-500/50'  },
]

export default function EditarMovimientoModal({ movimiento, categorias, metas, onSave, onClose }) {
  const [tipo, setTipo]             = useState(movimiento.tipo)
  const [monto, setMonto]           = useState(String(movimiento.monto))
  const [moneda, setMoneda]         = useState(movimiento.moneda ?? 'ARS')
  const [cotizacion, setCotizacion] = useState(movimiento.cotizacion ? String(movimiento.cotizacion) : '')
  const [categoriaId, setCatId]     = useState(movimiento.categoria_id)
  const [concepto, setConcepto]     = useState(movimiento.concepto ?? '')
  const [fecha, setFecha]           = useState(movimiento.fecha)
  const [metaId, setMetaId]         = useState(movimiento.meta_id ?? '')
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')

  const categoriasFiltradas   = categorias.filter(c => c.tipo === tipo && c.activa)
  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)
  const tipoActual            = TIPOS.find(t => t.id === tipo)

  function handleTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    setCatId('')
    setMetaId('')
    setSelectorAbierto(false)
  }

  async function handleMoneda(nuevaMoneda) {
    setMoneda(nuevaMoneda)
    if (nuevaMoneda === 'USD' && !cotizacion) {
      const dolar = await getDolarBlue()
      if (dolar?.venta) setCotizacion(String(Math.round(dolar.venta)))
    }
  }

  async function handleGuardar() {
    if (!monto || !categoriaId) return
    if (moneda === 'USD' && !cotizacion) return
    setGuardando(true); setError('')
    const { error: err } = await onSave(movimiento.id, {
      tipo,
      monto: Number(monto),
      categoria_id: categoriaId,
      concepto: concepto.trim() || null,
      fecha,
      meta_id: (tipo === 'ahorro' && metaId) ? metaId : null,
      moneda,
      cotizacion: moneda === 'USD' ? Number(cotizacion) : null,
    })
    setGuardando(false)
    if (err) { setError(err); return }
    onClose()
  }

  return (
    <Modal titulo="Editar movimiento" onClose={onClose}
      actions={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={!monto || !categoriaId || guardando || (moneda === 'USD' && !cotizacion)} className="btn-primary">
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
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button key={t.id} type="button" onClick={() => handleTipo(t.id)}
                className={`py-2 rounded-xl border text-sm font-medium transition-all
                  ${tipo === t.id ? `${t.bg} ${t.color}` : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Monto */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Monto</label>
            <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
              <button type="button" onClick={() => setMoneda('ARS')}
                className={`px-3 py-1 text-xs font-bold transition-all ${moneda === 'ARS' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                ARS
              </button>
              <button type="button" onClick={() => handleMoneda('USD')}
                className={`px-3 py-1 text-xs font-bold transition-all ${moneda === 'USD' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                USD
              </button>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold pointer-events-none">
              {moneda === 'USD' ? 'US$' : '$'}
            </span>
            <input type="text" inputMode="numeric" placeholder="0" autoFocus
              value={monto ? new Intl.NumberFormat('es-AR').format(Number(monto)) : ''}
              onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
              className={`input-dark ${moneda === 'USD' ? 'pl-12' : 'pl-9'} text-lg font-bold`} />
          </div>
          {moneda === 'USD' && (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                Cotización (a la que compraste/vendiste)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold pointer-events-none">$</span>
                <input type="text" inputMode="numeric" placeholder="0"
                  value={cotizacion ? new Intl.NumberFormat('es-AR').format(Number(cotizacion)) : ''}
                  onChange={e => setCotizacion(e.target.value.replace(/\D/g, ''))}
                  className="input-dark pl-9" />
              </div>
              {monto && cotizacion && (
                <p className="text-xs text-zinc-500">≈ {formatARS(Number(monto) * Number(cotizacion))}</p>
              )}
            </div>
          )}
        </div>

        {/* Categoría */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Categoría</label>
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
                      <span className="text-xs font-medium leading-tight text-center">{cat.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Concepto */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Descripción</label>
          <input type="text" placeholder="Opcional..." value={concepto}
            onChange={e => setConcepto(e.target.value)} className="input-dark" />
        </div>

        {/* Meta (solo ahorro) */}
        {tipo === 'ahorro' && metas.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Meta vinculada</label>
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
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="input-dark min-w-0" style={{ colorScheme: 'dark' }} />
        </div>
      </div>
    </Modal>
  )
}