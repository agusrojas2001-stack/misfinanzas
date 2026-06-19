import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMetas() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('metas')
      .select('*, movimientos(monto)')
      .eq('archivada', false)
      .order('fecha_objetivo', { ascending: true })
    setMetas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function crear({ nombre, emoji, monto_objetivo, fecha_objetivo }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('metas').insert({
      user_id: user.id, nombre, emoji, monto_objetivo, fecha_objetivo, archivada: false
    })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  async function archivar(id) {
    await supabase.from('metas').update({ archivada: true }).eq('id', id)
    await fetch()
  }

  async function eliminar(id) {
    await supabase.from('metas').delete().eq('id', id)
    await fetch()
  }

  return { metas, loading, crear, archivar, eliminar, refetch: fetch }
}
