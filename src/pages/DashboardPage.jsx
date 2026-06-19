import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMovimientos } from '../hooks/useMovimientos'
import { usePresupuesto } from '../hooks/usePresupuesto'
import { useMetas } from '../hooks/useMetas'
import { supabase } from '../lib/supabase'
import { calcularInsights } from '../lib/insights'
import InsightCard from '../components/Insights/InsightCard'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const COLORES_PIE = ['#8b5cf6','#10b981','#f43f5e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a78bfa','#34d399']

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
    style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1,
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

function SaldoCard({ label, monto, cantidad, color, emoji }) {
  return (
    <div className="card flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-base">{emoji}</span>
        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color} leading-tight truncate`}>{formatCompact(monto)}</p>
      <p className="text-xs text-zinc-600 mt-1">{cantidad} mov.</p>
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

export default function DashboardPage() {
  const { perfil, user } = useAuth()
  const navigate = useNavigate()
  const [mes, setMes] = useState(mesActual())
  const { movimientos, loading, eliminar } = useMovimientos(mes)
  const { presupuestos } = usePresupuesto(mes)
  const { metas } = useMetas()
  const [dataMeses, setDataMeses] = useState([])
  const [insightsAbiertos, setInsightsAbiertos] = useState(false)

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

  // Insights locales
  const insights = loading ? [] : calcularInsights({
    movimientos, mes, presupuestos, metas, dataMeses, totalIngresos, totalAhorro
  })

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
    <div className="page-enter px-4 md:px-6 pt-4 pb-2 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-sm">{saludo},</p>
          <h1 className="text-2xl font-bold text-zinc-100">{nombre} 👋</h1>
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
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">💸</div>
            <p className="text-zinc-500 text-sm">Cargando...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Balance + tarjetas — lado a lado en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-gradient-to-br from-violet-900/40 to-zinc-900 border-violet-800/30">
              <p className="text-zinc-400 text-sm mb-1">Balance del mes</p>
              <p className={`${balanceFontClass(balance)} font-extrabold tracking-tight ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatARS(balance)}
              </p>
              {totalIngresos > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-zinc-500">Ahorro:</span>
                  <span className="text-xs font-semibold text-violet-400">{pctAhorro}% de los ingresos</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <SaldoCard label="Ingresos" monto={totalIngresos} cantidad={movimientos.filter(m => m.tipo === 'ingreso').length} color="text-emerald-400" emoji="📈" />
              <SaldoCard label="Gastos"   monto={totalGastos}   cantidad={movimientos.filter(m => m.tipo === 'gasto').length}   color="text-rose-400"    emoji="📉" />
              <SaldoCard label="Ahorro"   monto={totalAhorro}   cantidad={movimientos.filter(m => m.tipo === 'ahorro').length}  color="text-violet-400"  emoji="🏦" />
            </div>
          </div>

          {/* Insights del mes */}
          {insights.length > 0 && (() => {
            const urgentes = insights.filter(i => i.tipo === 'alerta' || i.tipo === 'warning')
            const resto    = insights.filter(i => i.tipo !== 'alerta' && i.tipo !== 'warning')
            return (
              <div className="space-y-2">
                {/* Alertas urgentes — siempre visibles */}
                {urgentes.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs leading-relaxed
                    ${ins.tipo === 'alerta'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                    <span className="text-base flex-shrink-0">{ins.emoji}</span>
                    <p>{ins.mensaje}</p>
                  </div>
                ))}

                {/* Resto — colapsable */}
                {resto.length > 0 && (
                  <div>
                    <button
                      onClick={() => setInsightsAbiertos(v => !v)}
                      className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-1"
                    >
                      <span>💡</span>
                      <span className="font-medium">Insights del mes</span>
                      <span className="text-xs bg-zinc-800 text-zinc-500 rounded-full px-2 py-0.5">{resto.length}</span>
                      <span className={`text-zinc-600 transition-transform duration-200 ${insightsAbiertos ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {insightsAbiertos && (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 mt-2" style={{ scrollbarWidth: 'none' }}>
                        {resto.map((ins, i) => (
                          <InsightCard key={i} insight={ins} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Top gastos + Movimientos — lado a lado en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topGastos.length > 0 && (
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-zinc-300">Top gastos del mes</h2>
                {topGastos.map((g, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-300 min-w-0 truncate">{g.emoji} {g.nombre}</span>
                      <span className="font-semibold text-rose-400 flex-shrink-0">{formatCompact(g.total)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((g.total / maxGasto) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-zinc-300">Últimos movimientos</h2>
                <button onClick={() => navigate('/movimientos')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Ver todos →
                </button>
              </div>
              {ultimos.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-zinc-500 text-sm">Sin movimientos este mes</p>
                  <p className="text-zinc-600 text-xs mt-1">Registrá uno desde la pestaña Registrar</p>
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
                      <span className={`text-sm font-semibold flex-shrink-0 ${
                        m.tipo === 'ingreso' ? 'text-emerald-400'
                        : m.tipo === 'ahorro' ? 'text-violet-400'
                        : 'text-rose-400'
                      }`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{formatCompact(m.monto)}
                      </span>
                      <button
                        onClick={() => eliminar(m.id)}
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
            {(() => {
              const dataGastos = Object.values(
                movimientos.filter(m => m.tipo === 'gasto').reduce((acc, m) => {
                  const key = m.categoria_id
                  if (!acc[key]) acc[key] = { name: `${m.categorias?.emoji ?? ''} ${m.categorias?.nombre ?? 'Otros'}`, value: 0 }
                  acc[key].value += m.monto
                  return acc
                }, {})
              ).sort((a, b) => b.value - a.value)

              return dataGastos.length === 0 ? (
                <div className="card flex items-center justify-center py-10 text-center">
                  <div><p className="text-2xl mb-2">🥧</p><p className="text-zinc-500 text-sm">Sin gastos este mes</p></div>
                </div>
              ) : (
                <div className="card">
                  <h2 className="text-sm font-semibold text-zinc-300 mb-4">Gastos por categoría</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={dataGastos} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                           paddingAngle={3} dataKey="value">
                        {dataGastos.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                      </Pie>
                      <Tooltip content={<TooltipARS />} />
                      <Legend iconType="circle" iconSize={8}
                              formatter={v => <span className="text-xs text-zinc-400">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}

            {/* Barras: últimos 6 meses */}
            <div className="card">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Últimos 6 meses</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataMeses} barCategoryGap="30%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<TooltipBarras />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="Gastos"   fill="#f43f5e" radius={[4,4,0,0]} />
                  <Bar dataKey="Ahorro"   fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
