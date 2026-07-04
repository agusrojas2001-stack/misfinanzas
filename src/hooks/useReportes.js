import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

  async function guardar({ mes, contenido, resumen_datos = null, contexto_usuario = null, preguntas = null }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('reportes_mensuales').insert({
      user_id: user.id,
      mes: `${mes}-01`,
      contenido,
      modelo_usado: 'claude-sonnet-4-6',
      resumen_datos,
      contexto_usuario,
      preguntas,
    })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  // Un solo reporte por mes, disponible solo a partir del mes siguiente
  function puedeGenerar(mes) {
    const now = new Date()
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return mes < mesActual && !reportes.some(r => r.mes?.startsWith(mes))
  }

  return { reportes, loading, guardar, puedeGenerar, refetch: fetch }
}
