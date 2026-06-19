function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-zinc-100 font-semibold">{part}</strong>
      : part
  )
}

function renderLinea(line, i) {
  if (line.startsWith('## ')) {
    return <h2 key={i} className="text-base font-bold text-zinc-100 mt-5 mb-2 first:mt-0">{line.slice(3)}</h2>
  }
  if (line.startsWith('### ')) {
    return <h3 key={i} className="text-sm font-bold text-zinc-200 mt-3 mb-1">{line.slice(4)}</h3>
  }
  if (line.match(/^[-•]\s/)) {
    return (
      <li key={i} className="text-sm text-zinc-300 leading-relaxed ml-4 list-disc">
        {parseBold(line.replace(/^[-•]\s/, ''))}
      </li>
    )
  }
  if (line.trim() === '') {
    return <div key={i} className="h-1.5" />
  }
  return (
    <p key={i} className="text-sm text-zinc-300 leading-relaxed">
      {parseBold(line)}
    </p>
  )
}

export default function ReporteMensual({ contenido, generadoAt, onCerrar }) {
  const fecha = generadoAt
    ? new Date(generadoAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="card space-y-1 border-violet-800/30 bg-gradient-to-b from-violet-900/10 to-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-violet-300">✨ Análisis con IA</p>
          {fecha && <p className="text-xs text-zinc-600 mt-0.5">{fecha}</p>}
        </div>
        {onCerrar && (
          <button onClick={onCerrar}
            className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 text-xs transition-all">
            ✕
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {contenido.split('\n').map((line, i) => renderLinea(line, i))}
      </div>
    </div>
  )
}
