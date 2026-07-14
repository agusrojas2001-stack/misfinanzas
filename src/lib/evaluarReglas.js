import { supabase } from './supabase'
import { enviarPush } from './pushService'
import { getEtapaMes } from './etapaMes'
import { fechaHoyLocal } from './fecha'
import { montoEnPesos } from './dolar'

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
      const targetDay = rec.dia ?? 1
      const candidate = new Date(now)
      const diff = (targetDay - candidate.getDay() + 7) % 7
      candidate.setDate(candidate.getDate() + (diff === 0 ? 7 : diff))
      let aviso = setHora(candidate)
      if (aviso <= now) {
        candidate.setDate(candidate.getDate() + 7)
        aviso = setHora(candidate)
      }
      return aviso.toISOString()
    }

    case 'mensual': {
      const diaObjetivo = rec.dia ?? 1
      let aviso = setHora(new Date(now.getFullYear(), now.getMonth(), diaObjetivo))
      if (aviso <= now) {
        aviso = setHora(new Date(now.getFullYear(), now.getMonth() + 1, diaObjetivo))
      }
      return aviso.toISOString()
    }

    case 'anual': {
      const diaObjetivo = rec.dia ?? 1
      const mesObjetivo = (rec.mes ?? 1) - 1
      let aviso = setHora(new Date(now.getFullYear(), mesObjetivo, diaObjetivo))
      if (aviso <= now) {
        aviso = setHora(new Date(now.getFullYear() + 1, mesObjetivo, diaObjetivo))
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
    const hoy = fechaHoyLocal()

    // Nombres de meses en español
    const MESES = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    const nombreMes = MESES[now.getMonth()]
    const etapa = getEtapaMes(now)

    // Fetch en paralelo
    const [
      { data: movimientos },
      { data: presupuestos },
      { data: metas },
      { data: categorias },
    ] = await Promise.all([
      supabase
        .from('movimientos')
        .select('id, tipo, categoria_id, monto, moneda, cotizacion, fecha, meta_id')
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
          titulo: `Arrancó ${nombreMes}`,
          mensaje: `Nuevo mes, nueva oportunidad. ¿Armamos el presupuesto de ${nombreMes}?`,
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
          gastosPorCategoria[m.categoria_id] = (gastosPorCategoria[m.categoria_id] || 0) + montoEnPesos(m)
        }
      })

      for (const pres of presupuestos) {
        const gastado = gastosPorCategoria[pres.categoria_id] || 0
        const pct = pres.monto_max > 0 ? gastado / pres.monto_max : 0
        const cat = (categorias ?? []).find(c => c.id === pres.categoria_id)
        const catNombre = cat?.nombre || 'una categoría'

        if (pct >= 1) {
          const msgExcedido = {
            arranque: `Apenas arranca el mes y ya superaste el presupuesto en ${catNombre}. Aflojá esta semana y lo emparejás.`,
            mitad: `Te fuiste del presupuesto en ${catNombre}. Todavía quedan días, miremos dónde aflojar.`,
            cierre: `Cerrás el mes sobre el presupuesto en ${catNombre}. Para el mes que viene lo ajustamos.`,
          }
          await crearSiNueva(
            {
              tipo: 'urgente',
              emoji: '🚨',
              titulo: `Presupuesto excedido: ${catNombre}`,
              mensaje: msgExcedido[etapa],
              accion_url: '/presupuesto',
            },
            `presupuesto_excedido_${pres.categoria_id}_${mes}`,
            3
          )
        } else if (pct >= 0.8) {
          const msg80 = {
            arranque: `Ya usaste el 80% del presupuesto de ${catNombre} y el mes recién arranca. Ojo con lo que viene.`,
            mitad: `Vas al 80% en ${catNombre}. Controlá el gasto estos días y cerrás bien.`,
            cierre: `Vas al 80% en ${catNombre} con pocos días para el cierre. Controlá los últimos y cerrás justo.`,
          }
          await crearSiNueva(
            {
              tipo: 'recordatorio',
              emoji: '⚠️',
              titulo: `Vas al 80% en ${catNombre}`,
              mensaje: msg80[etapa],
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
          titulo: 'Todavía no armaste tu presupuesto',
          mensaje: '¿Armamos el presupuesto del mes que viene?',
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
        const msgInactivo = {
          arranque: `Hace ${diffDias} días que no anotás nada. Cargá los primeros movimientos y vamos viendo.`,
          mitad: `Hace ${diffDias} días que no anotás nada. ¿Ponemos los numeritos al día?`,
          cierre: `Hace ${diffDias} días sin registrar. El mes cierra pronto, ¿lo ponemos al día antes?`,
        }
        await crearSiNueva(
          {
            tipo: 'sistema',
            emoji: '💭',
            titulo: '¿Todo bien con tus finanzas?',
            mensaje: msgInactivo[etapa],
            accion_url: '/registrar',
          },
          `sin_movimientos_${hoy}`,
          1
        )
      }
    } else {
      // Sin movimientos en todo el mes
      const msgSinNada = {
        arranque: `Arrancó el mes y todavía no anotaste nada. Cargá tus primeros movimientos.`,
        mitad: `Se te escapan los gastos. Ponelos al día en un toque.`,
        cierre: `El mes casi termina y no tenés movimientos anotados. ¿Lo ponemos al día antes de que cierre?`,
      }
      await crearSiNueva(
        {
          tipo: 'sistema',
          emoji: '💭',
          titulo: 'Empezá a registrar',
          mensaje: msgSinNada[etapa],
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
              mensaje: `¡La rompiste! Llegaste a tu meta "${meta.nombre}". A elegir la próxima.`,
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
              mensaje: `Vas más rápido de lo previsto con "${meta.nombre}". A este ritmo llegás antes.`,
              accion_url: '/metas',
            },
            `meta_mitad_${meta.id}`,
            999
          )
        }
      }
    }

    // --------------------------------------------------------
    // REGLA 8: Reporte del mes anterior disponible (días 1-7)
    // --------------------------------------------------------
    if (now.getDate() <= 7) {
      const prevMesDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMes = `${prevMesDate.getFullYear()}-${String(prevMesDate.getMonth() + 1).padStart(2, '0')}`
      const prevMesLabel = MESES[prevMesDate.getMonth()]

      const { data: reporteExistente } = await supabase
        .from('reportes_mensuales')
        .select('id')
        .eq('user_id', userId)
        .gte('mes', `${prevMes}-01`)
        .lte('mes', `${prevMes}-01`)
        .limit(1)

      if (!reporteExistente || reporteExistente.length === 0) {
        await crearSiNueva(
          {
            tipo: 'info',
            emoji: '✨',
            titulo: `Ya podés ver tu resumen de ${prevMesLabel}`,
            mensaje: `El Resumen de Monedita de ${prevMesLabel} ya está disponible. Entrá a Análisis y generalo.`,
            accion_url: '/analisis',
          },
          `reporte_disponible_${prevMes}`,
          30
        )
      }
    }

    // --------------------------------------------------------
    // REGLA 9: Cuotas pendientes del mes (primeros 3 días)
    // --------------------------------------------------------
    if (now.getDate() <= 3) {
      const { data: cuotasActivas } = await supabase
        .from('cuotas')
        .select('id, monto_cuota')
        .eq('user_id', userId)
        .eq('estado', 'activa')

      if (cuotasActivas && cuotasActivas.length > 0) {
        const { data: pagosDelMes } = await supabase
          .from('movimientos')
          .select('cuota_id')
          .eq('user_id', userId)
          .not('cuota_id', 'is', null)
          .gte('fecha', mesInicio)
          .lte('fecha', hoy)

        const pagadasIds = new Set((pagosDelMes ?? []).map(p => p.cuota_id))
        const pendientes = cuotasActivas.filter(c => !pagadasIds.has(c.id))

        if (pendientes.length > 0) {
          const totalPendiente = pendientes.reduce((s, c) => s + Number(c.monto_cuota), 0)
          await crearSiNueva(
            {
              tipo: 'recordatorio',
              emoji: '💳',
              titulo: 'Cuotas pendientes este mes',
              mensaje: `Tenés ${pendientes.length} cuota${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''} este mes ($${totalPendiente.toLocaleString('es-AR')} total)`,
              accion_url: '/cuotas',
            },
            `cuotas_pendientes_${mes}`,
            25
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
function mensajeRecordatorio(nombre, monto) {
  if (monto) {
    const fmt = `$${Number(monto).toLocaleString('es-AR')}`
    const opts = [
      `Acordate de pagar ${fmt} hoy 💳`,
      `Hoy toca pagar ${fmt} — ¡no se te pase! ⏰`,
      `Vencimiento de hoy: ${fmt}. Ya sabés 😉`,
      `Ojo que se acerca ${nombre ?? ''} (${fmt}).`,
    ]
    return opts[Math.floor(Math.random() * opts.length)]
  }
  const opts = [
    `Acordate de esto hoy 🗓️`,
    `¡Hoy toca! No se te pase 📋`,
    `Lo agendaste para hoy, ¡a no olvidarlo! 😊`,
    `Acordate de ${nombre ?? 'esto'} hoy 🗓️`,
  ]
  return opts[Math.floor(Math.random() * opts.length)]
}

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
      const notifData = {
        user_id: userId,
        tipo: 'recordatorio',
        emoji: rec.emoji || '🔔',
        titulo: rec.nombre,
        mensaje: mensajeRecordatorio(rec.nombre, rec.monto_estimado),
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
