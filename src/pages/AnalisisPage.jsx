import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useMovimientos } from '../hooks/useMovimientos'
import { usePresupuesto } from '../hooks/usePresupuesto'
import { useMetas } from '../hooks/useMetas'
import { useReportes } from '../hooks/useReportes'
import { supabase } from '../lib/supabase'
import { calcularInsights } from '../lib/insights'
import { generarAnalisis } from '../lib/ia-analyzer'
import ReporteMensual from '../components/Insights/ReporteMensual'
import HistorialReportes from '../components/Insights/HistorialReportes'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function mesLabel(mes) {
  const [a, m] = mes.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mesLabelCorto(mes) {
  const [a, m] = mes.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mesSiguiente(mes) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const INSIGHT_COLORS = {
  alerta:   { bg: 'rgba(251,113,133,.07)', border: 'rgba(251,113,133,.22)', text: '#fb7185', img: 'tranqui'  },
  warning:  { bg: 'rgba(251,191,36,.07)',  border: 'rgba(251,191,36,.22)',  text: '#fbbf24', img: 'tranqui'  },
  positivo: { bg: 'rgba(52,211,153,.07)',  border: 'rgba(52,211,153,.22)',  text: '#34d399', img: 'contenta' },
  info:     { bg: 'rgba(139,92,246,.07)',  border: 'rgba(139,92,246,.22)',  text: '#a78bfa', img: 'contenta' },
}

const GRUPOS_LABEL = {
  alerta:   'Alertas',
  warning:  'Advertencias',
  positivo: 'Lo que va bien',
  info:     'Observaciones',
}

const LOADER_MSGS = [
  'Analizando lo que gastaste...',
  'Buscando qué resaltar...',
  'Pensando qué recomendarte...',
  'Mirando cómo van tus metas...',
  'Armando el resumen...',
]

export default function AnalisisPage() {
  const [tab, setTab]                 = useState('analisis')
  const [mes, setMes]                 = useState(mesActual())
  const { movimientos, loading }      = useMovimientos(mes)
  const { presupuestos }              = usePresupuesto(mes)
  const { metas }                     = useMetas()
  const { reportes, guardar } = useReportes()
  const [dataMeses, setDataMeses]     = useState([])
  const [movsPrev, setMovsPrev]       = useState([])

  // IA state
  const [generando, setGenerando]     = useState(false)
  const [loaderMsg, setLoaderMsg]     = useState(0)
  const [reporteActual, setReporteActual] = useState(null)
  const [errorIA, setErrorIA]         = useState(null)

  // Fetch 6-month history para evolución de ahorro
  useEffect(() => {
    async function fetchMeses() {
      const now = new Date()
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, d }
      })
      const inicio = `${meses[0].key}-01`
      const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data } = await supabase.from('movimientos').select('tipo,monto,fecha').gte('fecha', inicio).lte('fecha', fin)
      setDataMeses(meses.map(({ key }) => {
        const [a, m] = key.split('-').map(Number)
        const mvs = (data ?? []).filter(mv => { const [ma,mm] = mv.fecha.split('-').map(Number); return ma===a && mm===m })
        return {
          key,
          mes: mesLabelCorto(key),
          Ingresos: mvs.filter(mv=>mv.tipo==='ingreso').reduce((s,mv)=>s+mv.monto,0),
          Gastos:   mvs.filter(mv=>mv.tipo==='gasto').reduce((s,mv)=>s+mv.monto,0),
          Ahorro:   mvs.filter(mv=>mv.tipo==='ahorro').reduce((s,mv)=>s+mv.monto,0),
        }
      }))
    }
    fetchMeses()
  }, [])

  // Fetch mes anterior para comparativa por categoría
  useEffect(() => {
    async function fetchPrev() {
      const prev = mesAnterior(mes)
      const [a, m] = prev.split('-').map(Number)
      const inicio = `${prev}-01`
      const fin = new Date(a, m, 0).toISOString().split('T')[0]
      const { data } = await supabase
        .from('movimientos')
        .select('tipo, monto, categoria_id, categorias(nombre, emoji)')
        .gte('fecha', inicio).lte('fecha', fin)
      setMovsPrev(data ?? [])
    }
    fetchPrev()
  }, [mes])

  // Cycling loader messages
  useEffect(() => {
    if (!generando) return
    const interval = setInterval(() => {
      setLoaderMsg(i => (i + 1) % LOADER_MSGS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [generando])

  // Mostrar el último reporte del mes si ya hay uno
  useEffect(() => {
    const del_mes = reportes.filter(r => r.mes?.startsWith(mes))
    if (del_mes.length > 0 && !reporteActual) {
      setReporteActual(del_mes[0])
    } else if (del_mes.length === 0) {
      setReporteActual(null)
    }
  }, [reportes, mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const esMesActual = mes === mesActual()

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalGastos   = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
  const totalAhorro   = movimientos.filter(m => m.tipo === 'ahorro').reduce((s, m) => s + m.monto, 0)
  const balance       = totalIngresos - totalGastos - totalAhorro

  // ── Comparativa vs mes anterior por categoría ──────────────────
  const gastosCatActual = movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => {
    if (!acc[m.categoria_id]) acc[m.categoria_id] = { emoji: m.categorias?.emoji ?? '📦', nombre: m.categorias?.nombre ?? 'Otros', total: 0 }
    acc[m.categoria_id].total += m.monto
    return acc
  }, {})

  const gastosCatPrev = movsPrev.filter(m => m.tipo === 'gasto').reduce((acc, m) => {
    acc[m.categoria_id] = (acc[m.categoria_id] ?? 0) + m.monto
    return acc
  }, {})

  const comparativa = Object.entries(gastosCatActual)
    .map(([id, cat]) => {
      const prev = gastosCatPrev[id] ?? 0
      const diff = prev > 0 ? Math.round(((cat.total - prev) / prev) * 100) : null
      return { ...cat, id, prev, diff }
    })
    .sort((a, b) => b.total - a.total)

  // ── Distribución semanal del gasto ─────────────────────────────
  const semanasGasto = movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => {
    const dia = new Date(m.fecha + 'T00:00:00').getDate()
    const semana = Math.ceil(dia / 7)
    acc[semana] = (acc[semana] ?? 0) + m.monto
    return acc
  }, {})

  const semanas = [1, 2, 3, 4].map(s => ({
    label: `Semana ${s} (${(s-1)*7+1}–${Math.min(s*7, 31)})`,
    total: semanasGasto[s] ?? 0,
  }))
  const maxSemana = Math.max(...semanas.map(s => s.total), 1)

  // ── Evolución de la tasa de ahorro ─────────────────────────────
  const evolucionAhorro = dataMeses.map(m => ({
    mes: m.mes,
    tasa: m.Ingresos > 0 ? Math.round((m.Ahorro / m.Ingresos) * 100) : 0,
    esActual: m.key === mes,
  }))
  const maxTasa = Math.max(...evolucionAhorro.map(m => m.tasa), 1)

  // ── Insights ───────────────────────────────────────────────────
  const insights = loading ? [] : calcularInsights(
    { movimientos, mes, presupuestos, metas, dataMeses, totalIngresos, totalAhorro }, 10
  )
  const porTipo = insights.reduce((acc, ins) => {
    if (!acc[ins.tipo]) acc[ins.tipo] = []
    acc[ins.tipo].push(ins)
    return acc
  }, {})

  // ── IA helpers ─────────────────────────────────────────────────
  const monoExpression = balance >= 0 ? 'contenta' : 'tranqui'

  async function handleGenerarAnalisis() {
    setErrorIA(null)
    setGenerando(true)
    setLoaderMsg(0)
    try {
      const PALABRAS_FIJO = ['gym', 'gimnasio', 'transport', 'colectivo', 'subte', 'tren', 'facultad', 'universidad', 'colegio', 'estudio',
        'suscri', 'netflix', 'spotify', 'disney', 'amazon', 'alquiler', 'servicio', 'internet', 'luz', 'gas', 'agua',
        'seguro', 'obra social', 'medicina', 'prepaga', 'cuota', 'banco', 'tarjeta fija']
      const esFijo = (nombre) => PALABRAS_FIJO.some(p => nombre.toLowerCase().includes(p))

      const gastosPorCategoria = Object.values(gastosCatActual)
        .sort((a, b) => b.total - a.total)
        .map(c => ({
          categoria: `${c.emoji} ${c.nombre}`,
          monto: c.total,
          tipo: esFijo(c.nombre) ? 'fijo' : 'variable',
        }))

      const presupuestoResumen = presupuestos.map(p => ({
        categoria: p.categoria_id === null ? 'Presupuesto general' : `${p.categorias?.emoji ?? ''} ${p.categorias?.nombre ?? ''}`.trim(),
        monto_max: p.monto_max,
        gastado: p.categoria_id === null
          ? totalGastos
          : gastosCatActual[p.categoria_id]?.total ?? 0,
      }))

      const metasResumen = metas.filter(m => !m.archivada).map(m => ({
        nombre: `${m.emoji} ${m.nombre}`,
        objetivo: m.monto_objetivo,
        ahorrado: movimientos.filter(mv => mv.tipo === 'ahorro' && mv.meta_id === m.id).reduce((s, mv) => s + mv.monto, 0),
        fecha_objetivo: m.fecha_objetivo,
      }))

      const ultimosMeses = dataMeses.slice(-3).map(d => ({
        mes: d.mes,
        ingresos: d.Ingresos,
        gastos: d.Gastos,
        ahorro: d.Ahorro,
      }))

      const totalFijos    = gastosPorCategoria.filter(c => c.tipo === 'fijo').reduce((s, c) => s + c.monto, 0)
      const totalVariables = gastosPorCategoria.filter(c => c.tipo === 'variable').reduce((s, c) => s + c.monto, 0)

      const payload = {
        mes: mesLabel(mes),
        resumen: { totalIngresos, totalGastos, totalAhorro, balance, gastos_fijos: totalFijos, gastos_variables: totalVariables },
        gastos_por_categoria: gastosPorCategoria,
        presupuesto: presupuestoResumen,
        metas: metasResumen,
        ultimos_3_meses: ultimosMeses,
        comparativa_mes_anterior: comparativa.slice(0, 5).map(c => ({
          categoria: `${c.emoji} ${c.nombre}`,
          este_mes: c.total,
          mes_anterior: c.prev,
          variacion_pct: c.diff,
        })),
      }

      // Snapshot del mes para alimentar reportes futuros
      const resumenDatosActual = {
        ingresos: totalIngresos,
        gastos: totalGastos,
        ahorro: totalAhorro,
        balance,
        gastos_fijos: totalFijos,
        gastos_variables: totalVariables,
        gastos_por_categoria: gastosPorCategoria,
      }

      // Últimos 6 reportes anteriores con sus datos históricos
      const reportesAnteriores = reportes
        .filter(r => r.mes && !r.mes.startsWith(mes))
        .sort((a, b) => b.mes.localeCompare(a.mes))
        .slice(0, 6)

      const texto = await generarAnalisis(payload, reportesAnteriores)
      const { error } = await guardar({ mes, contenido: texto, resumen_datos: resumenDatosActual })
      if (error) throw new Error(error)
      setReporteActual({ contenido: texto, generado_at: new Date().toISOString() })
    } catch (e) {
      setErrorIA(e.message ?? 'Ocurrió un error al generar el análisis.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="page-enter px-4 md:px-6 pt-4 pb-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-100">Análisis 📈</h1>
        <p className="text-sm font-normal text-zinc-400 mt-0.5">Entendé en qué se va tu plata</p>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5">
        <button onClick={() => { setMes(mesAnterior(mes)); setReporteActual(null) }}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all active:scale-95">‹</button>
        <span className="text-sm font-semibold text-zinc-200">{mesLabel(mes)}</span>
        <button onClick={() => { setMes(mesSiguiente(mes)); setReporteActual(null) }} disabled={esMesActual}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : (
        <>
          {/* Resumen — visible en ambas pestañas */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Ingresos', val: totalIngresos, color: 'text-emerald-400' },
              { label: 'Gastos',   val: totalGastos,   color: 'text-rose-400'    },
              { label: 'Ahorro',   val: totalAhorro,   color: 'text-violet-400'  },
              { label: 'Balance',  val: balance,       color: balance >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="card py-3 px-2 text-center overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
                <p className={`text-[10px] sm:text-xs font-extrabold font-num ${color} leading-tight whitespace-nowrap tracking-tight tabular-nums`}>
                  {formatARS(val)}
                </p>
              </div>
            ))}
          </div>

          {/* Toggle de pestañas */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#18181b', border: '1px solid #1f1f23' }}>
            <button
              onClick={() => setTab('analisis')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all
                ${tab === 'analisis' ? 'bg-violet-600 text-white shadow-violet-glow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Análisis
            </button>
            <button
              onClick={() => setTab('monedita')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all
                ${tab === 'monedita' ? 'bg-violet-600 text-white shadow-violet-glow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Resumen de Monedita
            </button>
          </div>

          {/* ── PESTAÑA: ANÁLISIS ─────────────────────────────────── */}
          {tab === 'analisis' && (
            <div className="space-y-5">

              {/* Comparativa vs mes anterior */}
              {comparativa.length > 0 && (
                <div className="card space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Por categoría</p>
                    <h2 className="text-base font-black text-zinc-100">Comparativa vs mes anterior</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Gastos de este mes frente a {mesLabel(mesAnterior(mes))}</p>
                  </div>
                  <div className="space-y-2">
                    {comparativa.slice(0, 5).map((cat) => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-zinc-100 truncate">{cat.nombre}</p>
                          {cat.prev > 0 && (
                            <p className="text-xs font-normal text-zinc-400">Anterior: {formatARS(cat.prev)}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 space-y-0.5">
                          <p className="font-extrabold font-num text-rose-400">{formatARS(cat.total)}</p>
                          {cat.diff !== null && (
                            <p className={`text-xs font-medium ${cat.diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {cat.diff > 0 ? '↑' : '↓'} {Math.abs(cat.diff)}%
                            </p>
                          )}
                          {cat.diff === null && (
                            <p className="text-xs text-zinc-600">Nuevo</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distribución semanal del gasto */}
              {totalGastos > 0 && (
                <div className="card space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Distribución temporal</p>
                    <h2 className="text-base font-black text-zinc-100">¿En qué semana gastás más?</h2>
                  </div>
                  <div className="space-y-2.5">
                    {semanas.map((s, i) => {
                      const pct = maxSemana > 0 ? (s.total / maxSemana) * 100 : 0
                      const esMayor = s.total === maxSemana && s.total > 0
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={`${esMayor ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>{s.label}</span>
                            <span className={`font-semibold ${esMayor ? 'text-rose-400' : 'text-zinc-400'}`}>
                              {s.total > 0 ? formatARS(s.total) : '—'}
                              {esMayor && <span className="ml-1 text-xs text-rose-500">↑ mayor</span>}
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${esMayor ? 'bg-rose-500' : 'bg-zinc-600'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Evolución de la tasa de ahorro */}
              {dataMeses.length > 0 && (
                <div className="card space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Evolución</p>
                    <h2 className="text-base font-black text-zinc-100">Ahorro en los últimos 6 meses</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Ahorro como % de los ingresos mensuales</p>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {evolucionAhorro.map((m, i) => {
                      const pct = maxTasa > 0 ? (m.tasa / maxTasa) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-zinc-500 font-medium">{m.tasa > 0 ? `${m.tasa}%` : ''}</span>
                          <div className="w-full flex items-end" style={{ height: 48 }}>
                            <div
                              className={`w-full rounded-t-md transition-all duration-700 ${m.esActual ? 'bg-violet-500' : 'bg-zinc-700'}`}
                              style={{ height: `${Math.max(pct, m.tasa > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <span className={`text-xs ${m.esActual ? 'text-violet-400 font-semibold' : 'text-zinc-600'}`}>{m.mes}</span>
                        </div>
                      )
                    })}
                  </div>
                  {evolucionAhorro.every(m => m.tasa === 0) && (
                    <p className="text-xs text-zinc-600 text-center">Sin datos de ahorro registrados en este período</p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ── PESTAÑA: RESUMEN DE MONEDITA ─────────────────────── */}
          {tab === 'monedita' && (
            <div className="space-y-6">

              {/* Eyebrow + título */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={14} className="text-violet-400" />
                  <p className="text-xs font-black uppercase tracking-widest text-violet-400">
                    El resumen de Monedita
                  </p>
                </div>
                <h2 className="text-2xl font-black text-zinc-100">
                  Cómo te fue en {mesLabel(mes)}
                </h2>
              </div>

              {/* Insights automáticos agrupados */}
              {insights.length > 0 ? (
                <div className="space-y-6">
                  {['alerta','warning','positivo','info'].filter(t => porTipo[t]?.length > 0).map(tipo => {
                    const c = INSIGHT_COLORS[tipo]
                    return (
                      <div key={tipo} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={`/monedita/monedita-${c.img}.svg`}
                            alt=""
                            className="w-6 h-6 object-contain flex-shrink-0"
                          />
                          <p className="text-xs font-black uppercase tracking-widest" style={{ color: c.text }}>
                            {GRUPOS_LABEL[tipo]}
                          </p>
                        </div>
                        <div className="space-y-2.5">
                          {porTipo[tipo].map((ins, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-4 rounded-[18px] px-4 py-4"
                              style={{ background: c.bg, border: `1px solid ${c.border}` }}
                            >
                              <span className="text-xl flex-shrink-0 mt-0.5">{ins.emoji}</span>
                              <p className="text-base font-semibold leading-snug" style={{ color: c.text }}>
                                {ins.mensaje}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <img
                    src="/monedita/monedita-tranqui.svg"
                    alt="Monedita"
                    className="w-16 h-16 object-contain opacity-70"
                  />
                  <p className="text-sm font-semibold text-zinc-500">
                    No hay alertas ni novedades por ahora.<br />
                    Cargá más gastos para que Monedita pueda darte un análisis completo.
                  </p>
                </div>
              )}

              {/* Sección IA */}
              {esMesActual ? (
                // Mes actual: el reporte aún no está disponible
                <div className="rounded-[18px] p-5 space-y-2"
                     style={{ background: '#18181b', border: '1px solid rgba(139,92,246,.12)' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-violet-400/40" />
                    <p className="text-xs font-black uppercase tracking-widest text-violet-400/40">Análisis IA</p>
                  </div>
                  <h3 className="text-base font-black text-zinc-500">Resumen de Monedita</h3>
                  <p className="text-sm font-normal text-zinc-600 leading-relaxed">
                    El resumen de este mes estará disponible a partir del 1° de {mesLabel(mesSiguiente(mes))}.
                  </p>
                </div>
              ) : !reporteActual ? (
                // Mes pasado sin reporte: mostrar botón de generación
                <div className="rounded-[18px] p-5 space-y-4"
                     style={{ background: '#18181b', border: '1px solid rgba(139,92,246,.25)' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={13} className="text-violet-400" />
                      <p className="text-xs font-black uppercase tracking-widest text-violet-400">Análisis IA</p>
                    </div>
                    <h3 className="text-base font-black text-zinc-100">
                      Generar el Resumen de Monedita
                    </h3>
                    <p className="text-sm font-normal text-zinc-400 mt-1 leading-relaxed">
                      Monedita analiza tus datos de {mesLabel(mes)} y te arma un resumen del mes.
                    </p>
                  </div>

                  {generando ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-violet-300 animate-pulse">{LOADER_MSGS[loaderMsg]}</p>
                    </div>
                  ) : (
                    <>
                      {errorIA && (
                        <div className="rounded-[14px] px-4 py-3"
                             style={{ background: 'rgba(251,113,133,.07)', border: '1px solid rgba(251,113,133,.22)' }}>
                          <p className="text-sm font-semibold" style={{ color: '#fb7185' }}>{errorIA}</p>
                        </div>
                      )}
                      <button
                        onClick={handleGenerarAnalisis}
                        disabled={movimientos.length === 0}
                        className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        Generar el Resumen de Monedita
                      </button>
                      {movimientos.length === 0 && (
                        <p className="text-sm font-medium text-center text-zinc-600">
                          No hay movimientos registrados en {mesLabel(mes)}.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : null /* Mes pasado con reporte: solo muestra el reporte abajo */}

              {/* Reporte generado */}
              {reporteActual && !generando && (
                <ReporteMensual
                  contenido={reporteActual.contenido}
                  generadoAt={reporteActual.generado_at}
                  expression={monoExpression}
                />
              )}

              {/* Historial de meses anteriores */}
              <HistorialReportes reportes={reportes} mesActivo={mes} />

            </div>
          )}

        </>
      )}
    </div>
  )
}
