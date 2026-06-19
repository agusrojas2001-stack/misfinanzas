import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import MenuDrawer from './MenuDrawer'

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Barra superior con hamburguesa */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900 safe-top w-full">
      <div className="flex items-center justify-between px-6 h-11 max-w-4xl mx-auto">
        <span className="text-sm font-bold text-violet-400">MisFinanzas 💸</span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 rounded-xl hover:bg-zinc-800 flex items-center justify-center
                     text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 text-lg"
        >
          ☰
        </button>
      </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>

      <BottomNav />
      <MenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
