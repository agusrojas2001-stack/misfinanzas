import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function inicioDeMes() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

export function useCuotas() {
  const [cuotas, setCuotas] = useState([])
  const [pagosMes, setPagosMes] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetchCuotas = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: pagos }] = await Promise.all([
      supabase
        .from('cuotas')
        .select('*, categorias(nombre, emoji)')
        .order('created_at', { ascending: false }),
      supabase
        .from('movimientos')
        .select('cuota_id')
        .not('cuota_id', 'is', null)
        .gte('fecha', inicioDeMes()),
    ])
    setCuotas(data ?? [])
    setPagosMes(new Set((pagos ?? []).map(p => p.cuota_id)))
    setLoading(false)
  }, [])

  useEffect(() => { fetchCuotas() }, [fetchCuotas])

  async function crear({ descripcion, monto_cuota, total_cuotas, categoria_id, fecha_primera_cuota }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('cuotas')
      .insert({
        user_id: user.id,
        descripcion,
        monto_cuota,
        total_cuotas,
        categoria_id,
        fecha_primera_cuota,
        cuotas_pagadas: 0,
        estado: 'activa',
      })
      .select('*, categorias(nombre, emoji)')
      .single()
    if (error) return { error: error.message }
    setCuotas(prev => [data, ...prev])
    return { data, error: null }
  }

  async function actualizar(id, datos) {
    const { data, error } = await supabase
      .from('cuotas')
      .update(datos)
      .eq('id', id)
      .select('*, categorias(nombre, emoji)')
      .single()
    if (error) return { error: error.message }
    setCuotas(prev => prev.map(c => c.id === id ? data : c))
    return { data, error: null }
  }

  async function pausar(id) {
    return actualizar(id, { estado: 'pausada' })
  }

  async function reactivar(id) {
    return actualizar(id, { estado: 'activa' })
  }

  async function cancelar(id) {
    const { error } = await supabase.from('cuotas').delete().eq('id', id)
    if (error) return { error: error.message }
    setCuotas(prev => prev.filter(c => c.id !== id))
    return { error: null }
  }

  async function pagarCuota(cuota) {
    const { data: { user } } = await supabase.auth.getUser()
    const nuevasPagadas = cuota.cuotas_pagadas + 1
    const completada = nuevasPagadas >= cuota.total_cuotas

    const { error: errMov } = await supabase.from('movimientos').insert({
      user_id: user.id,
      tipo: 'gasto',
      categoria_id: cuota.categoria_id,
      monto: cuota.monto_cuota,
      concepto: `${cuota.descripcion} (cuota ${nuevasPagadas}/${cuota.total_cuotas})`,
      fecha: new Date().toISOString().split('T')[0],
      cuota_id: cuota.id,
    })
    if (errMov) return { error: errMov.message }

    const result = await actualizar(cuota.id, {
      cuotas_pagadas: nuevasPagadas,
      estado: completada ? 'completada' : cuota.estado,
    })
    if (result.error) return result

    setPagosMes(prev => new Set(prev).add(cuota.id))
    return result
  }

  return {
    cuotas,
    pagosMes,
    loading,
    crear,
    actualizar,
    pausar,
    reactivar,
    cancelar,
    pagarCuota,
    refetch: fetchCuotas,
  }
}
