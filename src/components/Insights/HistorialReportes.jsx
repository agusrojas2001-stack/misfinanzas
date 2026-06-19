import { useState } from 'react'
import ReporteMensual from './ReporteMensual'

function mesLabel(mes) {
  if (!mes) return ''
  const raw = mes.replace(/-01$/, '')
  const [a, m] = raw.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HistorialReportes({ reportes, mesActivo }) {
  const [abierto, setAbierto] = useState(null)

  const anteriores = reportes.filter(r => !r.mes?.startsWith(mesActivo))
  if (anteriores.length === 0) return null

  const grupos = anteriores.reduce((acc, r) => {
    const clave = r.mes?.slice(0, 7) ?? 'sin-mes'
    if (!acc[clave]) acc[clave] = []
    acc[clave].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-400">Historial de análisis</h2>
      {Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0])).map(([mes, lista]) => (
        <div key={mes} className="space-y-2">
          <p className="text-xs text-zinc-600 font-medium uppercase tracking-wide">{mesLabel(mes + '-01')}</p>
          {lista.map((r) => {
            const isOpen = abierto === r.id
            const fecha = new Date(r.generado_at).toLocaleDateString('es-AR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })
            return (
              <div key={r.id}>
                <button
                  onClick={() => setAbierto(isOpen ? null : r.id)}
                  className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-4 py-3 transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✨</span>
                    <div className="text-left">
                      <p className="text-xs font-medium text-zinc-300">Análisis con IA</p>
                      <p className="text-[10px] text-zinc-600">{fecha}</p>
                    </div>
                  </div>
                  <span className="text-zinc-600 text-xs">{isOpen ? '▲' : '▾'}</span>
                </button>
                {isOpen && (
                  <div className="mt-2">
                    <ReporteMensual
                      contenido={r.contenido}
                      generadoAt={r.generado_at}
                      onCerrar={() => setAbierto(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
