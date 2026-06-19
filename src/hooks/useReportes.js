import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LIMITE_MES = 3

export function useReportes() {
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reportes_mensuales')
      .select('*')
      .order('generado_at', { ascending: false })
    setReportes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function guardar({ mes, contenido }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('reportes_mensuales').insert({
      user_id: user.id,
      mes: `${mes}-01`,
      contenido,
      modelo_usado: 'claude-sonnet-4-6',
    })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  function usadosEnMes(mes) {
    return reportes.filter(r => r.mes?.startsWith(mes)).length
  }

  function puedeGenerar(mes) {
    return usadosEnMes(mes) < LIMITE_MES
  }

  return { reportes, loading, guardar, usadosEnMes, puedeGenerar, LIMITE_MES, refetch: fetch }
}
