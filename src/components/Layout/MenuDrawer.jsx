import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function MenuDrawer({ open, onClose }) {
  const { user, perfil, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    onClose()
    await signOut()
    navigate('/login', { replace: true })
  }

  function ir(ruta) {
    onClose()
    navigate(ruta)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl">
        {/* Perfil */}
        <div className="px-5 pt-12 pb-5 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-2xl mb-3">
            👤
          </div>
          <p className="font-semibold text-zinc-100">{perfil?.nombre || 'Usuario'}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
        </div>

        {/* Opciones */}
        <div className="flex-1 py-3">
          <button
            onClick={() => ir('/categorias')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-xl">🏷️</span>
            <span className="font-medium">Categorías</span>
          </button>
          <button
            onClick={() => ir('/metas')}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-xl">🎯</span>
            <span className="font-medium">Metas de ahorro</span>
          </button>
        </div>

        {/* Logout */}
        <div className="px-5 pb-10 border-t border-zinc-800 pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20
                       text-rose-400 hover:bg-rose-500/20 transition-all font-medium"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
