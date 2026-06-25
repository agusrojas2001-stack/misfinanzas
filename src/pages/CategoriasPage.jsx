import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCategorias } from '../hooks/useCategorias'
import Modal from '../components/Modal'

const TIPOS = [
  { id: 'gasto',   label: 'Gastos',   emoji: '📉' },
  { id: 'ingreso', label: 'Ingresos', emoji: '📈' },
  { id: 'ahorro',  label: 'Ahorro',   emoji: '🏦' },
]

const EMOJIS_SUGERIDOS = [
  '🍔','🏠','💡','🚗','🎬','💊','💳','📦','💰','💻',
  '✈️','👗','📚','🎮','🐾','🏋️','☕','🛒','🎁','🏥',
  '🌐','📱','🎵','🍷','💼','🏦','🎯','🌟','🔧','🚿',
]


function FormCategoria({ inicial, onGuardar, loading }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [emoji, setEmoji] = useState(inicial?.emoji ?? '📦')
  const [tipo, setTipo] = useState(inicial?.tipo ?? 'gasto')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    await onGuardar({ nombre, emoji, tipo })
  }

  return (
    <form id="form-categoria" onSubmit={handleSubmit} className="space-y-4">
      {/* Emoji picker */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Emoji</label>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
            {emoji}
          </div>
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="Pegá un emoji"
            className="input-dark flex-1"
            maxLength={4}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {EMOJIS_SUGERIDOS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl text-xl transition-all hover:scale-110 active:scale-95 ${
                emoji === e ? 'bg-violet-600/40 ring-2 ring-violet-500' : 'bg-zinc-800'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Nombre</label>
        <input
          type="text"
          placeholder="Ej: Mascota"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="input-dark"
          required
          autoFocus
        />
      </div>

      {/* Tipo (solo al crear) */}
      {!inicial && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                  tipo === t.id
                    ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

    </form>
  )
}

function CategoriaRow({ cat, onEditar }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
        {cat.emoji}
      </div>
      <span className="flex-1 font-extrabold text-zinc-100">{cat.nombre}</span>
      <button
        onClick={() => onEditar(cat)}
        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                   text-zinc-400 transition-all active:scale-95"
        title="Editar"
      >
        ✏️
      </button>
    </div>
  )
}

export default function CategoriasPage() {
  const navigate = useNavigate()
  const { categorias, loading, crearCategoria, editarCategoria } = useCategorias()
  const [tabActiva, setTabActiva] = useState('gasto')
  const [modal, setModal] = useState(null) // null | 'nueva' | { ...cat }
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const filtradas = categorias.filter(c => c.tipo === tabActiva && c.activa)

  async function handleGuardar(datos) {
    setGuardando(true)
    setError('')
    let result
    if (modal === 'nueva') {
      result = await crearCategoria(datos)
    } else {
      result = await editarCategoria(modal.id, datos)
    }
    setGuardando(false)
    if (result.error) { setError(result.error); return }
    setModal(null)
  }

  return (
    <div className="page-enter px-4 pt-4 pb-2 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/menu')}
          className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                     text-zinc-400 transition-all active:scale-95"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-zinc-100">Categorías</h1>
          <p className="text-sm font-normal text-zinc-400">{categorias.filter(c => c.activa).length} activas</p>
        </div>
        <button
          onClick={() => { setModal('nueva'); setError('') }}
          className="bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold
                     rounded-xl px-4 py-2 transition-all"
        >
          + Nueva
        </button>
      </div>

      {/* Tabs de tipo */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        {TIPOS.map(t => (
          <button
            key={t.id}
            onClick={() => setTabActiva(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tabActiva === t.id
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="card">
        {loading ? (
          <div className="py-8 text-center text-zinc-500 text-sm">Cargando...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">✨</p>
            <p className="text-zinc-500 text-sm">Sin categorías en este tipo</p>
            <button
              onClick={() => { setModal('nueva'); setError('') }}
              className="text-violet-400 text-sm mt-2 hover:text-violet-300"
            >
              Crear una
            </button>
          </div>
        ) : (
          filtradas.map(cat => (
            <CategoriaRow
              key={cat.id}
              cat={cat}
              onEditar={cat => { setModal(cat); setError('') }}
            />
          ))
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <Modal
          titulo={modal === 'nueva' ? 'Nueva categoría' : `Editar "${modal.nombre}"`}
          onClose={() => setModal(null)}
          actions={
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" form="form-categoria" disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          }
        >
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}
          <FormCategoria
            inicial={modal === 'nueva' ? null : modal}
            onGuardar={handleGuardar}
            loading={guardando}
          />
        </Modal>
      )}
    </div>
  )
}
