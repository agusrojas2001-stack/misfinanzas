import Anthropic from '@anthropic-ai/sdk'

// NOTA DE SEGURIDAD: Esta llamada se hace desde el cliente (browser).
// La API key queda expuesta en el bundle del frontend.
// Para uso personal está bien, pero si esta app se vuelve multi-usuario,
// mover esta lógica a una Supabase Edge Function para proteger la key.
// Ver: https://supabase.com/docs/guides/functions

const SYSTEM_PROMPT = `Sos un asesor financiero personal directo y conciso, hablás español rioplatense.

Los datos incluyen gastos clasificados como "fijo" (gym, transporte, facultad, suscripciones, alquiler, servicios — costos que no cambian mes a mes) o "variable" (salidas, comidas, entretenimiento, compras — donde hay margen real de decisión).

Devolvé un reporte Markdown CORTO con esta estructura:

## 📊 Resumen
1-2 líneas. Cómo cerró el mes. Honesto.

## 📌 Gastos fijos
Una línea con el total de gastos fijos y qué % representan del ingreso. Sin desarrollar cada uno — son inevitables.

## 🔍 Gastos variables — lo destacable
Solo 2-3 puntos concretos sobre los gastos donde el usuario tiene control real. Mencioná montos. Omitir lo obvio.

## 🎯 Para el próximo mes
Máximo 3 recomendaciones. Solo sobre gastos variables. Una línea cada una, accionable. Si hay metas activas, conectalas.

## ⚠️ Alertas
Solo si hay algo urgente (presupuesto muy excedido, meta en riesgo). Si no, omitir completamente.

REGLAS:
- Respuesta total: máximo 350 palabras
- Cero relleno, cero moralismo
- Datos concretos: montos y porcentajes, no generalidades
- Gastos fijos: mencionarlos brevemente, no recomendarlos como área de mejora salvo que algo sea llamativo
- Foco real: los gastos variables son donde el usuario puede actuar`

export async function generarAnalisis(datos) {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const payload = `Analizá mis finanzas del mes:\n\n${JSON.stringify(datos, null, 2)}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: payload }],
  })

  return response.content[0].text
}
