import { useState, useEffect } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import { evaluarReglas, procesarRecordatorios } from '../../lib/evaluarReglas'
import NotifPanel from '../Notifications/NotifPanel'
import PushPermiso from '../Notifications/PushPermiso'

const NAV_ITEMS = [
  { path: '/',            label: 'Inicio',      emoji: '🏠' },
  { path: '/chatbot',     label: 'Monedita',    emoji: '💬' },
  { path: '/metas',       label: 'Metas',       emoji: '🎯' },
  { path: '/presupuesto', label: 'Presupuesto', emoji: '📊' },
  { path: '/analisis',    label: 'Análisis',    emoji: '📈' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, perfil, signOut } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)

  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, eliminar: eliminarNotif, refetch: refetchNotifs } = useNotificaciones()

  useEffect(() => {
    if (!user) return

    // Recordatorios manuales: siempre al abrir la app (sin cooldown)
    setTimeout(() => procesarRecordatorios(user.id).then(refetchNotifs), 1000)

    // Reglas automáticas: máximo cada 6 horas
    const last = localStorage.getItem('lastEvalReglas')
    const now = Date.now()
    if (!last || now - Number(last) > 6 * 60 * 60 * 1000) {
      setTimeout(() => evaluarReglas(user.id).then(() => {
        localStorage.setItem('lastEvalReglas', String(now))
        refetchNotifs()
      }), 3000)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bloquea scroll del fondo cuando un drawer está abierto
  useEffect(() => {
    document.body.style.overflow = (drawerOpen || notifPanelOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, notifPanelOpen])

  const isChatbot = pathname === '/chatbot'

  function close() { setDrawerOpen(false) }

  function navTo(path) {
    close()
    navigate(path)
  }

  async function handleLogout() {
    close()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Backdrop menú */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Backdrop panel de notificaciones */}
      {notifPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setNotifPanelOpen(false)}
        />
      )}

      {/* Panel de notificaciones */}
      <NotifPanel
        open={notifPanelOpen}
        notificaciones={notificaciones}
        noLeidas={noLeidas}
        onMarcarLeida={marcarLeida}
        onMarcarTodasLeidas={marcarTodasLeidas}
        onEliminar={eliminarNotif}
        onClose={() => setNotifPanelOpen(false)}
        onNavegar={(url) => { if (url) navigate(url); setNotifPanelOpen(false) }}
      />

      {/* Drawer derecho */}
      <div className={`fixed top-0 right-0 h-full w-72 z-50 bg-zinc-900 border-l border-zinc-800
                       flex flex-col transform transition-transform duration-300 ease-out safe-top
                       ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-800 shrink-0">
          <span className="font-semibold text-zinc-200 text-sm">Menú</span>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Perfil */}
        <div className="px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700
                            flex items-center justify-center text-lg shrink-0">
              👤
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-200 text-sm truncate">
                {perfil?.nombre || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">

          {/* Navegación */}
          <div className="px-4 space-y-0.5">
            <p className="text-xs text-zinc-600 uppercase tracking-wide font-medium px-2 pb-2">
              Navegación
            </p>
            {NAV_ITEMS.map(item => {
              const active = item.path === '/'
                ? pathname === '/'
                : pathname.startsWith(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => navTo(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm
                    ${active
                      ? 'bg-violet-600/20 text-violet-400 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="h-px bg-zinc-800 mx-4" />

          {/* Configuración */}
          <div className="px-4 space-y-0.5">
            <p className="text-xs text-zinc-600 uppercase tracking-wide font-medium px-2 pb-2">
              Configuración
            </p>
            <button
              onClick={() => navTo('/categorias')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <span className="text-lg">🏷️</span> Categorías
            </button>
            <button
              onClick={() => navTo('/recordatorios')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <span className="text-lg">🔔</span> Recordatorios
            </button>
            <button
              onClick={() => navTo('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <span className="text-lg">👤</span> Editar perfil
            </button>
          </div>

          <div className="h-px bg-zinc-800 mx-4" />

          {/* Cerrar sesión */}
          <div className="px-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-rose-400 hover:bg-rose-500/10"
            >
              <span className="text-lg">🚪</span> Cerrar sesión
            </button>
          </div>
        </div>

        {/* Footer drawer */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0 safe-bottom">
          <p className="text-xs text-zinc-700 text-center">Mis Numeritos v0.1.0</p>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900 safe-top w-full">
        <div className="flex items-center justify-between px-6 h-11 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <img src="/favicon.svg" alt="Mis Numeritos" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-bold text-violet-400">Mis Numeritos</span>
          </button>
          {/* Campana de notificaciones — solo en desktop */}
          <button
            onClick={() => setNotifPanelOpen(true)}
            className="hidden md:flex w-9 h-9 rounded-xl hover:bg-zinc-800 items-center justify-center
                       text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 relative"
          >
            <span className="text-lg">🔔</span>
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500
                               flex items-center justify-center text-[10px] font-bold text-white px-1">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>

          {/* Botón hamburguesa */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-xl hover:bg-zinc-800 flex items-center justify-center
                       text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 text-lg"
          >
            ☰
          </button>
        </div>
      </header>

      <main className={isChatbot
        ? 'flex-1 overflow-hidden flex flex-col min-h-0'
        : 'flex-1 overflow-y-auto pb-24'
      }>
        <div className={isChatbot
          ? 'flex-1 flex flex-col min-h-0 max-w-4xl w-full mx-auto'
          : 'max-w-4xl mx-auto'
        }>
          <Outlet />
        </div>
      </main>

      <BottomNav />
      <PushPermiso />
    </div>
  )
}
