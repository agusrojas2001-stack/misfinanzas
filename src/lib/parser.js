import { DICCIONARIO_BASE, PALABRAS_TIPO, PALABRAS_CONSULTA, PALABRAS_USD } from './diccionario.js'

/**
 * Parsea un texto libre y devuelve un objeto con tipo, monto y categoria detectados.
 * @param {string} texto
 * @param {Record<string,string>} diccionarioPersonal  — { palabra: nombreCategoria }
 * @returns {{ tipo: string|null, monto: number|null, categoria: string|null, esConsulta: boolean }}
 */
export function parsearMensaje(texto, diccionarioPersonal = {}) {
  const norm = texto.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita tildes para comparar

  const textoNorm = texto.toLowerCase().trim()

  const diccionario = { ...DICCIONARIO_BASE, ...diccionarioPersonal }

  // 0. Detectar si es una consulta
  const esConsulta = PALABRAS_CONSULTA.some(p => textoNorm.includes(p))
  if (esConsulta) return { tipo: null, monto: null, categoria: null, esConsulta: true }

  // 1. Detectar tipo
  let tipo = null
  for (const [t, palabras] of Object.entries(PALABRAS_TIPO)) {
    if (palabras.some(p => textoNorm.includes(p))) {
      tipo = t
      break
    }
  }

  // 2. Extraer monto — soporta: 3500 | $3.500 | 3500 pesos | 3k | 3.5k | 50 mil | $1.200.000
  let monto = null
  const montoRegex = /\$?\s*(\d[\d.,]*)(?:\s*(k|mil(?:es)?(?:\s+pesos?)?))?/i
  const matchMonto = textoNorm.match(montoRegex)
  if (matchMonto) {
    const sufijo = (matchMonto[2] || '').trim().toLowerCase()
    if (sufijo.startsWith('k')) {
      // 3k = 3000, 3.5k = 3500
      const base = parseFloat(matchMonto[1].replace(',', '.'))
      monto = Math.round(base * 1000)
    } else if (sufijo.startsWith('mil')) {
      // 50 mil = 50000, 1.5 mil = 1500 (raro pero válido)
      const base = parseFloat(matchMonto[1].replace(',', '.'))
      monto = Math.round(base * 1000)
    } else {
      // Número normal: quitar separadores de miles (puntos y comas)
      const raw = matchMonto[1].replace(/[.,]/g, '')
      monto = parseInt(raw, 10)
    }
    if (isNaN(monto) || monto <= 0) monto = null
  }

  // 3. Detectar categoría — primero coincidencia exacta, luego parcial
  let categoria = null

  const tokens = textoNorm.split(/[\s,]+/)
  for (const token of tokens) {
    const limpio = token.replace(/[^a-záéíóúüñ_]/gi, '')
    if (limpio && diccionario[limpio]) {
      categoria = diccionario[limpio]
      break
    }
  }

  if (!categoria) {
    for (const [clave, cat] of Object.entries(diccionario)) {
      if (textoNorm.includes(clave)) {
        categoria = cat
        break
      }
    }
  }

  // 4. Detectar señal de dólares y, si viene explícita, la cotización ("a 1500")
  const esUSD = PALABRAS_USD.some(p => textoNorm.includes(p))
  let cotizacion = null
  if (esUSD) {
    const matchCotizacion = textoNorm.match(/\ba\s*\$?\s*(\d[\d.,]*)/i)
    if (matchCotizacion) {
      const raw = matchCotizacion[1].replace(/[.,]/g, '')
      const val = parseInt(raw, 10)
      if (!isNaN(val) && val > 0) cotizacion = val
    }
  }

  return { tipo, monto, categoria, esConsulta: false, moneda: esUSD ? 'USD' : 'ARS', cotizacion }
}

export function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}
