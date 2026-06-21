// Drawer de notificaciones — desliza desde la derecha

function tiempoRelativo(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const seg = Math.floor(diff / 1000)
  const min = Math.floor(seg / 60)
  const hrs = Math.floor(min / 60)
  const dias = Math.floor(hrs / 24)

  if (seg < 60) return 'ahora'
  if (min < 60) return `hace ${min}min`
  if (hrs < 24) return `hace ${hrs}h`
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`

  return new Date(isoString).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const BORDE_TIPO = {
  urgente:      'border-l-rose-500',
  recordatorio: 'border-l-amber-400',
  info:         'border-l-emerald-400',
  sistema:      'border-l-violet-500',
}

export default function NotifPanel({
  open,
  notificaciones,
  noLeidas,
  onMarcarLeida,
  onMarcarTodasLeidas,
  onEliminar,
  onClose,
  onNavegar,
}) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 z-50 bg-zinc-900 border-l border-zinc-800
                  flex flex-col transform transition-transform duration-300 ease-out
                  ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header del panel */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-800 shrink-0 safe-top">
        <span className="font-semibold text-zinc-200 text-sm">Notificaciones 🔔</span>
        <div className="flex items-center gap-2">
          {noLeidas > 0 && (
            <button
              onClick={onMarcarTodasLeidas}
              className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg
                         hover:bg-violet-500/10 transition-all"
            >
              ✓ Leer todo
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <span className="text-4xl">🔕</span>
            <p className="text-zinc-500 text-sm">No hay nada nuevo por acá 👌</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/50">
            {notificaciones.map(n => (
              <li key={n.id}>
                <div
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all
                               border-l-4 ${BORDE_TIPO[n.tipo] || 'border-l-zinc-700'}
                               ${n.leida
                                 ? 'bg-zinc-900 hover:bg-zinc-800/40'
                                 : 'bg-zinc-800/80 hover:bg-zinc-800'}`}
                  onClick={() => {
                    onMarcarLeida(n.id)
                    if (n.accion_url) onNavegar(n.accion_url)
                    else onClose()
                  }}
                >
                  {/* Emoji */}
                  <span className="text-2xl shrink-0 mt-0.5">{n.emoji}</span>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {!n.leida && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <p className={`text-sm leading-tight truncate
                                     ${n.leida ? 'text-zinc-400 font-normal' : 'text-zinc-100 font-semibold'}`}>
                        {n.titulo}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{tiempoRelativo(n.created_at)}</p>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={e => { e.stopPropagation(); onEliminar(n.id) }}
                    className="w-6 h-6 shrink-0 flex items-center justify-center rounded
                               text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-all text-xs mt-0.5"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-800 shrink-0 safe-bottom">
        <p className="text-xs text-zinc-700 text-center">Mis Numeritos</p>
      </div>
    </div>
  )
}
