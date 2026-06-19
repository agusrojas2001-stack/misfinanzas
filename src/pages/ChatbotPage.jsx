import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCategorias } from '../hooks/useCategorias'
import { parsearMensaje, formatARS } from '../lib/parser'

function hoy() {
  return new Date().toISOString().split('T')[0]
}

function normalizar(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchCategoria(nombreDic, categorias) {
  if (!nombreDic) return null
  const norm = normalizar(nombreDic)
  return (
    categorias.find(c => normalizar(c.nombre) === norm) ||
    categorias.find(c => normalizar(c.nombre).includes(norm)) ||
    categorias.find(c => norm.includes(normalizar(c.nombre)))
  ) ?? null
}

const TIPOS_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', ahorro: 'Ahorro' }
const TIPOS_COLOR = {
  gasto:   'text-rose-400',
  ingreso: 'text-emerald-400',
  ahorro:  'text-violet-400',
}

const MSG_BIENVENIDA = {
  id: 0, from: 'bot', tipo: 'texto',
  text: '¡Hola! Soy Monedita 🪙\n\nContame qué movimiento querés registrar:\n• "gasté 3500 en uber"\n• "cobré el sueldo 850000"\n• "ahorré 50000 en el banco"'
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const { categorias } = useCategorias()
  const [mensajes, setMensajes] = useState([MSG_BIENVENIDA])
  const [input, setInput] = useState('')
  const [guardando, setGuardando] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  function addMsg(msg) {
    setMensajes(prev => [...prev, { id: Date.now() + Math.random(), ...msg }])
  }

  function handleSend(e) {
    e.preventDefault()
    const texto = input.trim()
    if (!texto) return
    setInput('')

    addMsg({ from: 'user', tipo: 'texto', text: texto })

    setTimeout(() => procesarTexto(texto), 400)
  }

  function procesarTexto(texto) {
    const resultado = parsearMensaje(texto)
    const { tipo, monto, categoria: catNombre } = resultado

    if (!tipo && !monto) {
      addMsg({ from: 'bot', tipo: 'texto', text: 'No entendí bien 😅 Probá con algo como:\n"gasté 5000 en comida" o "cobré 200000"' })
      return
    }
    if (!tipo) {
      addMsg({ from: 'bot', tipo: 'texto', text: '¿Es un gasto, ingreso o ahorro? No lo detecté. Podés empezar con "gasté", "cobré" o "ahorré".' })
      return
    }
    if (!monto) {
      addMsg({ from: 'bot', tipo: 'texto', text: 'Detecté que es un ' + TIPOS_LABEL[tipo].toLowerCase() + ' pero no vi el monto 🤔 ¿Podés repetirlo con el número?' })
      return
    }

    // Buscar categoría del usuario del tipo correcto
    const catsDelTipo = categorias.filter(c => c.tipo === tipo && c.activa)
    const catEncontrada = matchCategoria(catNombre, catsDelTipo)

    addMsg({
      from: 'bot',
      tipo: 'confirmacion',
      datos: {
        tipo,
        monto,
        categoria: catEncontrada,
        catsDelTipo,
        fecha: hoy(),
      }
    })
  }

  async function handleConfirmar(datos) {
    if (!datos.categoria) {
      addMsg({ from: 'bot', tipo: 'texto', text: 'Seleccioná una categoría antes de guardar 👆' })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('movimientos').insert({
      user_id:      user.id,
      tipo:         datos.tipo,
      categoria_id: datos.categoria.id,
      monto:        datos.monto,
      concepto:     datos.concepto || null,
      fecha:        datos.fecha,
    })
    setGuardando(false)

    if (error) {
      addMsg({ from: 'bot', tipo: 'texto', text: '❌ No se pudo guardar. Intentá de nuevo.' })
      return
    }

    addMsg({
      from: 'bot', tipo: 'texto',
      text: `✅ Guardado: ${TIPOS_LABEL[datos.tipo]} de ${formatARS(datos.monto)} en ${datos.categoria.emoji} ${datos.categoria.nombre}\n\n¿Tenés otro movimiento?`
    })
  }

  function handleCancelar() {
    addMsg({ from: 'bot', tipo: 'texto', text: 'Cancelado. ¿Qué otro movimiento querés registrar?' })
  }

  return (
    <div className="page-enter flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-xl">🪙</div>
          <div>
            <h1 className="font-bold text-zinc-100 leading-tight">Monedita</h1>
            <p className="text-xs text-zinc-500">Tu asistente financiero</p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {mensajes.map(m => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.from === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-auto">
                🪙
              </div>
            )}

            {m.tipo === 'texto' && (
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line
                ${m.from === 'user'
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700'}`}>
                {m.text}
              </div>
            )}

            {m.tipo === 'confirmacion' && (
              <ConfirmacionCard
                datos={m.datos}
                onConfirmar={handleConfirmar}
                onCancelar={handleCancelar}
                guardando={guardando}
              />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-6 py-3 border-t border-zinc-800 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="gasté 3500 en uber..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="input-dark flex-1"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || guardando}
            className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40
                       text-white rounded-xl px-4 transition-all duration-150 flex-shrink-0 text-lg"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}

function ConfirmacionCard({ datos: datosProp, onConfirmar, onCancelar, guardando }) {
  const [datos, setDatos] = useState(datosProp)
  const [confirmado, setConfirmado] = useState(false)

  async function guardar() {
    setConfirmado(true)
    await onConfirmar(datos)
  }

  function cancelar() {
    setConfirmado(true)
    onCancelar()
  }

  return (
    <div className="max-w-[85%] bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700">
        <p className="text-xs text-zinc-500 font-medium mb-1">Esto es lo que detecté:</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold uppercase tracking-wide ${TIPOS_COLOR[datos.tipo]}`}>
            {TIPOS_LABEL[datos.tipo]}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-lg font-bold text-zinc-100">{formatARS(datos.monto)}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Selector de categoría */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Categoría</p>
          {datos.catsDelTipo.length === 0 ? (
            <p className="text-xs text-zinc-600">Sin categorías de {TIPOS_LABEL[datos.tipo].toLowerCase()}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {datos.catsDelTipo.map(c => (
                <button
                  key={c.id}
                  onClick={() => setDatos(d => ({ ...d, categoria: c }))}
                  disabled={confirmado}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                    ${datos.categoria?.id === c.id
                      ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                >
                  {c.emoji} {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Descripción opcional */}
        <div>
          <p className="text-xs text-zinc-500 mb-1">Descripción (opcional)</p>
          <input
            type="text"
            placeholder="Agregar nota..."
            value={datos.concepto ?? ''}
            onChange={e => setDatos(d => ({ ...d, concepto: e.target.value }))}
            disabled={confirmado}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200
                       placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
        </div>

        {/* Botones */}
        {!confirmado && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={cancelar}
              className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400
                         hover:border-zinc-600 text-sm font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={!datos.categoria || guardando}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                         text-white text-sm font-semibold transition-all"
            >
              {guardando ? '...' : 'Guardar ✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
