import { DICCIONARIO_BASE, PALABRAS_TIPO } from './diccionario.js'

/**
 * Parsea un texto libre y devuelve un objeto con tipo, monto y categoria detectados.
 * Recibe un diccionarioPersonal opcional (desde Supabase) para fusionar con el base.
 *
 * @param {string} texto
 * @param {Record<string,string>} diccionarioPersonal  — { palabra: categoria_id }
 * @returns {{ tipo: string|null, monto: number|null, categoria: string|null, confianza: number }}
 */
export function parsearMensaje(texto, diccionarioPersonal = {}) {
  const textoNorm = texto.toLowerCase().trim()

  const diccionario = { ...DICCIONARIO_BASE, ...diccionarioPersonal }

  // 1. Detectar tipo
  let tipo = null
  for (const [t, palabras] of Object.entries(PALABRAS_TIPO)) {
    if (palabras.some(p => textoNorm.includes(p))) {
      tipo = t
      break
    }
  }

  // 2. Extraer monto
  // Soporta: 3500 | $3.500 | 3500 pesos | $3,500 | 1200000
  const montoRegex = /\$?\s*(\d[\d.,]*)(?:\s*(?:pesos?|ars))?/i
  const matchMonto = textoNorm.match(montoRegex)
  let monto = null
  if (matchMonto) {
    const raw = matchMonto[1].replace(/[.,]/g, '')
    monto = parseInt(raw, 10)
  }

  // 3. Detectar categoría
  let categoria = null
  let confianza = 0

  const palabras = textoNorm.split(/[\s,]+/)
  for (const palabra of palabras) {
    const palabraNorm = palabra.replace(/[^a-záéíóúüñ_]/gi, '')
    if (diccionario[palabraNorm]) {
      categoria = diccionario[palabraNorm]
      confianza = 1
      break
    }
  }

  // Fallback: buscar coincidencia parcial
  if (!categoria) {
    for (const [clave, cat] of Object.entries(diccionario)) {
      if (textoNorm.includes(clave)) {
        categoria = cat
        confianza = 0.8
        break
      }
    }
  }

  return { tipo, monto, categoria, confianza }
}

/**
 * Formatea un monto como moneda ARS
 */
export function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}
