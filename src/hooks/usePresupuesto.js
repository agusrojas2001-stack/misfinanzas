import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePresupuesto(mes) {
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!mes) return
    setLoading(true)
    const mesDB = `${mes}-01`
    const { data } = await supabase
      .from('presupuesto')
      .select('*, categorias(id, nombre, emoji)')
      .eq('mes', mesDB)
    setPresupuestos(data ?? [])
    setLoading(false)
  }, [mes])

  useEffect(() => { fetch() }, [fetch])

  async function guardar({ categoria_id, monto_max }) {
    const mesDB = `${mes}-01`
    const { data: { user } } = await supabase.auth.getUser()

    const existente = presupuestos.find(p => p.categoria_id === categoria_id)
    if (existente) {
      const { error } = await supabase
        .from('presupuesto')
        .update({ monto_max })
        .eq('id', existente.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('presupuesto')
        .insert({ user_id: user.id, categoria_id, monto_max, mes: mesDB })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  async function guardarGeneral(monto_max) {
    const mesDB = `${mes}-01`
    const { data: { user } } = await supabase.auth.getUser()
    const existente = presupuestos.find(p => p.categoria_id === null)
    if (existente) {
      const { error } = await supabase.from('presupuesto').update({ monto_max }).eq('id', existente.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('presupuesto').insert({ user_id: user.id, categoria_id: null, monto_max, mes: mesDB })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  async function eliminar(id) {
    await supabase.from('presupuesto').delete().eq('id', id)
    await fetch()
  }

  return { presupuestos, loading, guardar, guardarGeneral, eliminar, refetch: fetch }
}
