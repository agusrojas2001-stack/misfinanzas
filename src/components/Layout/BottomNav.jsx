import { useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/',         label: 'Inicio',   emoji: '🏠' },
  { to: '/chatbot',  label: 'Monedita', emoji: '💬' },
  { to: '/metas',    label: 'Metas',    emoji: '🎯' },
  { to: '/menu',     label: 'Menú',     emoji: '⚙️' },
  { to: '/analisis', label: 'Análisis', emoji: '📈' },
]

export default function BottomNav() {
  const location = useLocation()
  const navRef = useRef(null)

  // Mantiene el nav visible cuando el teclado sube (iOS/Android)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      if (!navRef.current) return
      const shift = window.innerHeight - vv.height - vv.offsetTop
      navRef.current.style.transform = shift > 0 ? `translateY(-${Math.round(shift)}px)` : ''
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
                         transition-all duration-200 active:scale-95"
            >
              <span className={`text-2xl transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.emoji}
              </span>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-violet-400' : 'text-zinc-500'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-violet-400 mt-0.5" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
