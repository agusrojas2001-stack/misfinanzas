import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotificaciones(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotificaciones()

    // Suscripción realtime para recibir nuevas notificaciones automáticamente
    const channel = supabase
      .channel('notificaciones_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          setNotificaciones(prev => [payload.new, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotificaciones])

  const noLeidas = notificaciones.filter(n => !n.leida).length

  async function marcarLeida(id) {
    // Actualización optimista
    setNotificaciones(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    )
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
  }

  async function marcarTodasLeidas() {
    // Actualización optimista
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    const ids = notificaciones.filter(n => !n.leida).map(n => n.id)
    if (ids.length === 0) return
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .in('id', ids)
  }

  async function eliminar(id) {
    // Actualización optimista
    setNotificaciones(prev => prev.filter(n => n.id !== id))
    await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id)
  }

  async function crear(datos) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ ...datos, user_id: user.id })
      .select()
      .single()
    if (error) return { error: error.message }
    // El realtime channel se encargará de actualizar el estado
    return { data, error: null }
  }

  return {
    notificaciones,
    noLeidas,
    loading,
    marcarLeida,
    marcarTodasLeidas,
    eliminar,
    crear,
    refetch: fetchNotificaciones,
  }
}
