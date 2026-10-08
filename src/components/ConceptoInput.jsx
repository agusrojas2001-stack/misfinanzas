import { useState } from 'react'
import { useConceptos, normalizar } from '../hooks/useConceptos'

const MIN_LETRAS = 2
const MAX_SUGERENCIAS = 5

// Input de descripción con sugerencias tipo buscador: a partir de 2 letras
// muestra descripciones que ya usaste para ese tipo de movimiento.
export default function ConceptoInput({ value, onChange, tipo, categorias = [], onSeleccionar, placeholder, className = 'input-dark' }) {
  const conceptos = useConceptos()
  const [abierto, setAbierto] = useState(false)

  const query = normalizar(value)
  const sugerencias = query.length < MIN_LETRAS ? [] : conceptos
    .filter(c => c.tipo === tipo)
    .filter(c => normalizar(c.texto) !== query)
    .map(c => {
      const n = normalizar(c.texto)
      const pos = n.startsWith(query) ? 0 : n.split(/\s+/).some(p => p.startsWith(query)) ? 1 : n.includes(query) ? 2 : -1
      return { ...c, pos }
    })
    .filter(c => c.pos >= 0)
    .sort((a, b) => a.pos - b.pos || b.usos - a.usos)
    .slice(0, MAX_SUGERENCIAS)

  function elegir(s) {
    onChange(s.texto)
    onSeleccionar?.(s)
    setAbierto(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        autoComplete="off"
        className={className}
      />
      {abierto && sugerencias.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg overflow-hidden">
          {sugerencias.map(s => {
            const cat = categorias.find(c => c.id === s.categoria_id)
            return (
              <button
                key={s.texto}
                type="button"
                // mousedown en vez de click: se dispara antes del blur del input
                onMouseDown={e => { e.preventDefault(); elegir(s) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-zinc-700/60 active:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0"
              >
                <span className="text-zinc-500 text-sm">🔍</span>
                <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">{s.texto}</span>
                {cat && <span className="text-xs text-zinc-500 flex-shrink-0">{cat.emoji} {cat.nombre}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
