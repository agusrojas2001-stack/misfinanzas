import { useState } from 'react'
import Modal from '../Modal'
import { fechaHoyLocal } from '../../lib/fecha'

export default function CuotaModal({ cuota, categorias, onSave, onClose }) {
  const editando = !!cuota

  const [descripcion, setDescripcion] = useState(cuota?.descripcion ?? '')
  const [montoCuota, setMontoCuota] = useState(cuota ? String(cuota.monto_cuota) : '')
  const [totalCuotas, setTotalCuotas] = useState(cuota ? String(cuota.total_cuotas) : '')
  const [categoriaId, setCategoriaId] = useState(cuota?.categoria_id ?? '')
  const [fechaPrimera, setFechaPrimera] = useState(cuota?.fecha_primera_cuota ?? fechaHoyLocal())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const categoriasGasto = categorias.filter(c => c.tipo === 'gasto' && c.activa)

  const puedeGuardar = editando
    ? montoCuota && totalCuotas
    : descripcion.trim() && montoCuota && totalCuotas && categoriaId

  async function handleGuardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError('')

    const datos = editando
      ? { monto_cuota: Number(montoCuota), total_cuotas: Number(totalCuotas) }
      : {
          descripcion: descripcion.trim(),
          monto_cuota: Number(montoCuota),
          total_cuotas: Number(totalCuotas),
          categoria_id: categoriaId,
          fecha_primera_cuota: fechaPrimera,
        }

    const { error: err } = await onSave(datos)
    setGuardando(false)
    if (err) setError(err)
  }

  return (
    <Modal
      titulo={editando ? 'Editar cuota' : 'Nueva cuota'}
      onClose={onClose}
      actions={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={!puedeGuardar || guardando} className="btn-primary">
            {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cuota'}
          </button>
        </div>
      }
    >
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 mb-4">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}
      <div className="space-y-4">
        {!editando && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Descripción</label>
            <input
              type="text"
              placeholder="Ej: iPhone"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="input-dark"
              autoFocus
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Monto por cuota (ARS)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={montoCuota ? new Intl.NumberFormat('es-AR').format(Number(montoCuota)) : ''}
                onChange={e => setMontoCuota(e.target.value.replace(/\D/g, ''))}
                className="input-dark pl-8"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Cantidad de cuotas</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="12"
              value={totalCuotas}
              onChange={e => setTotalCuotas(e.target.value.replace(/\D/g, ''))}
              className="input-dark"
            />
          </div>
        </div>

        {!editando && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Fecha primera cuota</label>
              <input
                type="date"
                value={fechaPrimera}
                onChange={e => setFechaPrimera(e.target.value)}
                className="input-dark min-w-0"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Categoría real del gasto</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="input-dark"
              >
                <option value="">— Elegir categoría —</option>
                {categoriasGasto.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
