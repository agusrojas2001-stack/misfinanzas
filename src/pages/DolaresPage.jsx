import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useCategorias } from '../hooks/useCategorias'
import { useMetas } from '../hooks/useMetas'
import { getDolarBlue } from '../lib/dolar'
import Header from '../components/Layout/Header'
import EditarMovimientoModal from '../components/Movimientos/EditarMovimientoModal'

const LIMITE_VISIBLE = 5

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

function diaLabel(fechaStr) {
  return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const COLORES_TIPO = { gasto: 'text-rose-400', ingreso: 'text-emerald-400', ahorro: 'text-violet-400' }
const SIGNOS_TIPO  = { gasto: '−', ingreso: '+', ahorro: '+' }

export default function DolaresPage() {
  const [cargado, setCargado]             = useState(false)
  const [movimientosUSD, setMovimientosUSD] = useState([])
  const [dolar, setDolar]                 = useState(null)
  const [pesosInput, setPesosInput]       = useState('')
  const [dolaresInput, setDolaresInput]   = useState('')
  const [verTodos, setVerTodos]           = useState(false)
  const [editando, setEditando]           = useState(null)

  const { categorias } = useCategorias()
  const { metas }       = useMetas()

  const cargarMovimientos = useCallback(async () => {
    const { data } = await supabase
      .from('movimientos')
      .select('id, tipo, monto, categoria_id, concepto, fecha, meta_id, moneda, cotizacion, categorias(nombre, emoji)')
      .eq('moneda', 'USD')
      .order('fecha', { ascending: false })
    setMovimientosUSD(data ?? [])
  }, [])

  useEffect(() => {
    async function cargar() {
      const [, dolarHoy] = await Promise.all([cargarMovimientos(), getDolarBlue()])
      setDolar(dolarHoy)
      setCargado(true)
    }
    cargar()
  }, [cargarMovimientos])

  async function guardarMovimiento(id, datos) {
    const { error } = await supabase.from('movimientos').update(datos).eq('id', id)
    if (error) return { error: error.message }
    await cargarMovimientos()
    return { error: null }
  }

  const ahorrosUSD     = movimientosUSD.filter(m => m.tipo === 'ahorro')
  const totalUSD       = ahorrosUSD.reduce((s, m) => s + Number(m.monto), 0)
  const valorHistorico = ahorrosUSD.reduce((s, m) => s + Number(m.monto) * Number(m.cotizacion ?? 0), 0)
  const valorHoy       = dolar?.venta ? totalUSD * dolar.venta : null
  const variacion      = (valorHoy != null && valorHistorico > 0) ? valorHoy - valorHistorico : null
  const variacionPct   = (variacion != null && valorHistorico > 0) ? (variacion / valorHistorico) * 100 : null
  const gano           = variacion != null && variacion >= 0

  // Rendimiento: PPC sobre todo lo que sumó dólares (ahorro + ingreso en USD)
  const comprasUSD        = movimientosUSD.filter(m => m.tipo === 'ahorro' || m.tipo === 'ingreso')
  const totalComprado     = comprasUSD.reduce((s, m) => s + Number(m.monto), 0)
  const costoComprado     = comprasUSD.reduce((s, m) => s + Number(m.monto) * Number(m.cotizacion ?? 0), 0)
  const ppc               = totalComprado > 0 ? costoComprado / totalComprado : null
  const rendimientoPct    = (ppc && dolar?.venta) ? ((dolar.venta - ppc) / ppc) * 100 : null
  const rendimientoConocido = rendimientoPct != null
  const rendimientoGano   = rendimientoConocido && rendimientoPct >= 0

  // Conversor rápido (solo cálculo local, no guarda nada)
  const dolaresCalculados = pesosInput && dolar?.venta ? Number(pesosInput) / dolar.venta : null
  const pesosCalculados   = dolaresInput && dolar?.venta ? Number(dolaresInput) * dolar.venta : null

  const hayMasMovimientos    = movimientosUSD.length > LIMITE_VISIBLE
  const movimientosVisibles = verTodos ? movimientosUSD : movimientosUSD.slice(0, LIMITE_VISIBLE)

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      <Header title="Tus dólares 💵" subtitle="Tu posición en USD, en detalle" />

      {!cargado ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : (
        <>
          {/* Tu posición + Cotización (compacta, en la misma card) */}
          {ahorrosUSD.length === 0 ? (
            <div className="card flex flex-col items-center py-12 text-center border-dashed border-zinc-700">
              <p className="text-4xl mb-3">💵</p>
              <p className="text-zinc-300 font-semibold">Todavía no tenés dólares ahorrados.</p>
              <p className="text-zinc-500 text-sm mt-1">Cargá tu primer ahorro en USD desde Registrar o Monedita.</p>
            </div>
          ) : (
            <div
              className="card"
              style={{
                background: 'linear-gradient(150deg, rgba(109,40,217,.18), rgba(67,20,179,.12))',
                borderColor: 'rgba(139,92,246,.35)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">💵</span>
                <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">Tu posición</p>
              </div>
              <p className="font-num font-extrabold text-4xl text-violet-400">
                USD {totalUSD.toLocaleString('es-AR')}
              </p>
              {valorHoy != null ? (
                <p className="text-sm text-zinc-300 mt-1">≈ {formatARS(valorHoy)} hoy</p>
              ) : (
                <p className="text-xs text-amber-400 mt-1">
                  No pudimos traer la cotización de hoy — mostrando tu posición histórica.
                </p>
              )}
              {variacion != null && (
                <p className={`text-base font-semibold mt-3 ${gano ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {gano ? '▲' : '▼'} {formatARS(Math.abs(variacion))} ({variacionPct >= 0 ? '+' : ''}{variacionPct.toFixed(1)}%) {gano ? 'ganado' : 'perdido'}
                </p>
              )}

              {/* Cotización — compacta, dentro de la misma card */}
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(139,92,246,.2)' }}>
                {dolar ? (
                  <>
                    <div>
                      <p className="text-xs text-zinc-400">Dólar blue</p>
                      {dolar.fechaActualizacion && (
                        <p className="text-[11px] text-zinc-500">
                          {new Date(dolar.fechaActualizacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-num font-bold text-zinc-100">{formatARS(dolar.venta)}</p>
                      <p className="text-xs text-zinc-500">compra {formatARS(dolar.compra)}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-zinc-500">Cotización no disponible ahora.</p>
                )}
              </div>
            </div>
          )}

          {/* Movimientos en dólares */}
          <div className="card">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">Movimientos en dólares</p>
            {movimientosUSD.length === 0 ? (
              <p className="text-sm text-zinc-500">Todavía no tenés movimientos en dólares.</p>
            ) : (
              <>
                <div className={`space-y-2 ${verTodos ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}>
                  {movimientosVisibles.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setEditando(m)}
                      className="flex items-center gap-3 bg-zinc-800/50 rounded-xl px-3 py-2.5
                                 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <span className="text-xl flex-shrink-0">{m.categorias?.emoji ?? '💵'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate">
                          {m.concepto || m.categorias?.nombre || m.tipo}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {diaLabel(m.fecha)} · cotización {formatARS(m.cotizacion ?? 0)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-extrabold font-num ${COLORES_TIPO[m.tipo]}`}>
                          {SIGNOS_TIPO[m.tipo]}USD {Number(m.monto).toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatARS(Number(m.monto) * Number(m.cotizacion ?? 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {hayMasMovimientos && (
                  <button
                    onClick={() => setVerTodos(v => !v)}
                    className="w-full mt-3 text-sm text-violet-400 hover:text-violet-300 font-medium transition-all"
                  >
                    {verTodos ? 'Ver menos' : `Ver todos (${movimientosUSD.length})`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Rendimiento + Conversor — lado a lado en desktop, apilados en mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rendimiento */}
            <div
              className="card"
              style={
                rendimientoConocido
                  ? rendimientoGano
                    ? { background: 'rgba(52,211,153,.06)', borderColor: 'rgba(52,211,153,.25)' }
                    : { background: 'rgba(251,113,133,.06)', borderColor: 'rgba(251,113,133,.25)' }
                  : undefined
              }
            >
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Rendimiento</p>
              {comprasUSD.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Todavía no tenés compras en dólares para calcular tu rendimiento.
                </p>
              ) : ppc != null && dolar?.venta ? (
                <p className={`text-sm leading-relaxed ${rendimientoGano ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Compraste a un promedio de <span className="font-bold font-num text-zinc-100">{formatARS(ppc)}</span> — hoy{' '}
                  <span className="font-bold font-num text-zinc-100">{formatARS(dolar.venta)}</span> — rendimiento{' '}
                  <span className="font-extrabold">{rendimientoPct >= 0 ? '+' : ''}{rendimientoPct.toFixed(1)}%</span>.
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  Compraste a un promedio de {formatARS(ppc)}. No pudimos traer la cotización de hoy para calcular el rendimiento.
                </p>
              )}
            </div>

            {/* Conversor rápido */}
            <div className="card">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">Conversor rápido</p>
              {!dolar?.venta ? (
                <p className="text-sm text-zinc-500">Sin cotización disponible, no se puede convertir ahora.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                      <span className="text-emerald-400">Pesos</span> → <span className="text-violet-400">Dólares</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold pointer-events-none">$</span>
                      <input
                        type="text" inputMode="numeric" placeholder="0"
                        value={pesosInput ? new Intl.NumberFormat('es-AR').format(Number(pesosInput)) : ''}
                        onChange={e => setPesosInput(e.target.value.replace(/\D/g, ''))}
                        className="input-dark pl-9"
                      />
                    </div>
                    {dolaresCalculados != null && (
                      <p className="text-sm font-semibold text-violet-400">
                        ≈ USD {dolaresCalculados.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                      <span className="text-violet-400">Dólares</span> → <span className="text-emerald-400">Pesos</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold pointer-events-none">US$</span>
                      <input
                        type="text" inputMode="numeric" placeholder="0"
                        value={dolaresInput ? new Intl.NumberFormat('es-AR').format(Number(dolaresInput)) : ''}
                        onChange={e => setDolaresInput(e.target.value.replace(/\D/g, ''))}
                        className="input-dark pl-12"
                      />
                    </div>
                    {pesosCalculados != null && (
                      <p className="text-sm font-semibold text-violet-400">≈ {formatARS(pesosCalculados)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
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