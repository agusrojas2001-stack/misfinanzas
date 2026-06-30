import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, Menu, Home, MessageCircle, Target, Wallet, TrendingUp, User, LogOut, Tag } from 'lucide-react'
import BottomNav from './BottomNav'
import { useAuth } from '../../contexts/AuthContext'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import { evaluarReglas, procesarRecordatorios } from '../../lib/evaluarReglas'
import NotifPanel from '../Notifications/NotifPanel'
import PushPermiso from '../Notifications/PushPermiso'
import { KeyboardContext } from '../../contexts/KeyboardContext'

const NAV_ITEMS = [
  { path: '/',            label: 'Inicio',      Icon: Home          },
  { path: '/chatbot',     label: 'Monedita',    Icon: MessageCircle },
  { path: '/metas',       label: 'Metas',       Icon: Target        },
  { path: '/presupuesto', label: 'Presupuesto', Icon: Wallet        },
  { path: '/analisis',    label: 'Análisis',    Icon: TrendingUp    },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, perfil, signOut } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStart = useRef(null)

  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas, eliminar: eliminarNotif, refetch: refetchNotifs } = useNotificaciones()

  // ── Keyboard detection (single source of truth) ──────────────
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const baseVvH = useRef(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    baseVvH.current = vv.height

    function onVvResize() {
      const diff = baseVvH.current - vv.height
      if (diff > 100) {
        setKeyboardOpen(true)
      } else {
        // Allow baseline to grow (handles orientation changes)
        if (vv.height > baseVvH.current) baseVvH.current = vv.height
        setKeyboardOpen(false)
      }
    }

    vv.addEventListener('resize', onVvResize)
    return () => vv.removeEventListener('resize', onVvResize)
  }, [])

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

  function close() {
    setDrawerOpen(false)
    setDragX(0)
    setIsDragging(false)
  }

  function onDrawerTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    setIsDragging(false)
    setDragX(0)
  }

  function onDrawerTouchMove(e) {
    if (!touchStart.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y)
    if (dx > 8 && dx > dy) {
      setIsDragging(true)
      setDragX(dx)
    }
  }

  function onDrawerTouchEnd() {
    if (dragX > 100) close()
    else { setDragX(0); setIsDragging(false) }
    touchStart.current = null
  }

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
    <KeyboardContext.Provider value={keyboardOpen}>
    <div className="bg-zinc-950 flex flex-col overflow-hidden h-screen" style={{ height: '100dvh' }}>

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
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 bg-zinc-900 border-l border-zinc-800
                   flex flex-col safe-top"
        style={{
          transform: drawerOpen ? `translateX(${dragX}px)` : 'translateX(100%)',
          transition: isDragging ? 'none' : 'transform 300ms ease-out',
        }}
        onTouchStart={onDrawerTouchStart}
        onTouchMove={onDrawerTouchMove}
        onTouchEnd={onDrawerTouchEnd}
      >

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
                            flex items-center justify-center shrink-0">
              <User size={20} strokeWidth={1.8} className="text-violet-200" />
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
                  <item.Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
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
              <Tag size={18} strokeWidth={1.8} /> Categorías
            </button>
            <button
              onClick={() => navTo('/recordatorios')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Bell size={18} strokeWidth={1.8} /> Recordatorios
            </button>
            <button
              onClick={() => navTo('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <User size={18} strokeWidth={1.8} /> Editar perfil
            </button>
          </div>

          <div className="h-px bg-zinc-800 mx-4" />

          {/* Cerrar sesión */}
          <div className="px-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut size={18} strokeWidth={1.8} /> Cerrar sesión
            </button>
          </div>
        </div>

        {/* Footer drawer */}
        <div className="px-5 pt-3 border-t border-zinc-800 shrink-0"
             style={{ paddingBottom: 'calc(0.75rem + 4rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-xs text-zinc-700 text-center">Mis Numeritos v0.1.0</p>
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900 safe-top w-full">
        <div className="flex items-center justify-between px-6 h-11 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <img src="/coin-gold.svg" alt="Mis Numeritos" className="w-7 h-7" />
            <span className="text-sm font-bold font-sans" style={{ color: '#a78bfa', letterSpacing: '-0.01em' }}>
              Mis Numeritos
            </span>
          </button>
          <div className="flex items-center gap-1">
            {/* Campana — solo en desktop */}
            <button
              onClick={() => setNotifPanelOpen(true)}
              className="hidden md:flex w-9 h-9 rounded-xl hover:bg-zinc-800 items-center justify-center
                         text-zinc-500 hover:text-zinc-200 transition-all active:scale-95 relative"
            >
              <Bell size={18} strokeWidth={1.8} />
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-expense
                                 flex items-center justify-center text-[10px] font-bold text-white px-1">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
            {/* Hamburguesa */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-xl hover:bg-zinc-800 flex items-center justify-center
                         text-zinc-500 hover:text-zinc-200 transition-all active:scale-95"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <main
        className={isChatbot
          ? 'flex-1 overflow-hidden flex flex-col min-h-0'
          : 'flex-1 overflow-y-auto pb-24'
        }
        style={isChatbot ? undefined : { paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))' }}
        onFocus={(e) => {
          const el = e.target
          if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return
          if (['number', 'date', 'time', 'range'].includes(el.type)) return
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350)
        }}
      >
        <div className={isChatbot
          ? 'flex-1 flex flex-col min-h-0 max-w-4xl w-full mx-auto'
          : 'max-w-4xl mx-auto'
        }>
          <Outlet />
        </div>
      </main>

      {!keyboardOpen && <BottomNav />}
      <PushPermiso />
    </div>
    </KeyboardContext.Provider>
  )
}
