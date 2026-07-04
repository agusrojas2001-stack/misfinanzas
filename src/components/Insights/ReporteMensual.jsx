import { Sparkles } from 'lucide-react'

function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-zinc-100 font-bold">{part}</strong>
      : part
  )
}

function extractIntro(contenido) {
  const lines = contenido.split('\n')
  const intro = []
  const rest = []
  let inIntro = false
  let introComplete = false

  for (const line of lines) {
    if (introComplete) {
      rest.push(line)
    } else if (line.startsWith('## ') && !inIntro) {
      inIntro = true
    } else if (line.startsWith('## ') && inIntro) {
      introComplete = true
      rest.push(line)
    } else if (inIntro) {
      intro.push(line)
    } else {
      rest.push(line)
    }
  }

  return {
    introText: intro.filter(l => l.trim()).join(' '),
    restContent: rest.join('\n'),
  }
}

function renderLinea(line, i) {
  if (line.startsWith('## ')) {
    return (
      <h2 key={i} className="text-base font-black text-zinc-100 mt-6 mb-2 first:mt-0">
        {line.slice(3)}
      </h2>
    )
  }
  if (line.startsWith('### ')) {
    return (
      <h3 key={i} className="text-sm font-bold text-zinc-200 mt-4 mb-1">
        {line.slice(4)}
      </h3>
    )
  }
  if (line.match(/^[-•]\s/)) {
    return (
      <div key={i} className="py-3 border-b" style={{ borderColor: 'rgba(139,92,246,.15)' }}>
        <p className="text-base font-semibold text-zinc-100 leading-snug">
          {parseBold(line.replace(/^[-•]\s/, ''))}
        </p>
      </div>
    )
  }
  if (line.trim() === '') {
    return <div key={i} className="h-2" />
  }
  return (
    <p key={i} className="text-base font-semibold text-zinc-200 leading-relaxed">
      {parseBold(line)}
    </p>
  )
}

export default function ReporteMensual({ contenido, generadoAt, expression = 'contenta' }) {
  const fecha = generadoAt
    ? new Date(generadoAt).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const { introText, restContent } = extractIntro(contenido)

  return (
    <div
      className="rounded-[20px] p-5 space-y-4"
      style={{ background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.30)' }}
    >

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <p className="text-xs font-black uppercase tracking-widest text-violet-400">
            Análisis con IA
          </p>
        </div>
        {fecha && <p className="text-xs text-zinc-600">{fecha}</p>}
      </div>

      {/* Divisor */}
      <div className="h-px" style={{ background: 'rgba(139,92,246,.20)' }} />

      {/* Card intro con Monedita */}
      {introText && (
        <div
          className="flex items-start gap-4 p-4 rounded-[14px]"
          style={{ background: 'rgba(139,92,246,.10)', border: '1px solid rgba(139,92,246,.22)' }}
        >
          <img
            src={`/monedita/monedita-${expression}.svg`}
            alt="Monedita"
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <p className="text-base font-semibold text-zinc-100 leading-relaxed">{introText}</p>
        </div>
      )}

      {/* Cuerpo del reporte */}
      <div className="space-y-0.5">
        {restContent.split('\n').map((line, i) => renderLinea(line, i))}
      </div>

    </div>
  )
}
