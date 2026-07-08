// Fecha de hoy en formato YYYY-MM-DD, en hora LOCAL (no UTC).
// new Date().toISOString() convierte a UTC antes de cortar la fecha: en
// Argentina (UTC-3) eso devuelve el día siguiente entre las 21:00 y las
// 23:59 hora local. Este helper arma el string desde los componentes
// locales de la fecha, sin pasar por UTC.
export function fechaHoyLocal() {
  const hoy = new Date()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mm}-${dd}`
}