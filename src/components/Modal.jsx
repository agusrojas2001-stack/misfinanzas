export default function Modal({ titulo, onClose, actions, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl
                      flex flex-col max-h-[80vh]"
           onClick={e => e.stopPropagation()}>
        {/* Título */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">{titulo}</h2>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center
                             text-zinc-400 text-sm transition-all active:scale-95">
            ✕
          </button>
        </div>
        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
        {/* Botones fijos abajo */}
        {actions && (
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-zinc-800 bg-zinc-900 rounded-b-2xl">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
