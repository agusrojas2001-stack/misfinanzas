import { useState } from 'react'
import Header from '../components/Layout/Header'
import Modal from '../components/Modal'
import { useRecordatorios } from '../hooks/useRecordatorios'
import { useCategorias } from '../hooks/useCategorias'
import { calcularProximoAviso } from '../lib/evaluarReglas'

const EMOJIS_RAPIDOS = ['🔔', '💸', '🏠', '🚗', '💊', '📱', '🛒', '💡', '🎓', '💳', '🍕', '✈️', '🎬', '🐾', '💰']

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function labelFrecuencia(rec) {
  if (!rec) return ''
  switch (rec.frecuencia) {
    case 'unico':   return rec.fecha_unica ? `El ${formatFecha(rec.fecha_unica)}` : 'Único'
    case 'semanal': return rec.dia != null ? `Todos los ${DIAS_SEMANA[rec.dia]}` : 'Semanal'
    case 'mensual': return rec.dia != null ? `Día ${rec.dia} de cada mes` : 'Mensual'
    case 'anual':   return rec.dia != null && rec.mes != null
      ? `${rec.dia} de ${MESES_NOMBRES[(rec.mes - 1)]} de cada año`
      : 'Anual'
    default: return rec.frecuencia
  }
}

function formatFecha(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatProximoAviso(isoStr) {
  if (!isoStr) return null
  const d = new Date(isoStr)
  const ahora = new Date()
  const diff = Math.round((d - ahora) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return 'Pendiente'
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff < 7)  return `En ${diff} días`
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const FORM_INICIAL = {
  nombre: '',
  emoji: '🔔',
  monto_estimado: '',
  categoria_sugerida_id: '',
  frecuencia: 'mensual',
  dia: '',
  mes: '',
  fecha_unica: '',
  hora: '09:00',
  dias_anticipacion: 0,
}

export default function RecordatoriosPage() {
  const { recordatorios, loading, crear, actualizar, eliminar } = useRecordatorios()
  const { categorias } = useCategorias()

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null) // recordatorio en edición o null para crear
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const categoriasGasto = categorias.filter(c => c.tipo === 'gasto' && c.activa)

  function abrirCrear() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setError('')
    setModalOpen(true)
  }

  function abrirEditar(rec) {
    setEditando(rec)
    setForm({
      nombre: rec.nombre || '',
      emoji: rec.emoji || '🔔',
      monto_estimado: rec.monto_estimado != null ? String(rec.monto_estimado) : '',
      categoria_sugerida_id: rec.categoria_sugerida_id || '',
      frecuencia: rec.frecuencia || 'mensual',
      dia: rec.dia != null ? String(rec.dia) : '',
      mes: rec.mes != null ? String(rec.mes) : '',
      fecha_unica: rec.fecha_unica || '',
      hora: rec.hora ? rec.hora.slice(0, 5) : '09:00',
      dias_anticipacion: rec.dias_anticipacion ?? 0,
    })
    setError('')
    setModalOpen(true)
  }

  function cerrar() {
    setModalOpen(false)
    setEditando(null)
    setError('')
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setGuardando(true)
    setError('')

    const datos = {
      nombre: form.nombre.trim(),
      emoji: form.emoji.trim() || '🔔',
      monto_estimado: form.monto_estimado !== '' ? Number(form.monto_estimado) : null,
      categoria_sugerida_id: form.categoria_sugerida_id || null,
      frecuencia: form.frecuencia,
      dia: form.dia !== '' ? Number(form.dia) : null,
      mes: form.mes !== '' ? Number(form.mes) : null,
      fecha_unica: form.fecha_unica || null,
      hora: form.hora || '09:00',
      dias_anticipacion: Number(form.dias_anticipacion) || 0,
    }

    // Calcular próximo aviso
    datos.proximo_aviso = calcularProximoAviso(datos)

    let result
    if (editando) {
      result = await actualizar(editando.id, datos)
    } else {
      result = await crear(datos)
    }

    setGuardando(false)
    if (result.error) { setError(result.error); return }
    cerrar()
  }

  async function handleToggleActivo(rec) {
    await actualizar(rec.id, { activo: !rec.activo })
  }

  async function handleEliminar(rec) {
    if (!confirm(`¿Eliminar "${rec.nombre}"?`)) return
    await eliminar(rec.id)
  }

  function setF(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  const activos   = recordatorios.filter(r => r.activo)
  const pausados  = recordatorios.filter(r => !r.activo)

  return (
    <div className="page-enter px-4 pt-2 pb-2 space-y-4">
      <Header title="Recordatorios 🔔" subtitle="Avisá sobre pagos y gastos recurrentes" />

      {/* Botón nuevo */}
      <button
        onClick={abrirCrear}
        className="btn-primary w-full"
      >
        + Nuevo recordatorio
      </button>

      {loading ? (
        <div className="text-center py-10 text-zinc-500 text-sm">Cargando...</div>
      ) : recordatorios.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <span className="text-4xl">🔕</span>
          <p className="text-zinc-500 text-sm">No tenés recordatorios todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activos.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-wide font-medium px-1">Activos</p>
              {activos.map(rec => (
                <RecCard
                  key={rec.id}
                  rec={rec}
                  onEdit={() => abrirEditar(rec)}
                  onToggle={() => handleToggleActivo(rec)}
                  onDelete={() => handleEliminar(rec)}
                />
              ))}
            </section>
          )}

          {pausados.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-wide font-medium px-1">Pausados</p>
              {pausados.map(rec => (
                <RecCard
                  key={rec.id}
                  rec={rec}
                  onEdit={() => abrirEditar(rec)}
                  onToggle={() => handleToggleActivo(rec)}
                  onDelete={() => handleEliminar(rec)}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <Modal
          titulo={editando ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          onClose={cerrar}
          actions={
            <div className="space-y-2">
              {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="btn-primary w-full disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear recordatorio'}
              </button>
              <button onClick={cerrar} className="btn-secondary w-full">Cancelar</button>
            </div>
          }
        >
          <div className="space-y-4">

            {/* Emoji picker */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Emoji</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {EMOJIS_RAPIDOS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setF('emoji', e)}
                    className={`text-xl p-1.5 rounded-lg transition-all
                      ${form.emoji === e
                        ? 'bg-violet-600/30 ring-1 ring-violet-500'
                        : 'hover:bg-zinc-800'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={form.emoji}
                onChange={e => setF('emoji', e.target.value)}
                maxLength={2}
                placeholder="o escribí un emoji..."
                className="input-dark mt-2 text-sm"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setF('nombre', e.target.value)}
                placeholder="Ej: Alquiler, Netflix, Gym..."
                className="input-dark mt-1"
              />
            </div>

            {/* Monto estimado */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Monto estimado (opcional)</label>
              <input
                type="number"
                value={form.monto_estimado}
                onChange={e => setF('monto_estimado', e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="input-dark mt-1"
              />
            </div>

            {/* Categoría sugerida */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Categoría sugerida (opcional)</label>
              <select
                value={form.categoria_sugerida_id}
                onChange={e => setF('categoria_sugerida_id', e.target.value)}
                className="input-dark mt-1"
              >
                <option value="">— Sin categoría —</option>
                {categoriasGasto.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Frecuencia */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Frecuencia</label>
              <div className="grid grid-cols-4 gap-1 mt-1.5">
                {[
                  { val: 'unico',   label: 'Único' },
                  { val: 'semanal', label: 'Semanal' },
                  { val: 'mensual', label: 'Mensual' },
                  { val: 'anual',   label: 'Anual' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setF('frecuencia', val)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all
                      ${form.frecuencia === val
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos condicionales */}
            {form.frecuencia === 'unico' && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Fecha</label>
                <input
                  type="date"
                  value={form.fecha_unica}
                  onChange={e => setF('fecha_unica', e.target.value)}
                  className="input-dark mt-1"
                />
              </div>
            )}

            {form.frecuencia === 'semanal' && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Día de la semana</label>
                <select
                  value={form.dia}
                  onChange={e => setF('dia', e.target.value)}
                  className="input-dark mt-1"
                >
                  <option value="">Seleccionar día</option>
                  {DIAS_SEMANA.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {form.frecuencia === 'mensual' && (
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Día del mes (1-31)</label>
                <input
                  type="number"
                  value={form.dia}
                  onChange={e => setF('dia', e.target.value)}
                  min="1"
                  max="31"
                  placeholder="15"
                  className="input-dark mt-1"
                />
              </div>
            )}

            {form.frecuencia === 'anual' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">Día</label>
                  <input
                    type="number"
                    value={form.dia}
                    onChange={e => setF('dia', e.target.value)}
                    min="1"
                    max="31"
                    placeholder="1"
                    className="input-dark mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">Mes</label>
                  <select
                    value={form.mes}
                    onChange={e => setF('mes', e.target.value)}
                    className="input-dark mt-1"
                  >
                    <option value="">Mes</option>
                    {MESES_NOMBRES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Hora */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Hora del aviso</label>
              <input
                type="time"
                value={form.hora}
                onChange={e => setF('hora', e.target.value)}
                className="input-dark mt-1"
              />
            </div>

            {/* Días de anticipación */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">
                Anticipación: {form.dias_anticipacion} día{form.dias_anticipacion !== 1 ? 's' : ''} antes
              </label>
              <input
                type="range"
                value={form.dias_anticipacion}
                onChange={e => setF('dias_anticipacion', Number(e.target.value))}
                min="0"
                max="7"
                step="1"
                className="w-full mt-1 accent-violet-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                <span>0 (mismo día)</span>
                <span>7 días antes</span>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Subcomponente: tarjeta de recordatorio
// ────────────────────────────────────────────────────────────
function RecCard({ rec, onEdit, onToggle, onDelete }) {
  const proximo = formatProximoAviso(rec.proximo_aviso)

  return (
    <div
      className={`card flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all
                  ${!rec.activo ? 'opacity-50' : ''}`}
      onClick={onEdit}
    >
      <span className="text-2xl shrink-0">{rec.emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-100 text-sm truncate">{rec.nombre}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{labelFrecuencia(rec)}</p>
        {proximo && (
          <p className={`text-[11px] mt-0.5 font-medium
                         ${proximo === 'Hoy' || proximo === 'Mañana' || proximo === 'Pendiente'
                           ? 'text-amber-400'
                           : 'text-zinc-600'}`}>
            {proximo === 'Pendiente' ? '⏰ Pendiente' : `Próximo: ${proximo}`}
          </p>
        )}
        {rec.monto_estimado != null && (
          <p className="text-[11px] text-zinc-600">~${Number(rec.monto_estimado).toLocaleString('es-AR')}</p>
        )}
      </div>

      {/* Toggle activo */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        title={rec.activo ? 'Pausar' : 'Activar'}
        className={`relative w-10 h-5 rounded-full shrink-0 transition-all
                    ${rec.activo ? 'bg-violet-600' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all
                      ${rec.activo ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>

      {/* Eliminar */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600
                   hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs shrink-0"
        title="Eliminar"
      >
        ✕
      </button>
    </div>
  )
}
