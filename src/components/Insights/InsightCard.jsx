const ESTILOS = {
  alerta:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-200'    },
  warning:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-200'   },
  positivo: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-200' },
  info:     { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-200'    },
}

export default function InsightCard({ insight }) {
  const s = ESTILOS[insight.tipo] ?? ESTILOS.info
  return (
    <div className={`flex-shrink-0 w-60 rounded-2xl border p-4 space-y-2 ${s.bg} ${s.border}`}>
      <span className="text-xl">{insight.emoji}</span>
      <p className={`text-xs leading-relaxed ${s.text}`}>{insight.mensaje}</p>
    </div>
  )
}
