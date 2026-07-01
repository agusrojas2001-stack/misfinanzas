/**
 * Devuelve la etapa del mes según el día.
 *   arranque: días  1-10  — el mes recién empieza.
 *   mitad:    días 11-25  — mes en curso.
 *   cierre:   días 26-31  — cerrando el mes.
 */
export function getEtapaMes(fecha) {
  const dia = (fecha ?? new Date()).getDate()
  if (dia <= 10) return 'arranque'
  if (dia <= 25) return 'mitad'
  return 'cierre'
}
