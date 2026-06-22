import { supabase } from './supabase'
import { enviarPush } from './pushService'

// ============================================================
// calcularProximoAviso
// Dada la config de un recordatorio, retorna ISO string del próximo aviso
// o null si ya pasó (para tipo 'unico')
// ============================================================
export function calcularProximoAviso(rec) {
  const now = new Date()
  const [hh, mm] = (rec.hora || '09:00').split(':').map(Number)

  function setHora(date) {
    const d = new Date(date)
    d.setHours(hh, mm, 0, 0)
    return d
  }

  function restarDias(date, dias) {
    const d = new Date(date)
    d.setDate(d.getDate() - (dias || 0))
    return d
  }

  switch (rec.frecuencia) {
    case 'unico': {
      if (!rec.fecha_unica) return null
      const base = new Date(rec.fecha_unica + 'T12:00:00') // evitar timezone issues
      const aviso = restarDias(setHora(base), rec.dias_anticipacion)
      return aviso > now ? aviso.toISOString() : null
    }

    case 'semanal': {
      // rec.dia = 0 (Dom) ... 6 (Sáb)
      const targetDay = rec.dia ?? 1
      const candidate = new Date(now)
      const diff = (targetDay - candidate.getDay() + 7) % 7
      candidate.setDate(candidate.getDate() + (diff === 0 ? 7 : diff))
      setHora(candidate)
      const aviso = restarDias(candidate, rec.dias_anticipacion)
      if (aviso <= now) {
        // Siguiente semana
        candidate.setDate(candidate.getDate() + 7)
        return restarDias(candidate, rec.dias_anticipacion).toISOString()
      }
      return aviso.toISOString()
    }

    case 'mensual': {
      const diaObjetivo = rec.dia ?? 1
      const candidate = new Date(now.getFullYear(), now.getMonth(), diaObjetivo)
      setHora(candidate)
      let aviso = restarDias(candidate, rec.dias_anticipacion)
      if (aviso <= now) {
        // Próximo mes
        const next = new Date(now.getFullYear(), now.getMonth() + 1, diaObjetivo)
        setHora(next)
        aviso = restarDias(next, rec.dias_anticipacion)
      }
      return aviso.toISOString()
    }

    case 'anual': {
      const diaObjetivo = rec.dia ?? 1
      const mesObjetivo = (rec.mes ?? 1) - 1 // 0-indexed
      const candidate = new Date(now.getFullYear(), mesObjetivo, diaObjetivo)
      setHora(candidate)
      let aviso = restarDias(candidate, rec.dias_anticipacion)
      if (aviso <= now) {
        // Próximo año
        const next = new Date(now.getFullYear() + 1, mesObjetivo, diaObjetivo)
        setHora(next)
        aviso = restarDias(next, rec.dias_anticipacion)
      }
      return aviso.toISOString()
    }

    default:
      return null
  }
}

// ============================================================
// evaluarReglas
// Evalúa reglas automáticas y crea notificaciones si aplica
// ============================================================
export async function evaluarReglas(userId) {
  try {
    const now = new Date()
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const mesInicio = `${mes}-01`
    const hoy = now.toISOString().split('T')[0]

    // Nombres de meses en español
    const MESES = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    const nombreMes = MESES[now.getMonth()]

    // Fetch en paralelo
    const [
      { data: movimientos },
      { data: presupuestos },
      { data: metas },
      { data: categorias },
    ] = await Promise.all([
      supabase
        .from('movimientos')
        .select('id, tipo, categoria_id, monto, fecha, meta_id')
        .eq('user_id', userId)
        .gte('fecha', mesInicio)
        .lte('fecha', hoy),
      supabase
        .from('presupuesto')
        .select('id, categoria_id, monto_max')
        .eq('user_id', userId)
        .eq('mes', mesInicio),
      supabase
        .from('metas')
        .select('id, nombre, emoji, monto_objetivo')
        .eq('user_id', userId)
        .eq('archivada', false),
      supabase
        .from('categorias')
        .select('id, nombre')
        .eq('user_id', userId)
        .eq('activa', true),
    ])

    // Función interna: crear notificación si la regla no fue disparada recientemente
    async function crearSiNueva(datos, reglaId, cooldownDias) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - cooldownDias)

      const { data: logs } = await supabase
        .from('reglas_sistema_log')
        .select('id')
        .eq('user_id', userId)
        .eq('regla_id', reglaId)
        .gte('disparada_at', cutoff.toISOString())
        .limit(1)

      if (logs && logs.length > 0) return // ya disparada en el cooldown

      // Insertar notificación y log en paralelo
      await Promise.all([
        supabase.from('notificaciones').insert({
          ...datos,
          user_id: userId,
        }),
        supabase.from('reglas_sistema_log').insert({
          user_id: userId,
          regla_id: reglaId,
        }),
      ])

      // Disparar push si el usuario tiene suscripción activa
      enviarPush(userId, supabase, {
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        emoji: datos.emoji,
        url: datos.accion_url,
      })
    }

    // --------------------------------------------------------
    // REGLA 1: Inicio de mes (día 1)
    // --------------------------------------------------------
    if (now.getDate() === 1) {
      await crearSiNueva(
        {
          tipo: 'sistema',
          emoji: '📅',
          titulo: `Empezó ${nombreMes}`,
          mensaje: '¿Querés asignar tu presupuesto mensual?',
          accion_url: '/presupuesto',
        },
        `inicio_mes_${mes}`,
        30
      )
    }

    // --------------------------------------------------------
    // REGLA 2 y 3: Presupuesto excedido / 80%
    // --------------------------------------------------------
    if (presupuestos && presupuestos.length > 0) {
      const gastosPorCategoria = {}
      ;(movimientos ?? []).forEach(m => {
        if (m.tipo === 'gasto' && m.categoria_id) {
          gastosPorCategoria[m.categoria_id] = (gastosPorCategoria[m.categoria_id] || 0) + Number(m.monto)
        }
      })

      for (const pres of presupuestos) {
        const gastado = gastosPorCategoria[pres.categoria_id] || 0
        const pct = pres.monto_max > 0 ? gastado / pres.monto_max : 0
        const cat = (categorias ?? []).find(c => c.id === pres.categoria_id)
        const catNombre = cat?.nombre || 'una categoría'

        if (pct >= 1) {
          await crearSiNueva(
            {
              tipo: 'urgente',
              emoji: '🚨',
              titulo: `Presupuesto excedido: ${catNombre}`,
              mensaje: `Gastaste $${gastado.toFixed(0)} de $${pres.monto_max.toFixed(0)} (${Math.round(pct * 100)}%).`,
              accion_url: '/presupuesto',
            },
            `presupuesto_excedido_${pres.categoria_id}_${mes}`,
            3
          )
        } else if (pct >= 0.8) {
          await crearSiNueva(
            {
              tipo: 'recordatorio',
              emoji: '⚠️',
              titulo: `Vas al 80% en ${catNombre}`,
              mensaje: `Gastaste $${gastado.toFixed(0)} de $${pres.monto_max.toFixed(0)}. Cuidado con el límite.`,
              accion_url: '/presupuesto',
            },
            `presupuesto_80_${pres.categoria_id}_${mes}`,
            3
          )
        }
      }
    }

    // --------------------------------------------------------
    // REGLA 4: Sin presupuesto día 25+
    // --------------------------------------------------------
    if (now.getDate() >= 25 && (!presupuestos || presupuestos.length === 0)) {
      await crearSiNueva(
        {
          tipo: 'sistema',
          emoji: '📝',
          titulo: 'Todavía no asignaste presupuesto',
          mensaje: `Quedan pocos días de ${nombreMes}. ¿Querés planificar el próximo mes?`,
          accion_url: '/presupuesto',
        },
        `sin_presupuesto_${mes}`,
        7
      )
    }

    // --------------------------------------------------------
    // REGLA 5: Sin movimientos en 7 días
    // --------------------------------------------------------
    if (movimientos && movimientos.length > 0) {
      const fechas = movimientos.map(m => new Date(m.fecha))
      const ultimaFecha = new Date(Math.max(...fechas))
      const diffDias = Math.floor((now - ultimaFecha) / (1000 * 60 * 60 * 24))
      if (diffDias >= 7) {
        await crearSiNueva(
          {
            tipo: 'sistema',
            emoji: '💭',
            titulo: '¿Todo bien con tus finanzas?',
            mensaje: `Hace ${diffDias} días que no registrás nada. ¿Querés anotar algo?`,
            accion_url: '/registrar',
          },
          `sin_movimientos_${hoy}`,
          1
        )
      }
    } else {
      // Sin movimientos en todo el mes
      await crearSiNueva(
        {
          tipo: 'sistema',
          emoji: '💭',
          titulo: 'Empezá a registrar',
          mensaje: `No hay movimientos en ${nombreMes} todavía. ¡Anotá tu primer gasto!`,
          accion_url: '/registrar',
        },
        `sin_movimientos_${hoy}`,
        1
      )
    }

    // --------------------------------------------------------
    // REGLA 6 y 7: Metas cumplidas / a mitad
    // --------------------------------------------------------
    if (metas && metas.length > 0) {
      // Fetch histórico de ahorros por meta
      const { data: ahorros } = await supabase
        .from('movimientos')
        .select('meta_id, monto')
        .eq('user_id', userId)
        .eq('tipo', 'ahorro')
        .in('meta_id', metas.map(m => m.id))

      const totalPorMeta = {}
      ;(ahorros ?? []).forEach(a => {
        if (a.meta_id) {
          totalPorMeta[a.meta_id] = (totalPorMeta[a.meta_id] || 0) + Number(a.monto)
        }
      })

      for (const meta of metas) {
        const total = totalPorMeta[meta.id] || 0
        const pct = meta.monto_objetivo > 0 ? total / meta.monto_objetivo : 0

        if (pct >= 1) {
          await crearSiNueva(
            {
              tipo: 'info',
              emoji: '🎉',
              titulo: `¡Meta cumplida: ${meta.nombre}!`,
              mensaje: `Alcanzaste $${total.toFixed(0)} de $${meta.monto_objetivo.toFixed(0)}. ¡Felicitaciones!`,
              accion_url: '/metas',
            },
            `meta_cumplida_${meta.id}`,
            999
          )
        } else if (pct >= 0.5 && pct < 0.6) {
          await crearSiNueva(
            {
              tipo: 'info',
              emoji: '💪',
              titulo: `¡Ya vas a la mitad en ${meta.nombre}!`,
              mensaje: `Ahorraste $${total.toFixed(0)} de $${meta.monto_objetivo.toFixed(0)}. ¡Seguí así!`,
              accion_url: '/metas',
            },
            `meta_mitad_${meta.id}`,
            999
          )
        }
      }
    }

    // Los recordatorios manuales se procesan en procesarRecordatorios() sin cooldown
  } catch (err) {
    console.error('[evaluarReglas] Error:', err)
  }
}

// ============================================================
// procesarRecordatorios
// Corre sin cooldown en cada apertura de la app.
// Detecta recordatorios cuyo proximo_aviso ya pasó.
// ============================================================
export async function procesarRecordatorios(userId) {
  try {
    const { data: pendientes } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('user_id', userId)
      .eq('activo', true)
      .lte('proximo_aviso', new Date().toISOString())
      .not('proximo_aviso', 'is', null)

    for (const rec of pendientes ?? []) {
      const montoTxt = rec.monto_estimado ? ` (~$${Number(rec.monto_estimado).toFixed(0)})` : ''
      const notifData = {
        user_id: userId,
        tipo: 'recordatorio',
        emoji: rec.emoji || '🔔',
        titulo: rec.nombre,
        mensaje: `Recordatorio programado${montoTxt}.`,
        accion_url: '/recordatorios',
      }
      await supabase.from('notificaciones').insert(notifData)

      enviarPush(userId, supabase, {
        titulo: notifData.titulo,
        mensaje: notifData.mensaje,
        emoji: notifData.emoji,
        url: notifData.accion_url,
      })

      const proximoAviso = calcularProximoAviso(rec)
      await supabase
        .from('recordatorios')
        .update({ proximo_aviso: proximoAviso })
        .eq('id', rec.id)
    }
  } catch (err) {
    console.error('[procesarRecordatorios] Error:', err)
  }
}
