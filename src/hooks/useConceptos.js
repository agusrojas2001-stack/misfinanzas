import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Descripciones que el usuario ya usó, agrupadas por texto + tipo, con cuántas
// veces se usaron y la categoría más reciente. Alimenta el autocompletado.
export function useConceptos() {
  const [conceptos, setConceptos] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('movimientos')
        .select('concepto, tipo, categoria_id, fecha')
        .not('concepto', 'is', null)
        .neq('concepto', '')
        .order('fecha', { ascending: false })
        .limit(2000)

      const porClave = {}
      for (const m of data ?? []) {
        const clave = `${m.tipo}|${normalizar(m.concepto)}`
        if (!porClave[clave]) {
          // El primero que aparece es el más reciente (orden por fecha desc)
          porClave[clave] = { texto: m.concepto.trim(), tipo: m.tipo, categoria_id: m.categoria_id, usos: 0 }
        }
        porClave[clave].usos++
      }
      setConceptos(Object.values(porClave))
    }
    cargar()
  }, [])

  return conceptos
}
