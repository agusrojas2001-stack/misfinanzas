import { getEtapaMes } from './etapaMes'
import { montoEnPesos, montoParaMeta } from './dolar'

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n)
}

function getDiasInfo(mes) {
  const hoy = new Date()
  const [anio, mesNum] = mes.split('-').map(Number)
  const esMesActual = anio === hoy.getFullYear() && mesNum === (hoy.getMonth() + 1)
  const diasEnMes = new Date(anio, mesNum, 0).getDate()
  const diasTranscurridos = esMesActual ? hoy.getDate() : diasEnMes
  const diasRestantes = diasEnMes - diasTranscurridos
  const pctMes = diasTranscurridos / diasEnMes
  return { diasEnMes, diasTranscurridos, diasRestantes, pctMes, esMesActual }
}

// 1. Alertas de presupuesto (general + por categoría)
function alertasPresupuesto(presupuestos, movimientos, mes, etapa) {
  const { diasRestantes, pctMes } = getDiasInfo(mes)
  const insights = []

  const totalGastado = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + montoEnPesos(m), 0)

  const gastosPorCat = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => { acc[m.categoria_id] = (acc[m.categoria_id] ?? 0) + montoEnPesos(m); return acc }, {})

  // ── Presupuesto general ──────────────────────────────────────
  const presupGeneral = presupuestos.find(p => p.categoria_id === null)
  if (presupGeneral) {
    const pct = totalGastado / presupGeneral.monto_max
    const restante = presupGeneral.monto_max - totalGastado

    if (totalGastado > presupGeneral.monto_max) {
      const msgs = {
        arranque: `Apenas arranca el mes y ya superaste el presupuesto. Miremos juntos dónde ajustar.`,
        mitad: `Te fuiste del presupuesto mensual. Todavía quedan días, miremos dónde podés aflojar.`,
        cierre: `Cerrás el mes por encima del presupuesto. Para el mes que viene lo tenemos en cuenta.`,
      }
      insights.push({
        tipo: 'alerta', emoji: '🚨', prioridad: 1,
        mensaje: msgs[etapa],
      })
    } else if (pct >= 0.8 && diasRestantes > 3) {
      const msgs = {
        arranque: `Vas al ${Math.round(pct * 100)}% del presupuesto y el mes recién arranca. Quedan ${formatARS(restante)} para ${diasRestantes} días — ojo.`,
        mitad: `Vas al ${Math.round(pct * 100)}% del presupuesto con ${diasRestantes} días por delante. Todavía estás a tiempo de emparejar. Quedan ${formatARS(restante)}.`,
        cierre: `Te quedan ${formatARS(restante)} de presupuesto para ${diasRestantes} días. Controlá estos últimos y cerrás bien.`,
      }
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 1,
        mensaje: msgs[etapa],
      })
    } else if (pct >= 0.6 && diasRestantes > 7) {
      const msgs = {
        arranque: `Vas al ${Math.round(pct * 100)}% del presupuesto y el mes recién empieza. Te quedan ${formatARS(restante)} disponibles.`,
        mitad: `Vas al ${Math.round(pct * 100)}% del presupuesto del mes. Te quedan ${formatARS(restante)} disponibles.`,
        cierre: `Vas al ${Math.round(pct * 100)}% del presupuesto. Con ${formatARS(restante)} disponibles cerrás el mes sin problemas.`,
      }
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 2,
        mensaje: msgs[etapa],
      })
    } else if (pct < pctMes * 0.7 && pctMes > 0.4) {
      const msgs = {
        arranque: `Buen arranque con el presupuesto: usaste el ${Math.round(pct * 100)}% y quedan ${formatARS(restante)}.`,
        mitad: `Vas bien con el presupuesto mensual: usaste el ${Math.round(pct * 100)}% y quedan ${formatARS(restante)} disponibles.`,
        cierre: `Mes controlado: usaste solo el ${Math.round(pct * 100)}% del presupuesto. Cerrás con ${formatARS(restante)} de margen.`,
      }
      insights.push({
        tipo: 'positivo', emoji: '✅', prioridad: 4,
        mensaje: msgs[etapa],
      })
    }
  }

  // ── Presupuestos por categoría ───────────────────────────────
  presupuestos.filter(p => p.categoria_id !== null).forEach(p => {
    const gastado = gastosPorCat[p.categoria_id] ?? 0
    const pct = p.monto_max > 0 ? gastado / p.monto_max : 0
    const nombre = p.categorias?.nombre ?? 'esa categoría'

    if (gastado > p.monto_max) {
      const msgs = {
        arranque: `Ya superaste el presupuesto en ${nombre} y el mes recién arranca. Aflojá esta semana y lo emparejás.`,
        mitad: `Ojo, te pasaste del límite en ${nombre}. Si aflojás las próximas semanas lo emparejás.`,
        cierre: `Superaste el presupuesto en ${nombre} este mes. Para el mes que viene lo ajustamos.`,
      }
      insights.push({
        tipo: 'alerta', emoji: '🚨', prioridad: 1,
        mensaje: msgs[etapa],
      })
    } else if (pct >= 0.75 && diasRestantes > 3) {
      const msgs = {
        arranque: `Ya usaste el 80% del presupuesto de ${nombre} y el mes recién arranca. Ojo con lo que viene.`,
        mitad: `Ya usaste el 80% de lo que tenías para ${nombre}. Controlá el gasto estos días y cerrás bien.`,
        cierre: `Vas al 80% en ${nombre} con pocos días para el cierre. Controlá los últimos y cerrás justo.`,
      }
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 2,
        mensaje: msgs[etapa],
      })
    } else if (pct < pctMes * 0.6 && pctMes > 0.4) {
      const msgs = {
        arranque: `Vas bien con ${nombre}: usaste solo el ${Math.round(pct * 100)}% del presupuesto.`,
        mitad: `Vas muy bien con ${nombre}: usaste solo el ${Math.round(pct * 100)}% del presupuesto.`,
        cierre: `Bien en ${nombre}: cerrás el mes con solo el ${Math.round(pct * 100)}% del presupuesto usado.`,
      }
      insights.push({
        tipo: 'positivo', emoji: '✅', prioridad: 5,
        mensaje: msgs[etapa],
      })
    }
  })

  return insights
}

// 2. Pace de ahorro del mes
function paceAhorro(totalAhorro, totalIngresos, mes, etapa) {
  const { diasTranscurridos, diasEnMes, pctMes } = getDiasInfo(mes)
  if (diasTranscurridos < 5 || totalIngresos === 0) return []

  const tasa = totalAhorro / totalIngresos
  const proyeccion = diasTranscurridos > 0 ? (totalAhorro / diasTranscurridos) * diasEnMes : 0

  if (tasa >= 0.2) {
    const msgs = {
      arranque: `Buen arranque: ahorrás el ${Math.round(tasa * 100)}% de tus ingresos. Si seguís así, cerrás el mes con ${formatARS(Math.round(proyeccion))}.`,
      mitad: `Ahorrás el ${Math.round(tasa * 100)}% de tus ingresos. A este ritmo cerrás el mes con ${formatARS(Math.round(proyeccion))} ahorrados.`,
      cierre: `Cerrás el mes ahorrando el ${Math.round(tasa * 100)}% de tus ingresos. Muy bien.`,
    }
    return [{
      tipo: 'positivo', emoji: '💰', prioridad: 3,
      mensaje: msgs[etapa],
    }]
  }
  if (tasa < 0.05 && pctMes > 0.3) {
    const msgs = {
      arranque: `Ahorrás el ${Math.round(tasa * 100)}% de tus ingresos. Todavía tenés todo el mes para mejorar esa cifra.`,
      mitad: `Ahorrás el ${Math.round(tasa * 100)}% de tus ingresos este mes. Apuntá al 20% si podés.`,
      cierre: `Este mes ahorraste el ${Math.round(tasa * 100)}% de tus ingresos. El mes que viene podemos mejorar eso.`,
    }
    return [{
      tipo: 'info', emoji: '📊', prioridad: 5,
      mensaje: msgs[etapa],
    }]
  }
  return []
}

// 3. Comparación con mes anterior (usando dataMeses del gráfico de barras)
function comparacionMesAnterior(dataMeses, mes, etapa) {
  if (dataMeses.length < 2) return []
  const { pctMes } = getDiasInfo(mes)
  if (pctMes < 0.1) return []

  const actual   = dataMeses[dataMeses.length - 1]
  const anterior = dataMeses[dataMeses.length - 2]
  if (!actual || !anterior || anterior.Gastos === 0) return []

  const gastosNorm = actual.Gastos / (pctMes || 1)
  const diff = ((gastosNorm - anterior.Gastos) / anterior.Gastos) * 100

  if (diff > 25) {
    const msgs = {
      arranque: `Arrancaste el mes con un ritmo de gasto ${Math.round(diff)}% mayor al mes pasado. Son los primeros días, igual conviene seguirlo.`,
      mitad: `Llevás un ritmo de gasto ${Math.round(diff)}% mayor al mes pasado (${formatARS(anterior.Gastos)} vs proyectado ${formatARS(Math.round(gastosNorm))}). Todavía estás a tiempo.`,
      cierre: `Cerrás el mes con gastos ${Math.round(diff)}% mayores al pasado (${formatARS(anterior.Gastos)} vs ${formatARS(Math.round(gastosNorm))}). Lo tenemos en cuenta para el próximo.`,
    }
    return [{
      tipo: 'warning', emoji: '📈', prioridad: 2,
      mensaje: msgs[etapa],
    }]
  }
  if (diff < -15) {
    const msgs = {
      arranque: `Arrancaste gastando ${Math.round(Math.abs(diff))}% menos que el mes pasado. Buen comienzo.`,
      mitad: `Gastás ${Math.round(Math.abs(diff))}% menos que el mes pasado. A seguir así.`,
      cierre: `Cerrás el mes gastando ${Math.round(Math.abs(diff))}% menos que el pasado. Joya.`,
    }
    return [{
      tipo: 'positivo', emoji: '📉', prioridad: 3,
      mensaje: msgs[etapa],
    }]
  }
  return []
}

// 4. Gasto inusual esta semana
function patronInusualSemanal(movimientos, etapa) {
  const gastos = movimientos.filter(m => m.tipo === 'gasto')
  if (gastos.length < 4) return []

  const porSemana = gastos.reduce((acc, m) => {
    const semana = Math.floor((new Date(m.fecha + 'T00:00:00').getDate() - 1) / 7)
    acc[semana] = (acc[semana] ?? 0) + montoEnPesos(m)
    return acc
  }, {})

  const semanas = Object.values(porSemana)
  if (semanas.length < 2) return []

  const promedio = semanas.reduce((s, v) => s + v, 0) / semanas.length
  const ultima = semanas[semanas.length - 1]

  if (ultima > promedio * 1.9 && ultima > 0) {
    const msgs = {
      arranque: `Esta semana gastaste ${formatARS(ultima)}, casi el doble de tu promedio semanal (${formatARS(Math.round(promedio))}). Ojo para los próximos días.`,
      mitad: `Esta semana gastaste ${formatARS(ultima)}, casi el doble de tu promedio semanal (${formatARS(Math.round(promedio))}).`,
      cierre: `Esta semana gastaste ${formatARS(ultima)}, casi el doble de tu promedio (${formatARS(Math.round(promedio))}). Con pocos días para el cierre, conviene moderarlo.`,
    }
    return [{
      tipo: 'info', emoji: '🤔', prioridad: 3,
      mensaje: msgs[etapa],
    }]
  }
  return []
}

// 5. Proyección de metas de ahorro
function proyeccionMetas(metas, dataMeses, etapa) {
  const activas = (metas ?? []).filter(m => !m.archivada && m.monto_objetivo > 0)
  if (activas.length === 0) return []

  const ultimos3 = dataMeses.slice(-3)
  const promedioAhorro = ultimos3.length > 0
    ? ultimos3.reduce((s, m) => s + m.Ahorro, 0) / ultimos3.length
    : 0
  if (promedioAhorro <= 0) return []

  const insights = []
  activas.slice(0, 2).forEach(meta => {
    // El ritmo de ahorro (promedioAhorro) está en pesos; una meta en USD no
    // es comparable contra eso, así que no proyectamos fecha para esas.
    if ((meta.moneda ?? 'ARS') === 'USD') return
    const ahorrado = (meta.movimientos ?? []).reduce((s, m) => s + montoParaMeta(m, 'ARS'), 0)
    const falta = meta.monto_objetivo - ahorrado
    if (falta <= 0) return

    const mesesRestantes = Math.ceil(falta / promedioAhorro)
    const fechaLlegada = new Date()
    fechaLlegada.setMonth(fechaLlegada.getMonth() + mesesRestantes)
    const label = fechaLlegada.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    const plural = mesesRestantes !== 1 ? 'es' : ''

    const msgs = {
      arranque: `A este ritmo llegás a "${meta.nombre}" en ${mesesRestantes} mes${plural} (${label}). Buen comienzo.`,
      mitad: `A este ritmo llegás a "${meta.nombre}" en ${mesesRestantes} mes${plural} (${label}).`,
      cierre: `Vas bien con "${meta.nombre}": si seguís este ritmo llegás en ${mesesRestantes} mes${plural} (${label}).`,
    }
    insights.push({
      tipo: 'info', emoji: '🎯', prioridad: 4,
      mensaje: msgs[etapa],
    })
  })
  return insights
}

/**
 * Función principal — recibe todos los datos del mes y devuelve los top N insights
 * ordenados por prioridad (1 = más urgente).
 */
export function calcularInsights({ movimientos, mes, presupuestos, metas, dataMeses, totalIngresos, totalAhorro }, max = 4) {
  const etapa = getEtapaMes()

  const todos = [
    ...alertasPresupuesto(presupuestos ?? [], movimientos ?? [], mes, etapa),
    ...comparacionMesAnterior(dataMeses ?? [], mes, etapa),
    ...paceAhorro(totalAhorro, totalIngresos, mes, etapa),
    ...patronInusualSemanal(movimientos ?? [], etapa),
    ...proyeccionMetas(metas ?? [], dataMeses ?? [], etapa),
  ]

  return todos
    .sort((a, b) => a.prioridad - b.prioridad)
    .slice(0, max)
}
