import { useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Target, Wallet, TrendingUp } from 'lucide-react'

const tabs = [
  { to: '/',            label: 'Inicio',      Icon: Home          },
  { to: '/chatbot',     label: 'Monedita',    Icon: MessageCircle },
  { to: '/metas',       label: 'Metas',       Icon: Target        },
  { to: '/presupuesto', label: 'Presupuesto', Icon: Wallet        },
  { to: '/analisis',    label: 'Análisis',    Icon: TrendingUp    },
]

export default function BottomNav() {
  const location = useLocation()
  const navRef = useRef(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !navRef.current) return

    function update() {
      if (!navRef.current) return
      const keyboardH = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      if (keyboardH > 120) {
        // Teclado abierto: ocultá instantáneamente, sin animación
        navRef.current.style.transition = 'none'
        navRef.current.style.transform = 'translateY(100%)'
      } else {
        // Teclado cerrado: reaparecé con una transición corta
        navRef.current.style.transition = 'transform 0.12s ease'
        navRef.current.style.transform = ''
      }
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      if (navRef.current) {
        navRef.current.style.transform = ''
        navRef.current.style.transition = ''
      }
    }
  }, [])

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
         style={{ background: 'rgba(24,24,27,0.96)', borderTop: '1px solid #1f1f23', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
        {tabs.map(({ to, label, Icon }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl
                         transition-all duration-200 active:scale-95"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? '#a78bfa' : '#52525b'}
                className="transition-all duration-200"
              />
              <span className="text-[10px] font-semibold transition-colors"
                    style={{ color: isActive ? '#a78bfa' : '#52525b' }}>
                {label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full mt-0.5"
                      style={{ background: '#a78bfa' }} />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
