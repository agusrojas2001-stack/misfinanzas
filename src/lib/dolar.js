// Cotización del dólar blue — fuente única para toda la app.
// Se usa como valor SUGERIDO (editable), nunca como definitivo: si falla,
// devuelve null y quien llama debe dejar el campo de cotización vacío en
// vez de bloquear el registro.
export async function getDolarBlue() {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Convierte un movimiento a su valor en pesos para sumarlo en totales que
// mezclan ARS y USD (balance del mes, presupuesto, gráficos, reportes).
// Usa SIEMPRE la cotización guardada del movimiento (snapshot histórico real),
// nunca el blue del día — así el balance de un mes cerrado no cambia solo
// porque el dólar se movió después.
export function montoEnPesos(m) {
  return m.moneda === 'USD' ? Number(m.monto) * Number(m.cotizacion ?? 0) : Number(m.monto)
}

// Convierte un aporte (a una meta) a la moneda de ESA meta antes de sumarlo
// al progreso. Un aporte en USD a una meta en ARS se convierte con SU
// cotización guardada (no con el blue del día). Un aporte en ARS a una meta
// en USD no tiene una cotización propia para convertir de forma confiable,
// así que no se suma (evita inflar el progreso con un número inventado).
export function montoParaMeta(m, metaMoneda) {
  const monedaMov = m.moneda ?? 'ARS'
  if (monedaMov === metaMoneda) return Number(m.monto)
  if (monedaMov === 'USD' && metaMoneda === 'ARS') return Number(m.monto) * Number(m.cotizacion ?? 0)
  return 0
}