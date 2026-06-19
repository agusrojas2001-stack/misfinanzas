import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMovimientos(mes) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!mes) return
    setLoading(true)
    const inicio = `${mes}-01`
    const fin = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('movimientos')
      .select('*, categorias(nombre, emoji)')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error)
    else setMovimientos(data ?? [])
    setLoading(false)
  }, [mes])

  useEffect(() => { fetch() }, [fetch])

  async function eliminar(id) {
    await supabase.from('movimientos').delete().eq('id', id)
    await fetch()
  }

  return { movimientos, loading, error, eliminar, refetch: fetch }
}
