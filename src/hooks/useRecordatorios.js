import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRecordatorios() {
  const [recordatorios, setRecordatorios] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRecordatorios = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recordatorios')
      .select('*, categorias(nombre, emoji)')
      .order('created_at', { ascending: false })
    setRecordatorios(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecordatorios() }, [fetchRecordatorios])

  async function crear(datos) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('recordatorios')
      .insert({ ...datos, user_id: user.id })
      .select('*, categorias(nombre, emoji)')
      .single()
    if (error) return { error: error.message }
    setRecordatorios(prev => [data, ...prev])
    return { data, error: null }
  }

  async function actualizar(id, datos) {
    const { data, error } = await supabase
      .from('recordatorios')
      .update(datos)
      .eq('id', id)
      .select('*, categorias(nombre, emoji)')
      .single()
    if (error) return { error: error.message }
    setRecordatorios(prev => prev.map(r => r.id === id ? data : r))
    return { data, error: null }
  }

  async function eliminar(id) {
    const { error } = await supabase
      .from('recordatorios')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
    setRecordatorios(prev => prev.filter(r => r.id !== id))
    return { error: null }
  }

  return {
    recordatorios,
    loading,
    crear,
    actualizar,
    eliminar,
    refetch: fetchRecordatorios,
  }
}
