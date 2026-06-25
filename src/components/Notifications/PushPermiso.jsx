import { useState, useEffect } from 'react'
import { suscribirPush, esIOS, esPWAInstalada, getEstadoPermiso } from '../../lib/pushService'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function PushPermiso() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [iosNoPwa, setIosNoPwa] = useState(false)

  useEffect(() => {
    if (!user) return
    const decision = localStorage.getItem('pushDecision')
    if (decision) return
    const estado = getEstadoPermiso()
    if (estado === 'granted' || estado === 'denied' || estado === 'no-supported') {
      if (estado !== 'no-supported') localStorage.setItem('pushDecision', estado)
      return
    }
    const isIos = esIOS()
    const isPwa = esPWAInstalada()
    if (isIos && !isPwa) {
      setIosNoPwa(true)
    }
    const t = setTimeout(() => setVisible(true), 6000)
    return () => clearTimeout(t)
  }, [user])

  function cerrar() {
    localStorage.setItem('pushDecision', 'dismissed')
    setVisible(false)
  }

  async function handleAceptar() {
    if (iosNoPwa) { cerrar(); return }
    try {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
        await suscribirPush(user.id, supabase)
        localStorage.setItem('pushDecision', 'granted')
      } else {
        localStorage.setItem('pushDecision', 'denied')
      }
    } catch (err) {
      console.warn('Push permission error:', err)
    }
    setVisible(false)
  }

  if (!visible || !user) return null

  if (iosNoPwa) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 safe-bottom">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-200 text-sm mb-1">Recibí avisos en tu celular</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Para recibir avisos, instalá la app primero:{' '}
                <span className="text-violet-400 font-medium">Compartir → Agregar a inicio</span>
              </p>
            </div>
          </div>
          <button onClick={cerrar} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-28 bg-black/50 backdrop-blur-sm safe-bottom">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <p className="text-3xl mb-3">🔔</p>
        <p className="font-bold text-zinc-100 mb-1">¿Querés recibir avisos?</p>
        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
          Te avisamos cuando se acerca un pago, estás por pasarte del presupuesto o llegás a una meta de ahorro.
        </p>
        <div className="flex gap-3">
          <button onClick={cerrar} className="btn-secondary flex-1 py-2.5 text-sm">Ahora no</button>
          <button onClick={handleAceptar} className="btn-primary flex-1 py-2.5 text-sm">Sí, quiero</button>
        </div>
      </div>
    </div>
  )
}
