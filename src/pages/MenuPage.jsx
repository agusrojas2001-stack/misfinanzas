import { useNavigate } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { useAuth } from '../contexts/AuthContext'

function MenuItem({ emoji, label, sublabel, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]
        ${danger
          ? 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20'
          : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}
      `}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 text-left">
        <p className={`font-extrabold text-sm ${danger ? 'text-rose-400' : 'text-zinc-100'}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs font-normal text-zinc-400 mt-0.5">{sublabel}</p>}
      </div>
      <span className="text-zinc-600">›</span>
    </button>
  )
}

export default function MenuPage() {
  const navigate = useNavigate()
  const { user, perfil, signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-enter px-4 pt-4 pb-2 space-y-5">
      <Header title="Menú ⚙️" />

      {/* Perfil */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-700
                        flex items-center justify-center text-2xl">
          👤
        </div>
        <div>
          <p className="font-extrabold text-zinc-100">{perfil?.nombre || user?.email?.split('@')[0]}</p>
          <p className="text-sm font-normal text-zinc-400">{user?.email}</p>
        </div>
      </div>

      {/* Opciones */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide px-1">Configuración</p>
        <MenuItem
          emoji="🏷️"
          label="Categorías"
          sublabel="Crear, editar y archivar categorías"
          onClick={() => navigate('/categorias')}
        />
        <MenuItem
          emoji="🔔"
          label="Recordatorios"
          sublabel="Avisos de pagos y gastos recurrentes"
          onClick={() => navigate('/recordatorios')}
        />
        <MenuItem
          emoji="💳"
          label="Cuotas y pagos"
          sublabel="Compras en cuotas y pagos pendientes"
          onClick={() => navigate('/cuotas')}
        />
        <MenuItem
          emoji="💰"
          label="Presupuesto mensual"
          sublabel="Definir límites por categoría"
          onClick={() => navigate('/presupuesto')}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide px-1">Cuenta</p>
        <MenuItem
          emoji="👤"
          label="Editar perfil"
          sublabel="Cambiar nombre o contraseña"
          onClick={() => navigate('/perfil')}
        />
        <MenuItem
          emoji="🚪"
          label="Cerrar sesión"
          danger
          onClick={handleLogout}
        />
      </div>

      <div className="text-center py-4">
        <p className="text-xs text-zinc-700">Mis Numeritos v0.1.0</p>
      </div>
    </div>
  )
}
