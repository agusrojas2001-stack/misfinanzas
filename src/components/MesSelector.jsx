import { useRef, useState } from 'react'

function mesLabel(mes) {
  const [a, m] = mes.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mesLabelCorto(mes) {
  const [a, m] = mes.split('-')
  const s = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')
}

function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const UMBRAL_SWIPE = 50

// Barra de mes swipeable: deslizá a la derecha para ir al mes anterior y a la
// izquierda para el siguiente (no deja pasar del mes actual). Los meses
// vecinos se muestran a los costados y también se pueden tocar.
export default function MesSelector({ mes, onChange }) {
  const [dx, setDx]           = useState(0)
  const [animando, setAnimando] = useState(false)
  const inicio = useRef(null)
  const movido = useRef(false)

  const anterior    = sumarMeses(mes, -1)
  const siguiente   = sumarMeses(mes, 1)
  const haySiguiente = siguiente <= mesActual()

  function irA(nuevo) {
    if (nuevo > mesActual()) return
    onChange(nuevo)
  }

  function onPointerDown(e) {
    inicio.current = { x: e.clientX, y: e.clientY }
    movido.current = false
    setAnimando(false)
  }

  function onPointerMove(e) {
    if (!inicio.current) return
    let delta = e.clientX - inicio.current.x
    if (Math.abs(delta) > 5) movido.current = true
    // Resistencia al intentar ir más allá del mes actual
    if (delta < 0 && !haySiguiente) delta = delta / 4
    setDx(delta)
  }

  function onPointerUp() {
    if (!inicio.current) return
    inicio.current = null
    setAnimando(true)
    if (dx > UMBRAL_SWIPE) irA(anterior)
    else if (dx < -UMBRAL_SWIPE && haySiguiente) irA(siguiente)
    setDx(0)
  }

  return (
    <div
      className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl py-2.5 select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      onClickCapture={e => { if (movido.current) { e.stopPropagation(); movido.current = false } }}
    >
      <div
        className="flex items-center justify-between px-4"
        style={{
          transform: `translateX(${dx}px)`,
          transition: animando ? 'transform 200ms ease-out' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() => irA(anterior)}
          className="w-14 text-left text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {mesLabelCorto(anterior)}
        </button>
        <span className="text-sm font-semibold text-zinc-200">{mesLabel(mes)}</span>
        <button
          type="button"
          onClick={() => irA(siguiente)}
          disabled={!haySiguiente}
          className="w-14 text-right text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-colors disabled:invisible"
        >
          {mesLabelCorto(siguiente)}
        </button>
      </div>
    </div>
  )
}
