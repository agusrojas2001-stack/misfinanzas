import { useState } from 'react'
import { Sparkles } from 'lucide-react'
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
    <div className="space-y-4">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
        Historial de análisis
      </p>
      {Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0])).map(([mes, lista]) => (
        <div key={mes} className="space-y-2">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide">
            {mesLabel(mes + '-01')}
          </p>
          {lista.map((r) => {
            const isOpen = abierto === r.id
            const fecha = new Date(r.generado_at).toLocaleDateString('es-AR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })
            return (
              <div key={r.id}>
                <button
                  onClick={() => setAbierto(isOpen ? null : r.id)}
                  className="w-full flex items-center justify-between rounded-[18px] px-4 py-3 transition-all"
                  style={{ background: '#18181b', border: '1px solid #1f1f23' }}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-violet-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-zinc-200">Análisis con IA</p>
                      <p className="text-xs text-zinc-500">{fecha}</p>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xs">{isOpen ? '▲' : '▾'}</span>
                </button>
                {isOpen && (
                  <div className="mt-3">
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
