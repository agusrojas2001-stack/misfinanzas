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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
         style={{ background: 'rgba(24,24,27,0.96)', borderTop: '1px solid #1f1f23', backdropFilter: 'blur(12px)', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
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
