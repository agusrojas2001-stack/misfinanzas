import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/',             label: 'Inicio',      emoji: '🏠' },
  { to: '/presupuesto',  label: 'Presupuesto', emoji: '📊' },
  { to: '/registrar',    label: 'Registrar',   emoji: '➕', special: true },
  { to: '/chatbot',      label: 'Monedita',    emoji: '💬' },
  { to: '/metas',        label: 'Metas',       emoji: '🎯' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-4xl mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.to)

          if (tab.special) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center text-2xl
                  shadow-lg shadow-violet-900/50 transition-all duration-200
                  ${isActive
                    ? 'bg-violet-500 scale-110'
                    : 'bg-violet-600 hover:bg-violet-500 active:scale-95'}
                `}>
                  {tab.emoji}
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? 'text-violet-400' : 'text-zinc-500'
                }`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
                         transition-all duration-200 active:scale-95"
            >
              <span className={`text-2xl transition-all duration-200 ${
                isActive ? 'scale-110' : ''
              }`}>
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
