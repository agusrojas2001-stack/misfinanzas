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

    if (data && data.length > 0) {
      setPresupuestos(data)
      setLoading(false)
      return
    }

    // Solo auto-copiar para el mes actual o futuro
    const hoy = new Date()
    const currentMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    if (mes < currentMes) {
      setPresupuestos([])
      setLoading(false)
      return
    }

    // No hay presupuesto para este mes — copiar del mes anterior más reciente
    const { data: prevData } = await supabase
      .from('presupuesto')
      .select('categoria_id, monto_max, mes')
      .lt('mes', mesDB)
      .order('mes', { ascending: false })
      .limit(30)

    if (prevData && prevData.length > 0) {
      const mesMasReciente = prevData[0].mes
      const aCopiar = prevData.filter(p => p.mes === mesMasReciente)

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('presupuesto').insert(
        aCopiar.map(p => ({
          user_id: user.id,
          categoria_id: p.categoria_id,
          monto_max: p.monto_max,
          mes: mesDB,
        }))
      )

      const { data: newData } = await supabase
        .from('presupuesto')
        .select('*, categorias(id, nombre, emoji)')
        .eq('mes', mesDB)
      setPresupuestos(newData ?? [])
    } else {
      setPresupuestos([])
    }

    setLoading(false)
  }, [mes])

  useEffect(() => { fetch() }, [fetch])

  async function guardar({ categoria_id, monto_max }) {
    const mesDB = `${mes}-01`
    const { data: { user } } = await supabase.auth.getUser()
    const existente = presupuestos.find(p => p.categoria_id === categoria_id)
    if (existente) {
      const { error } = await supabase.from('presupuesto').update({ monto_max }).eq('id', existente.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('presupuesto').insert({ user_id: user.id, categoria_id, monto_max, mes: mesDB })
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
