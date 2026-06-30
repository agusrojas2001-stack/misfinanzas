import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCategorias } from '../hooks/useCategorias'
import { parsearMensaje, formatARS } from '../lib/parser'
import { useKeyboard } from '../contexts/KeyboardContext'

const EMOJIS_RAPIDOS = ['🛒','🍔','🚗','🏠','💊','📱','🎮','👕','✈️','🐾','📚','🎵','💇','🏋️','🎁']

function hoy() {
  return new Date().toISOString().split('T')[0]
}

function mesActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
  text: 'Hola, soy Monedita. Decime qué gastaste y lo anoto por vos. Ej: "2000 de café" o "cobré 500000 de trabajo". También podés preguntarme "¿cómo voy este mes?" 📊',
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const { categorias, crearCategoria } = useCategorias()
  const keyboardOpen = useKeyboard()
  const [mensajes, setMensajes] = useState([MSG_BIENVENIDA])
  const [input, setInput]       = useState('')
  const [guardando, setGuardando] = useState(false)
  const [dicPersonal, setDicPersonal] = useState({})
  const messagesRef = useRef(null)

  // Scroll al último mensaje cada vez que llega uno nuevo
  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [mensajes])

  // Diccionario personal del usuario
  useEffect(() => {
    if (categorias.length === 0) return
    async function fetchDic() {
      const { data } = await supabase
        .from('diccionario_personal')
        .select('palabra_clave, categoria_id')
      if (!data) return
      const map = {}
      data.forEach(({ palabra_clave, categoria_id }) => {
        const cat = categorias.find(c => c.id === categoria_id)
        if (cat) map[palabra_clave] = cat.nombre
      })
      setDicPersonal(map)
    }
    fetchDic()
  }, [categorias])

  function addMsg(msg) {
    setMensajes(prev => [...prev, { id: Date.now() + Math.random(), ...msg }])
  }

  function handleSend(e) {
    e.preventDefault()
    const texto = input.trim()
    if (!texto) return
    setInput('')
    addMsg({ from: 'user', tipo: 'texto', text: texto })
    setTimeout(() => procesarTexto(texto), 350)
  }

  async function procesarTexto(texto) {
    const resultado = parsearMensaje(texto, dicPersonal)
    const { tipo, monto, categoria: catNombre, esConsulta } = resultado

    if (esConsulta) { await responderConsulta(); return }

    if (!tipo && !monto) {
      addMsg({ from: 'bot', tipo: 'texto',
        text: 'No entendí bien 😅\n\nProbá con algo como:\n• "gasté 5000 en comida"\n• "cobré 200 mil de sueldo"\n• "ahorré 50 mil"\n\nO preguntame "¿cómo voy este mes?" 📊' })
      return
    }
    if (!tipo) {
      addMsg({ from: 'bot', tipo: 'texto',
        text: '¿Es un gasto, plata que cobré o un ahorro? Empezá con "gasté", "cobré" o "ahorré".' })
      return
    }
    if (!monto) {
      addMsg({ from: 'bot', tipo: 'texto',
        text: `Entiendo que es un ${TIPOS_LABEL[tipo].toLowerCase()}, pero no vi cuánto 🤔\nEjemplos: "gasté 3500", "gasté 3k", "gasté 50 mil"` })
      return
    }

    const catsDelTipo = categorias.filter(c => c.tipo === tipo && c.activa)
    const catEncontrada = matchCategoria(catNombre, catsDelTipo)
    addMsg({
      from: 'bot',
      tipo: 'confirmacion',
      datos: { tipo, monto, categoria: catEncontrada, catsDelTipo, fecha: hoy() },
    })
  }

  async function responderConsulta() {
    const mes = mesActual()
    const [a, m] = mes.split('-').map(Number)
    const inicio = `${mes}-01`
    const fin = new Date(a, m, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('movimientos')
      .select('tipo, monto, categorias(nombre, emoji)')
      .gte('fecha', inicio).lte('fecha', fin)

    if (!data || data.length === 0) {
      addMsg({ from: 'bot', tipo: 'texto', text: 'Todavía no cargaste nada este mes 📋' })
      return
    }

    const ingresos = data.filter(mv => mv.tipo === 'ingreso').reduce((s, mv) => s + mv.monto, 0)
    const gastos   = data.filter(mv => mv.tipo === 'gasto').reduce((s, mv) => s + mv.monto, 0)
    const ahorro   = data.filter(mv => mv.tipo === 'ahorro').reduce((s, mv) => s + mv.monto, 0)
    const balance  = ingresos - gastos - ahorro

    const porCat = data.filter(mv => mv.tipo === 'gasto').reduce((acc, mv) => {
      const key = mv.categorias?.nombre ?? 'Otros'
      const emoji = mv.categorias?.emoji ?? '📦'
      if (!acc[key]) acc[key] = { emoji, total: 0 }
      acc[key].total += mv.monto
      return acc
    }, {})
    const topCats = Object.entries(porCat)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .map(([nombre, { emoji, total }]) => `  ${emoji} ${nombre}: ${formatARS(total)}`)
      .join('\n')

    addMsg({
      from: 'bot', tipo: 'texto',
      text: `📊 *Resumen del mes*\n\n💚 Ingresos: ${formatARS(ingresos)}\n🔴 Gastos: ${formatARS(gastos)}\n💜 Ahorro: ${formatARS(ahorro)}\n${balance >= 0 ? '✅' : '⚠️'} Balance: ${formatARS(balance)}${topCats ? `\n\n🔝 Top gastos:\n${topCats}` : ''}`,
    })
  }

  async function handleConfirmar(datos) {
    if (!datos.categoria) {
      addMsg({ from: 'bot', tipo: 'texto', text: 'Elegí una categoría primero 👆' })
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
      addMsg({ from: 'bot', tipo: 'texto', text: 'Uh, no se pudo guardar. Intentá de nuevo.' })
      return
    }
    addMsg({
      from: 'bot', tipo: 'texto',
      text: `✅ Anotado. ${TIPOS_LABEL[datos.tipo]} de ${formatARS(datos.monto)} en ${datos.categoria.emoji} ${datos.categoria.nombre}.\n\n¿Anotamos algo más?`,
    })
  }

  function handleCancelar() {
    addMsg({ from: 'bot', tipo: 'texto', text: 'Cancelado. ¿Anotamos otro?' })
  }

  return (
    <div
      className="fixed left-0 right-0 z-10 bg-zinc-950 overflow-hidden"
      style={{
        top:    'calc(44px + env(safe-area-inset-top, 0px))',
        bottom: keyboardOpen ? '0' : 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col h-full">

        <div
          className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3"
          style={{ borderBottom: '1px solid #1f1f23' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.25)' }}
            >
              <img src="/monedita/monedita-contenta.svg" alt="Monedita" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-zinc-100 leading-tight">Monedita</h1>
              <p className="text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--mn-income)' }} />
                <span style={{ color: 'var(--mn-income)' }}>en línea</span>
              </p>
            </div>
          </div>
        </div>

        <div
          ref={messagesRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4 space-y-4"
        >
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.from === 'bot' && (
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-auto"
                  style={{ background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)' }}
                >
                  <img src="/monedita/monedita-contenta.svg" alt="Monedita" className="w-full h-full object-contain" />
                </div>
              )}
              {m.tipo === 'texto' && (
                <div
                  className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line
                    ${m.from === 'user' ? 'text-white' : 'text-zinc-200'}`}
                  style={m.from === 'user'
                    ? { background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', borderRadius: '18px 18px 4px 18px' }
                    : { background: '#1c1c20', border: '1px solid #27272a', borderRadius: '18px 18px 18px 4px' }
                  }
                >
                  {m.text}
                </div>
              )}
              {m.tipo === 'confirmacion' && (
                <ConfirmacionCard
                  datos={m.datos}
                  onConfirmar={handleConfirmar}
                  onCancelar={handleCancelar}
                  guardando={guardando}
                  crearCategoria={crearCategoria}
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="flex-shrink-0 px-4 pt-2 pb-3 bg-zinc-950"
          style={{ borderTop: '1px solid #1f1f23' }}
        >
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="gasté 3500 en uber..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 text-zinc-100 placeholder-zinc-500 outline-none text-sm"
              style={{
                background: '#161619',
                border: '1px solid #27272a',
                borderRadius: '24px',
                padding: '10px 16px',
              }}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || guardando}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                         transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
            >
              <span className="text-white text-sm">➤</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

function ConfirmacionCard({ datos: datosProp, onConfirmar, onCancelar, guardando, crearCategoria }) {
  const [datos, setDatos] = useState(datosProp)
  const [catsLocales, setCatsLocales] = useState(datosProp.catsDelTipo)
  const [editandoMonto, setEditandoMonto] = useState(false)
  const [montoStr, setMontoStr] = useState(String(datosProp.monto))
  const [confirmado, setConfirmado] = useState(false)

  const [creandoCat, setCreandoCat] = useState(false)
  const [nuevaEmoji, setNuevaEmoji] = useState('📦')
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [guardandoCat, setGuardandoCat] = useState(false)
  const [errorCat, setErrorCat] = useState('')

  function aplicarMonto() {
    const val = parseInt(montoStr.replace(/[.,]/g, ''), 10)
    if (!isNaN(val) && val > 0) setDatos(d => ({ ...d, monto: val }))
    setEditandoMonto(false)
  }

  async function guardar() {
    setConfirmado(true)
    await onConfirmar(datos)
  }

  function cancelar() {
    setConfirmado(true)
    onCancelar()
  }

  async function handleCrearCat() {
    if (!nuevaNombre.trim()) return
    setGuardandoCat(true)
    setErrorCat('')
    const { error } = await crearCategoria({ nombre: nuevaNombre.trim(), emoji: nuevaEmoji, tipo: datos.tipo })
    if (error) {
      setErrorCat('No se pudo crear. Intentá de nuevo.')
      setGuardandoCat(false)
      return
    }
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('nombre', nuevaNombre.trim())
      .eq('tipo', datos.tipo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      setCatsLocales(prev => [...prev, data])
      setDatos(d => ({ ...d, categoria: data }))
    }
    setGuardandoCat(false)
    setCreandoCat(false)
    setNuevaEmoji('📦')
    setNuevaNombre('')
  }

  return (
    <div className="max-w-[85%] bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700">
        <p className="text-xs text-zinc-500 font-medium mb-1">Esto es lo que entendí:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold uppercase tracking-wide ${TIPOS_COLOR[datos.tipo]}`}>
            {TIPOS_LABEL[datos.tipo]}
          </span>
          <span className="text-zinc-600">·</span>
          {editandoMonto ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                value={montoStr}
                onChange={e => setMontoStr(e.target.value)}
                onBlur={aplicarMonto}
                onKeyDown={e => e.key === 'Enter' && aplicarMonto()}
                className="w-28 bg-zinc-900 border border-violet-500 rounded-lg px-2 py-1 text-zinc-100 focus:outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => { setMontoStr(String(datos.monto)); setEditandoMonto(true) }}
              disabled={confirmado}
              className="text-lg font-bold text-zinc-100 hover:text-violet-300 transition-colors disabled:pointer-events-none"
            >
              {formatARS(datos.monto)}
            </button>
          )}
          {!editandoMonto && !confirmado && (
            <span className="text-xs text-zinc-600">✏️ tocá para cambiar</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Selector de categoría */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Categoría</p>
          <div className="flex flex-wrap gap-1.5">
            {catsLocales.map(c => (
              <button key={c.id}
                onClick={() => setDatos(d => ({ ...d, categoria: c }))}
                disabled={confirmado}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                  ${datos.categoria?.id === c.id
                    ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {c.emoji} {c.nombre}
              </button>
            ))}
            {!confirmado && !creandoCat && (
              <button
                onClick={() => setCreandoCat(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border
                           bg-zinc-900 border-zinc-700 text-violet-400 hover:border-violet-500 transition-all">
                ＋
              </button>
            )}
          </div>

          {creandoCat && (
            <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Nueva categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS_RAPIDOS.map(e => (
                  <button key={e} type="button"
                    onClick={() => setNuevaEmoji(e)}
                    className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all
                      ${nuevaEmoji === e ? 'bg-violet-600/40 ring-1 ring-violet-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                    {e}
                  </button>
                ))}
                <input
                  type="text"
                  value={nuevaEmoji}
                  onChange={e => setNuevaEmoji(e.target.value)}
                  maxLength={2}
                  placeholder="🔖"
                  className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-center text-sm
                             text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Nombre de la categoría"
                value={nuevaNombre}
                onChange={e => setNuevaNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrearCat()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100
                           placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              {errorCat && <p className="text-xs text-rose-400">{errorCat}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreandoCat(false); setNuevaNombre(''); setErrorCat('') }}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:border-zinc-600 transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleCrearCat}
                  disabled={!nuevaNombre.trim() || guardandoCat}
                  className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                             text-white text-xs font-semibold transition-all">
                  {guardandoCat ? '...' : 'Crear ✓'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div>
          <p className="text-xs text-zinc-500 mb-1">Descripción (opcional)</p>
          <input
            type="text"
            placeholder="Agregar nota..."
            value={datos.concepto ?? ''}
            onChange={e => setDatos(d => ({ ...d, concepto: e.target.value }))}
            disabled={confirmado}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200
                       placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
        </div>

        {!confirmado && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={cancelar}
              className="flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400
                         hover:border-zinc-600 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={!datos.categoria || guardando}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                         text-white text-sm font-semibold transition-all">
              {guardando ? '...' : 'Guardar ✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
