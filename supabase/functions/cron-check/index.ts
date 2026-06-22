import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@misnumeritos.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    const now = new Date()

    // Todos los recordatorios vencidos (de todos los usuarios)
    const { data: pendientes } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('activo', true)
      .lte('proximo_aviso', now.toISOString())
      .not('proximo_aviso', 'is', null)

    let processed = 0

    for (const rec of pendientes ?? []) {
      const montoTxt = rec.monto_estimado
        ? ` (~$${Number(rec.monto_estimado).toFixed(0)})`
        : ''

      // Insertar notificación in-app
      await supabase.from('notificaciones').insert({
        user_id: rec.user_id,
        tipo: 'recordatorio',
        emoji: rec.emoji || '🔔',
        titulo: rec.nombre,
        mensaje: `Recordatorio programado${montoTxt}.`,
        accion_url: '/recordatorios',
      })

      // Enviar push a todas las suscripciones del usuario
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', rec.user_id)

      const expiredEndpoints: string[] = []
      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: rec.nombre,
              message: `Recordatorio programado${montoTxt}.`,
              emoji: rec.emoji || '🔔',
              url: '/recordatorios',
            })
          )
        } catch (err: any) {
          if (err?.statusCode === 410) expiredEndpoints.push(sub.endpoint)
        }
      }

      if (expiredEndpoints.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
      }

      // Calcular próximo aviso
      const proximoAviso = calcularProximoAviso(rec)
      await supabase.from('recordatorios')
        .update({ proximo_aviso: proximoAviso })
        .eq('id', rec.id)

      processed++
    }

    return new Response(JSON.stringify({ processed, checked_at: now.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[cron-check]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function calcularProximoAviso(rec: any): string | null {
  const now = new Date()
  const [hh, mm] = (rec.hora || '09:00').split(':').map(Number)

  const setHora = (d: Date) => { const r = new Date(d); r.setHours(hh, mm, 0, 0); return r }

  switch (rec.frecuencia) {
    case 'unico': return null

    case 'semanal': {
      const target = rec.dia ?? 1
      const c = new Date(now)
      const diff = (target - c.getDay() + 7) % 7
      c.setDate(c.getDate() + (diff === 0 ? 7 : diff))
      const aviso = setHora(c)
      if (aviso <= now) { c.setDate(c.getDate() + 7); return setHora(c).toISOString() }
      return aviso.toISOString()
    }

    case 'mensual': {
      const dia = rec.dia ?? 1
      let c = new Date(now.getFullYear(), now.getMonth(), dia)
      let aviso = setHora(c)
      if (aviso <= now) {
        c = new Date(now.getFullYear(), now.getMonth() + 1, dia)
        aviso = setHora(c)
      }
      return aviso.toISOString()
    }

    case 'anual': {
      const dia = rec.dia ?? 1
      const mes = (rec.mes ?? 1) - 1
      let c = new Date(now.getFullYear(), mes, dia)
      let aviso = setHora(c)
      if (aviso <= now) {
        c = new Date(now.getFullYear() + 1, mes, dia)
        aviso = setHora(c)
      }
      return aviso.toISOString()
    }

    default: return null
  }
}
