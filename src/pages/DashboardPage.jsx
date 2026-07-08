import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMovimientos } from '../hooks/useMovimientos'
import { usePresupuesto } from '../hooks/usePresupuesto'
import { supabase } from '../lib/supabase'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const COLORES_PIE = ['#8b5cf6','#34d399','#fb7185','#60a5fa','#f97316','#e879f9','#2dd4bf','#a78bfa','#6ee7b7','#fda4af']

function TooltipARS({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-200">{payload[0].name}</p>
      <p className="text-violet-300">{new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0}).format(payload[0].value)}</p>
    </div>
  )
}

function TooltipBarras({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:0}).format(n)
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

function formatCompact(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 2,
  }).format(n)
}

function balanceFontClass(n) {
  const len = formatARS(n).length
  return len > 10 ? 'text-2xl' : len > 8 ? 'text-3xl' : 'text-4xl'
}

function mesLabel(mes) {
  const [anio, m] = mes.split('-')
  const nombre = new Date(Number(anio), Number(m) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
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

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Escala el font-size para que el monto siempre entre en una card de ~50% del viewport.
// Área de texto ≈ 45vw - 32px de padding de .card.
// Con Plus Jakarta Sans 800 + tabular-nums cada dígito ocupa ≈ 0.58em de ancho.
function montoFontSize(monto) {
  const len = formatARS(monto).length
  // clamp(min, calc basado en vw, max)
  const vw  = (45 / len / 0.58).toFixed(2)   // vw necesarios
  const sub = (32 / len / 0.58).toFixed(2)   // corrección por padding
  return `clamp(11px, calc(${vw}vw - ${sub}px), 22px)`
}

const CARD_PAD = { padding: '10px 12px' }

function SaldoCard({ label, monto, cantidad, color, onClick }) {
  return (
    <div className="card flex-1 min-w-0 cursor-pointer hover:border-zinc-700 transition-colors" style={CARD_PAD} onClick={onClick}>
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1.5">{label}</span>
      <p className={`font-extrabold font-num ${color} leading-tight`}
         style={{
           fontSize: montoFontSize(monto),
           whiteSpace: 'nowrap',
           letterSpacing: '-0.02em',
           fontVariantNumeric: 'tabular-nums',
         }}>
        {formatARS(monto)}
      </p>
      <p className="text-xs font-normal text-zinc-500 mt-1">{cantidad} mov.</p>
    </div>
  )
}

const PRESUP_STYLE = {
  ...CARD_PAD,
  background: 'linear-gradient(150deg, rgba(109,40,217,.18), rgba(67,20,179,.12))',
  borderColor: 'rgba(139,92,246,.35)',
}

function PresupuestoCard({ gastos, mes, onClick }) {
  const { presupuestos, loading } = usePresupuesto(mes)
  const general = presupuestos.find(p => p.categoria_id === null)

  if (loading) {
    return (
      <div className="card flex-1 min-w-0 cursor-pointer hover:border-zinc-700 transition-colors" style={PRESUP_STYLE} onClick={onClick}>
        <span className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: '#a78bfa' }}>Presupuesto</span>
        <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(139,92,246,.15)' }} />
      </div>
    )
  }

  if (!general) {
    return (
      <div className="card flex-1 min-w-0 cursor-pointer hover:border-zinc-700 transition-colors" style={PRESUP_STYLE} onClick={onClick}>
        <span className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: '#a78bfa' }}>Presupuesto</span>
        <p className="text-xs mt-1" style={{ color: 'rgba(167,139,250,.5)' }}>Sin presupuesto</p>
      </div>
    )
  }

  const usado      = gastos
  const total      = general.monto_max
  const disponible = total - usado
  const pct        = total > 0 ? Math.min((usado / total) * 100, 100) : 0
  const excede     = usado > total
  const warn       = !excede && pct >= 80
  const fillColor  = excede ? '#fb7185' : warn ? '#fbbf24' : '#34d399'
  const montoColor = fillColor   // el disponible adopta el mismo semáforo que la barra

  return (
    <div className="card flex-1 min-w-0 cursor-pointer hover:border-zinc-700 transition-colors" style={PRESUP_STYLE} onClick={onClick}>
      <span className="text-xs font-bold uppercase tracking-wide block mb-1.5" style={{ color: '#a78bfa' }}>Presupuesto</span>
      <p className="font-extrabold font-num leading-tight"
         style={{
           fontSize: montoFontSize(disponible),
           whiteSpace: 'nowrap',
           letterSpacing: '-0.02em',
           fontVariantNumeric: 'tabular-nums',
           color: montoColor,
         }}>
        {formatARS(disponible)}
      </p>
      <p className="text-xs mt-0.5" style={{ whiteSpace: 'nowrap', color: 'rgba(167,139,250,.6)' }}>
        de {formatARS(total)}
      </p>
      <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(139,92,246,.15)' }}>
        <div className="h-1.5 rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, background: fillColor }} />
      </div>
    </div>
  )
}

function DolarBadge() {
  const [dolar, setDolar] = useState(null)

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => r.json())
      .then(setDolar)
      .catch(() => {})
  }, [])

  if (!dolar) return null

  return (
    <div className="flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-3 py-1.5">
      <span className="text-sm">💵</span>
      <span className="text-xs text-zinc-300 font-medium">
        Blue <span className="text-emerald-400">${dolar.venta?.toLocaleString('es-AR')}</span>
      </span>
    </div>
  )
}

function PieGastos({ movimientos }) {
  const [sel, setSel] = useState(null)

  const dataGastos = Object.values(
    movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => {
      const key = m.categoria_id
      if (!acc[key]) acc[key] = { name: `${m.categorias?.emoji ?? ''} ${m.categorias?.nombre ?? 'Otros'}`, value: 0 }
      acc[key].value += m.monto
      return acc
    }, {})
  ).sort((a, b) => b.value - a.value)

  const total = dataGastos.reduce((s, d) => s + d.value, 0)
  const selCat = sel !== null ? dataGastos[sel] : null

  if (dataGastos.length === 0) return (
    <div className="card flex items-center justify-center py-10 text-center">
      <div><p className="text-2xl mb-2">🥧</p><p className="text-zinc-500 text-sm">Sin gastos este mes</p></div>
    </div>
  )

  return (
    <div className="card">
      <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Este mes</p>
      <h2 className="text-base font-black text-zinc-100 mb-3">Gastos por categoría</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={dataGastos}
            cx="50%" cy="50%"
            innerRadius={55} outerRadius={85}
            paddingAngle={1}
            stroke="none"
            dataKey="value"
            onClick={(_, i) => setSel(prev => prev === i ? null : i)}
          >
            {dataGastos.map((_, i) => (
              <Cell
                key={i}
                fill={COLORES_PIE[i % COLORES_PIE.length]}
                opacity={sel === null || sel === i ? 1 : 0.3}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>
          <Tooltip content={<TooltipARS />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Detalle del slice seleccionado */}
      <div className="min-h-[28px] flex items-center justify-center mb-2">
        {selCat ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: `${COLORES_PIE[sel % COLORES_PIE.length]}20` }}>
            <span className="text-sm font-semibold" style={{ color: COLORES_PIE[sel % COLORES_PIE.length] }}>
              {selCat.name}
            </span>
            <span className="text-xs text-zinc-400">
              {formatARS(selCat.value)} · {Math.round((selCat.value / total) * 100)}%
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Tocá una sección para ver el detalle</p>
        )}
      </div>

      {/* Lista compacta scrolleable */}
      <div className="space-y-0.5 max-h-36 overflow-y-auto">
        {dataGastos.map((cat, i) => (
          <button
            key={i}
            onClick={() => setSel(prev => prev === i ? null : i)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left
              ${sel === i ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: COLORES_PIE[i % COLORES_PIE.length] }} />
            <span className="text-xs text-zinc-400 flex-1 truncate">{cat.name}</span>
            <span className="text-xs font-extrabold font-num text-zinc-300 flex-shrink-0">{formatARS(cat.value)}</span>
            <span className="text-xs text-zinc-600 w-8 text-right flex-shrink-0">
              {Math.round((cat.value / total) * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { perfil, user } = useAuth()
  const navigate = useNavigate()
  const [mes, setMes] = useState(mesActual())
  const { movimientos, loading, eliminar } = useMovimientos(mes)
  const [dataMeses, setDataMeses] = useState([])

  useEffect(() => {
    async function fetchUltimosMeses() {
      const now = new Date()
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, d }
      })
      const inicio = `${meses[0].key}-01`
      const finD = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const fin = finD.toISOString().split('T')[0]
      const { data } = await supabase.from('movimientos').select('tipo,monto,fecha').gte('fecha',inicio).lte('fecha',fin)
      setDataMeses(meses.map(({ key, d }) => {
        const [a, m] = key.split('-').map(Number)
        const mvs = (data ?? []).filter(mv => { const [ma,mm] = mv.fecha.split('-').map(Number); return ma===a && mm===m })
        const label = d.toLocaleDateString('es-AR',{month:'short'})
        return {
          mes: label.charAt(0).toUpperCase() + label.slice(1),
          Ingresos: mvs.filter(mv=>mv.tipo==='ingreso').reduce((s,mv)=>s+mv.monto,0),
          Gastos:   mvs.filter(mv=>mv.tipo==='gasto').reduce((s,mv)=>s+mv.monto,0),
          Ahorro:   mvs.filter(mv=>mv.tipo==='ahorro').reduce((s,mv)=>s+mv.monto,0),
        }
      }))
    }
    fetchUltimosMeses()
  }, [])

  const esMesActual = mes === mesActual()

  // Totales
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalGastos   = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
  const totalAhorro   = movimientos.filter(m => m.tipo === 'ahorro').reduce((s, m) => s + m.monto, 0)
  const balance       = totalIngresos - totalGastos - totalAhorro
  const pctAhorro     = totalIngresos > 0 ? Math.round((totalAhorro / totalIngresos) * 100) : 0

  // Top 3 gastos por categoría
  const topGastos = Object.values(
    movimientos
      .filter(m => m.tipo === 'gasto')
      .reduce((acc, m) => {
        const key = m.categoria_id
        if (!acc[key]) acc[key] = { emoji: m.categorias?.emoji ?? '📦', nombre: m.categorias?.nombre ?? 'Otros', total: 0 }
        acc[key].total += m.monto
        return acc
      }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 3)

  const maxGasto = topGastos[0]?.total ?? 1

  // Últimos 5 movimientos
  const ultimos = movimientos.slice(0, 5)

  const hora = new Date().getHours()
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = perfil?.nombre || user?.email?.split('@')[0] || 'vos'

  return (
    <>
    <button
      onClick={() => navigate('/registrar')}
      aria-label="Registrar movimiento"
      className="fixed z-40 w-[60px] h-[60px] rounded-full
                 bg-violet-600 hover:bg-violet-500 active:scale-95
                 text-white text-3xl font-light
                 flex items-center justify-center
                 shadow-lg shadow-violet-900/60
                 transition-all duration-150"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', right: 20 }}
    >
      +
    </button>
    <div className="page-enter px-4 md:px-6 pt-4 pb-2 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-normal text-zinc-400">{saludo},</p>
          <h1 className="text-3xl font-black text-zinc-100">{nombre} 👋</h1>
        </div>
        <DolarBadge />
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5">
        <button onClick={() => setMes(mesAnterior(mes))}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all active:scale-95">
          ‹
        </button>
        <span className="text-sm font-semibold text-zinc-200">{mesLabel(mes)}</span>
        <button onClick={() => setMes(mesSiguiente(mes))} disabled={esMesActual}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
          ›
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <img
            src="/monedita/monedita-tranqui.svg"
            alt="Cargando..."
            className="w-16 h-16 object-contain animate-bounce"
          />
          <p className="text-sm font-normal text-zinc-500">Cargando tus numeritos...</p>
        </div>
      ) : (
        <>
          {/* Balance + tarjetas — lado a lado en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => navigate('/analisis')} style={{ background: 'linear-gradient(150deg,#3b2a6b,#241a47)', borderColor: 'rgba(139,92,246,.35)' }}>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Balance del mes</p>
              <p className={`${balanceFontClass(balance)} font-num font-extrabold tracking-tight ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatARS(balance)}
              </p>
              {totalIngresos > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-zinc-500">Ahorro:</span>
                  <span className="text-xs font-extrabold text-violet-400">{pctAhorro}% de los ingresos</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SaldoCard label="Ingresos" monto={totalIngresos} cantidad={movimientos.filter(m => m.tipo === 'ingreso').length} color="text-emerald-400" onClick={() => navigate('/movimientos')} />
              <SaldoCard label="Gastos"   monto={totalGastos}   cantidad={movimientos.filter(m => m.tipo === 'gasto').length}   color="text-rose-400"   onClick={() => navigate('/movimientos')} />
              <SaldoCard label="Ahorro"   monto={totalAhorro}   cantidad={movimientos.filter(m => m.tipo === 'ahorro').length}  color="text-violet-400" onClick={() => navigate('/metas')} />
              <PresupuestoCard gastos={totalGastos} mes={mes} onClick={() => navigate('/presupuesto')} />
            </div>
          </div>

          {/* Monedita insight card */}
          {!loading && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[18px]"
                 style={{ background: 'rgba(245,200,75,.07)', border: '1px solid rgba(245,200,75,.22)' }}>
              <img src="/monedita/monedita-contenta.svg" alt="Monedita"
                   className="w-9 h-9 flex-shrink-0 object-contain" />
              <p className="text-sm font-normal text-zinc-400 leading-relaxed">
                {totalGastos === 0
                  ? 'Todavía no cargaste nada este mes. Anotá tu primer gasto y empezamos a ordenar tus números.'
                  : balance < 0
                    ? 'Uff, los gastos le ganaron a los ingresos este mes. Todavía podés cerrar mejor.'
                    : pctAhorro >= 20
                      ? `¡La rompiste! Ahorraste el ${pctAhorro}% de tus ingresos este mes 🌟`
                      : pctAhorro > 0
                        ? `Ahorraste el ${pctAhorro}% de tus ingresos. ¿Le metemos un poco más?`
                        : 'Tu balance está en positivo. Seguí así y va a crecer mes a mes 💪'}
              </p>
            </div>
          )}

          {/* Top gastos + Movimientos — lado a lado en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topGastos.length > 0 && (
              <div className="card space-y-3 cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => navigate('/analisis')}>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Categorías</p>
                  <h2 className="text-base font-black text-zinc-100">Top gastos del mes</h2>
                </div>
                {topGastos.map((g, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-sm font-extrabold text-zinc-100 min-w-0 truncate">{g.emoji} {g.nombre}</span>
                      <span className="font-extrabold font-num text-rose-400 flex-shrink-0">{formatARS(g.total)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((g.total / maxGasto) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card space-y-1 cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => navigate('/movimientos')}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-black text-zinc-100">Últimos movimientos</h2>
                <button onClick={(e) => { e.stopPropagation(); navigate('/movimientos') }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Ver todos →
                </button>
              </div>
              {ultimos.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-zinc-500 text-sm">Sin movimientos este mes</p>
                  <p className="text-zinc-600 text-xs mt-1">Cargá uno desde el botón + de abajo.</p>
                </div>
              ) : (
                ultimos.map((m) => {
                  const fechaLabel = new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800 last:border-0 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                        {m.categorias?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {m.concepto || m.categorias?.nombre || 'Sin descripción'}
                        </p>
                        <p className="text-xs text-zinc-500">{m.categorias?.nombre} · {fechaLabel}</p>
                      </div>
                      <span className={`text-sm font-extrabold font-num flex-shrink-0 ${
                        m.tipo === 'ingreso' ? 'text-emerald-400'
                        : m.tipo === 'ahorro' ? 'text-violet-400'
                        : 'text-rose-400'
                      }`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{formatARS(m.monto)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminar(m.id) }}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-rose-500/20 flex items-center justify-center
                                   text-zinc-600 hover:text-rose-400 text-xs transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie: gastos del mes por categoría */}
            <PieGastos key={mes} movimientos={movimientos} />

            {/* Barras: últimos 6 meses */}
            <div className="card overflow-hidden">
              <p className="text-xs font-black uppercase tracking-widest text-violet-400 mb-1">Evolución</p>
              <h2 className="text-base font-black text-zinc-100 mb-1">Últimos 6 meses</h2>
              {/* Leyenda */}
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#34d399' }} />Ingresos</span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#fb7185' }} />Gastos</span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#8b5cf6' }} />Ahorro</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataMeses} barCategoryGap="30%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<TooltipBarras />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="Ingresos" fill="#34d399" radius={[4,4,0,0]} />
                  <Bar dataKey="Gastos"   fill="#fb7185" radius={[4,4,0,0]} />
                  <Bar dataKey="Ahorro"   fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  )
}
