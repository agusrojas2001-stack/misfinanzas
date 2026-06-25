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
function alertasPresupuesto(presupuestos, movimientos, mes) {
  const { diasRestantes, pctMes } = getDiasInfo(mes)
  const insights = []

  const totalGastado = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)

  const gastosPorCat = movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => { acc[m.categoria_id] = (acc[m.categoria_id] ?? 0) + m.monto; return acc }, {})

  // ── Presupuesto general ──────────────────────────────────────
  const presupGeneral = presupuestos.find(p => p.categoria_id === null)
  if (presupGeneral) {
    const pct = totalGastado / presupGeneral.monto_max
    const restante = presupGeneral.monto_max - totalGastado

    if (totalGastado > presupGeneral.monto_max) {
      insights.push({
        tipo: 'alerta', emoji: '🚨', prioridad: 1,
        mensaje: `Te fuiste del presupuesto del mes. Miremos juntos dónde podés aflojar.`,
      })
    } else if (pct >= 0.8 && diasRestantes > 3) {
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 1,
        mensaje: `Te queda poco margen: ${formatARS(restante)} para ${diasRestantes} días. Ojo con lo que viene.`,
      })
    } else if (pct >= 0.6 && diasRestantes > 7) {
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 2,
        mensaje: `Vas al ${Math.round(pct * 100)}% del presupuesto del mes. Te quedan ${formatARS(restante)} disponibles.`,
      })
    } else if (pct < pctMes * 0.7 && pctMes > 0.4) {
      insights.push({
        tipo: 'positivo', emoji: '✅', prioridad: 4,
        mensaje: `Vas bien con el presupuesto mensual: usaste el ${Math.round(pct * 100)}% y quedan ${formatARS(restante)} disponibles`,
      })
    }
  }

  // ── Presupuestos por categoría ───────────────────────────────
  presupuestos.filter(p => p.categoria_id !== null).forEach(p => {
    const gastado = gastosPorCat[p.categoria_id] ?? 0
    const pct = p.monto_max > 0 ? gastado / p.monto_max : 0
    const nombre = p.categorias?.nombre ?? 'Categoría'

    if (gastado > p.monto_max) {
      insights.push({
        tipo: 'alerta', emoji: '🚨', prioridad: 1,
        mensaje: `Ojo, te pasaste del límite en ${nombre} este mes. Si aflojás las próximas semanas lo emparejás.`,
      })
    } else if (pct >= 0.75 && diasRestantes > 3) {
      insights.push({
        tipo: 'warning', emoji: '⚠️', prioridad: 2,
        mensaje: `Ya usaste el 80% de lo que tenías para ${nombre} este mes. Ojo con lo que viene.`,
      })
    } else if (pct < pctMes * 0.6 && pctMes > 0.4) {
      insights.push({
        tipo: 'positivo', emoji: '✅', prioridad: 5,
        mensaje: `Vas muy bien con ${nombre}: usaste solo el ${Math.round(pct * 100)}% del presupuesto`,
      })
    }
  })

  return insights
}

// 2. Pace de ahorro del mes
function paceAhorro(totalAhorro, totalIngresos, mes) {
  const { diasTranscurridos, diasEnMes, pctMes } = getDiasInfo(mes)
  if (diasTranscurridos < 5 || totalIngresos === 0) return []

  const tasa = totalAhorro / totalIngresos
  const proyeccion = diasTranscurridos > 0 ? (totalAhorro / diasTranscurridos) * diasEnMes : 0

  if (tasa >= 0.2) {
    return [{
      tipo: 'positivo', emoji: '💰', prioridad: 3,
      mensaje: `Ahorrás el ${Math.round(tasa * 100)}% de tus ingresos. A este ritmo cerrarás el mes con ${formatARS(Math.round(proyeccion))} ahorrados`,
    }]
  }
  if (tasa < 0.05 && pctMes > 0.3) {
    return [{
      tipo: 'info', emoji: '📊', prioridad: 5,
      mensaje: `Ahorrás el ${Math.round(tasa * 100)}% de tus ingresos este mes. Apuntá al 20% si podés.`,
    }]
  }
  return []
}

// 3. Comparación con mes anterior (usando dataMeses del gráfico de barras)
function comparacionMesAnterior(dataMeses, mes) {
  if (dataMeses.length < 2) return []
  const { pctMes } = getDiasInfo(mes)
  if (pctMes < 0.1) return []

  const actual   = dataMeses[dataMeses.length - 1]
  const anterior = dataMeses[dataMeses.length - 2]
  if (!actual || !anterior || anterior.Gastos === 0) return []

  const gastosNorm = actual.Gastos / (pctMes || 1)
  const diff = ((gastosNorm - anterior.Gastos) / anterior.Gastos) * 100

  if (diff > 25) {
    return [{
      tipo: 'warning', emoji: '📈', prioridad: 2,
      mensaje: `Llevás un ritmo de gasto ${Math.round(diff)}% mayor al mes pasado (${formatARS(anterior.Gastos)} vs proyectado ${formatARS(Math.round(gastosNorm))})`,
    }]
  }
  if (diff < -15) {
    return [{
      tipo: 'positivo', emoji: '📉', prioridad: 3,
      mensaje: `Gastás ${Math.round(Math.abs(diff))}% menos que el mes pasado. A seguir así.`,
    }]
  }
  return []
}

// 4. Gasto inusual esta semana
function patronInusualSemanal(movimientos) {
  const gastos = movimientos.filter(m => m.tipo === 'gasto')
  if (gastos.length < 4) return []

  const porSemana = gastos.reduce((acc, m) => {
    const semana = Math.floor((new Date(m.fecha + 'T00:00:00').getDate() - 1) / 7)
    acc[semana] = (acc[semana] ?? 0) + m.monto
    return acc
  }, {})

  const semanas = Object.values(porSemana)
  if (semanas.length < 2) return []

  const promedio = semanas.reduce((s, v) => s + v, 0) / semanas.length
  const ultima = semanas[semanas.length - 1]

  if (ultima > promedio * 1.9 && ultima > 0) {
    return [{
      tipo: 'info', emoji: '🤔', prioridad: 3,
      mensaje: `Esta semana gastaste ${formatARS(ultima)}, casi el doble de tu promedio semanal (${formatARS(Math.round(promedio))})`,
    }]
  }
  return []
}

// 5. Proyección de metas de ahorro
function proyeccionMetas(metas, dataMeses) {
  const activas = (metas ?? []).filter(m => !m.archivada && m.monto_objetivo > 0)
  if (activas.length === 0) return []

  const ultimos3 = dataMeses.slice(-3)
  const promedioAhorro = ultimos3.length > 0
    ? ultimos3.reduce((s, m) => s + m.Ahorro, 0) / ultimos3.length
    : 0
  if (promedioAhorro <= 0) return []

  const insights = []
  activas.slice(0, 2).forEach(meta => {
    const ahorrado = (meta.movimientos ?? []).reduce((s, m) => s + m.monto, 0)
    const falta = meta.monto_objetivo - ahorrado
    if (falta <= 0) return

    const mesesRestantes = Math.ceil(falta / promedioAhorro)
    const fechaLlegada = new Date()
    fechaLlegada.setMonth(fechaLlegada.getMonth() + mesesRestantes)
    const label = fechaLlegada.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

    insights.push({
      tipo: 'info', emoji: '🎯', prioridad: 4,
      mensaje: `A este ritmo llegás a "${meta.nombre}" en ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''} (${label})`,
    })
  })
  return insights
}

/**
 * Función principal — recibe todos los datos del mes y devuelve los top N insights
 * ordenados por prioridad (1 = más urgente).
 */
export function calcularInsights({ movimientos, mes, presupuestos, metas, dataMeses, totalIngresos, totalAhorro }, max = 4) {
  const todos = [
    ...alertasPresupuesto(presupuestos ?? [], movimientos ?? [], mes),
    ...comparacionMesAnterior(dataMeses ?? [], mes),
    ...paceAhorro(totalAhorro, totalIngresos, mes),
    ...patronInusualSemanal(movimientos ?? []),
    ...proyeccionMetas(metas ?? [], dataMeses ?? []),
  ]

  return todos
    .sort((a, b) => a.prioridad - b.prioridad)
    .slice(0, max)
}
