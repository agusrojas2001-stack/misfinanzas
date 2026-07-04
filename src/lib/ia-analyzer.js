import Anthropic from '@anthropic-ai/sdk'
import { getEtapaMes } from './etapaMes'

// NOTA DE SEGURIDAD: Esta llamada se hace desde el cliente (browser).
// La API key queda expuesta en el bundle del frontend.
// Para uso personal está bien, pero si esta app se vuelve multi-usuario,
// mover esta lógica a una Supabase Edge Function para proteger la key.
// Ver: https://supabase.com/docs/guides/functions

const BASE_PROMPT = `Sos un asesor financiero personal directo y conciso, hablás español rioplatense.
Siempre usás "vos". Decís "plata" o "$", nunca "guita" ni "mangos". Sin reto ni culpa. Sin frases corporativas.

Los datos incluyen gastos clasificados como "fijo" (gym, transporte, facultad, suscripciones, alquiler, servicios — costos que no cambian mes a mes) o "variable" (salidas, comidas, entretenimiento, compras — donde hay margen real de decisión).

Devolvé un reporte Markdown CORTO con esta estructura:

## 📊 Resumen
1-2 líneas. Honesto y adaptado a la etapa del mes (ver directivas abajo).

## 📌 Gastos fijos
Una línea con el total de gastos fijos y qué % representan del ingreso. Sin desarrollar cada uno.

## 🔍 Gastos variables — lo destacable
Solo 2-3 puntos concretos sobre los gastos donde el usuario tiene control real. Mencioná montos. Omitir lo obvio.

## 🎯 Para el próximo mes
Máximo 3 recomendaciones. Solo sobre gastos variables. Una línea cada una, accionable. Si hay metas activas, conectalas.

## ⚠️ Alertas
Solo si hay algo urgente (presupuesto muy excedido, meta en riesgo). Si no, omitir completamente.

REGLAS GENERALES:
- Respuesta total: máximo 350 palabras
- Cero relleno, cero moralismo
- Datos concretos: montos y porcentajes, no generalidades
- Gastos fijos: mencionarlos brevemente, no recomendarlos como área de mejora salvo que algo sea llamativo
- Foco real: los gastos variables son donde el usuario puede actuar`

// Directivas adicionales según etapa del mes. Se agregan al final del system prompt.
const DIRECTIVAS_ETAPA = {
  arranque: `
ETAPA DEL MES: ARRANQUE (días 1-10). Los datos son preliminares.
- En el Resumen aclará que es un análisis con pocos días de datos ("arrancaste el mes...", no "cerraste el mes...").
- Evitá proyecciones alarmistas: con tan poco historial el ritmo puede cambiar mucho.
- Tono orientativo, no de alerta: "arrancaste bien / hay que ajustar el arranque" en lugar de "vas a terminar en rojo".
- La sección "Para el próximo mes" puede orientarse a hábitos del mes actual, no solo al próximo.`,

  mitad: `
ETAPA DEL MES: MITAD (días 11-25). Hay datos representativos, el mes sigue en curso.
- Análisis normal con proyecciones confiables.
- Todavía hay margen real para ajustar comportamientos: apuntá a eso en las recomendaciones.
- Tono de seguimiento: "vas bien / todavía estás a tiempo / esto te puede afectar si seguís así".`,

  cierre: `
ETAPA DEL MES: CIERRE (días 26-31). El mes está terminando.
- En el Resumen hacé un BALANCE del mes, no un análisis de mitad ("cerraste el mes...", "este mes...").
- Las recomendaciones de "Para el próximo mes" apuntá al MES QUE VIENE — ya no hay margen para cambiar este.
- Tono de cierre: "este mes cerraste con..." en lugar de "todavía podés...".
- Si el mes fue bien, decilo claro. Si no, sin drama — "el mes que viene lo ajustamos".`,
}

// Se agrega al system prompt cuando hay historial de meses anteriores.
const DIRECTIVA_HISTORIAL = `

HISTORIAL DE MESES ANTERIORES:
Usá los datos históricos del final del mensaje para:
- Detectar tendencias reales: qué categorías vienen subiendo o bajando mes a mes
- Comparar con números concretos: "este mes gastaste X% más/menos en Y que el promedio"
- Recordar contexto que el usuario ya explicó — si antes aclaró algo puntual, no lo trates como patrón nuevo
- Hacer cada reporte distinto: si el mes pasado señalaste algo y mejoró, decilo; si empeoró, también
- Con 3+ meses de datos los patrones son confiables — usá eso, no repitas observaciones genéricas
El historial viene en la sección "=== HISTORIAL ===" al final del mensaje.`

function buildHistorialText(reportesAnteriores) {
  const secciones = reportesAnteriores.map(r => {
    const d = r.resumen_datos ?? {}
    const mesDate = r.mes ? new Date(r.mes + 'T12:00:00') : null
    const label = mesDate
      ? mesDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      : 'mes anterior'
    const titulo = label.charAt(0).toUpperCase() + label.slice(1)

    const lineas = [`### ${titulo}`]

    if (d.ingresos != null) {
      lineas.push(
        `Ingresos: $${Number(d.ingresos).toLocaleString('es-AR')} | ` +
        `Gastos: $${Number(d.gastos ?? 0).toLocaleString('es-AR')} | ` +
        `Ahorro: $${Number(d.ahorro ?? 0).toLocaleString('es-AR')}`
      )
    }

    const cats = (d.gastos_por_categoria ?? []).slice(0, 6)
    if (cats.length > 0) {
      lineas.push('Categorías:')
      cats.forEach(c =>
        lineas.push(`  - ${c.categoria}: $${Number(c.monto).toLocaleString('es-AR')} (${c.tipo})`)
      )
    }

    if (r.contexto_usuario) lineas.push(`Contexto: "${r.contexto_usuario}"`)
    if (Array.isArray(r.preguntas)) {
      r.preguntas.forEach(p => {
        if (p.respuesta) lineas.push(`Q: ${p.pregunta} → A: ${p.respuesta}`)
      })
    }

    return lineas.join('\n')
  })

  return `\n\n=== HISTORIAL (${reportesAnteriores.length} meses anteriores) ===\n${secciones.join('\n\n')}`
}

export async function generarAnalisis(datos, reportesAnteriores = [], contextoUsuario = null) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('La clave de IA no está configurada. Agregá VITE_ANTHROPIC_API_KEY en las variables de entorno de Vercel.')
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  })

  const etapa = getEtapaMes()
  const dia = new Date().getDate()
  const tieneHistorial = reportesAnteriores.length > 0
  const systemPrompt = BASE_PROMPT + DIRECTIVAS_ETAPA[etapa] + (tieneHistorial ? DIRECTIVA_HISTORIAL : '')

  const contextoText = contextoUsuario ? `\n\nNota del usuario sobre este mes: "${contextoUsuario}"` : ''
  const historialText = tieneHistorial ? buildHistorialText(reportesAnteriores) : ''
  const payload = `Hoy es día ${dia} del mes (etapa: ${etapa}).\n\nAnalizá mis finanzas del mes:\n\n${JSON.stringify(datos, null, 2)}${contextoText}${historialText}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: payload }],
  })

  return response.content[0].text
}
