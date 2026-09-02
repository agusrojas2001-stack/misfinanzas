import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('tipo')
      .order('nombre')
    if (error) setError(error.message)
    else setCategorias(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategorias() }, [fetchCategorias])

  async function crearCategoria({ nombre, emoji, tipo, es_retiro_ahorro = false }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('categorias')
      .insert({
        nombre: nombre.trim(),
        emoji: emoji.trim(),
        tipo,
        es_retiro_ahorro: tipo === 'gasto' ? es_retiro_ahorro : false,
        user_id: user.id,
      })
    if (error) return { error: error.message }
    await fetchCategorias()
    return { error: null }
  }

  async function editarCategoria(id, { nombre, emoji, es_retiro_ahorro }) {
    const { error } = await supabase
      .from('categorias')
      .update({ nombre: nombre.trim(), emoji: emoji.trim(), es_retiro_ahorro })
      .eq('id', id)
    if (error) return { error: error.message }
    await fetchCategorias()
    return { error: null }
  }

  async function toggleArchivar(id, activa) {
    const { error } = await supabase
      .from('categorias')
      .update({ activa: !activa })
      .eq('id', id)
    if (error) return { error: error.message }
    await fetchCategorias()
    return { error: null }
  }

  return { categorias, loading, error, crearCategoria, editarCategoria, toggleArchivar, refetch: fetchCategorias }
}
