# MIS NUMERITOS — DOCUMENTACIÓN TÉCNICA

## 1. RESUMEN DEL PROYECTO

App de finanzas personales PWA llamada **Mis Numeritos**. Permite registrar gastos, ingresos y ahorros; visualizar el balance mensual con gráficos; gestionar presupuestos, metas y recordatorios con push notifications; y obtener análisis de IA sobre los datos del mes.

Uso personal (un solo usuario por ahora). Arquitectura preparada para multi-usuario vía RLS de Supabase, pero la API key de Anthropic está expuesta en el bundle del frontend, lo que la limita a uso personal.

**Estado actual:** app completa y funcional. Todas las features principales implementadas y deployadas. Las últimas adiciones fueron el sistema de recordatorios con push notifications y la sección de análisis con IA.

---

## 2. STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18.3 + Vite 5.4 |
| Build | @vitejs/plugin-react-swc (compilador SWC) |
| Estilos | Tailwind CSS 3.4 (dark mode: `class`, siempre dark) |
| Routing | react-router-dom v6 |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Gráficos | Recharts 2.12 |
| PWA | vite-plugin-pwa 0.20 — estrategia `injectManifest` con SW custom |
| Service Worker | Workbox (workbox-core + workbox-precaching) |
| IA | @anthropic-ai/sdk 0.105 — modelo `claude-sonnet-4-6` |
| Push | Web Push API + VAPID keys — Edge Function `send-push` |
| Cron server-side | Supabase Edge Function `cron-check` + pg_cron (cada minuto) |
| API externa | dolarapi.com/v1/dolares/blue (cotización dólar blue, sin auth) |
| Deploy | Vercel (CI/CD automático desde main) |
| Iconos | Emojis nativos, sin dependencias de iconos |

---

## 3. ARQUITECTURA Y ESTRUCTURA DE CARPETAS

```
src/
├── App.jsx                    — Router principal + rutas protegidas/públicas
├── main.jsx                   — Entry point React
├── index.css                  — Tailwind base + clases custom + safe areas PWA
├── sw.js                      — Service Worker custom (precaching + push handler)
│
├── contexts/
│   └── AuthContext.jsx        — Context global de sesión (user + perfil)
│
├── components/
│   ├── Modal.jsx              — Modal reutilizable (scroll lock + safe area)
│   ├── Insights/
│   │   ├── InsightCard.jsx    — Card individual de insight (scroll horizontal)
│   │   ├── ReporteMensual.jsx — Renderiza reporte IA en Markdown
│   │   └── HistorialReportes.jsx — Lista de reportes anteriores
│   ├── Layout/
│   │   ├── Layout.jsx         — Wrapper principal: header + drawer + BottomNav
│   │   ├── BottomNav.jsx      — Navegación inferior fija (5 tabs)
│   │   ├── Header.jsx         — (existe, no se usa — ver Bugs)
│   │   └── MenuDrawer.jsx     — (existe, no se usa — drawer está inline en Layout)
│   └── Notifications/
│       ├── NotifPanel.jsx     — Panel de notificaciones in-app (slide desde arriba)
│       └── PushPermiso.jsx    — Modal de permiso de notificaciones (aparece a los 6s)
│
├── hooks/
│   ├── useAuth.js             — Wrapper simple de AuthContext
│   ├── useCategorias.js       — CRUD categorías del usuario
│   ├── useMetas.js            — CRUD metas de ahorro
│   ├── useMovimientos.js      — Movimientos filtrados por mes (con JOIN a categorías)
│   ├── useNotificaciones.js   — Notificaciones in-app (marcar leída, eliminar)
│   ├── usePresupuesto.js      — Presupuesto mensual (general + por categoría)
│   ├── useRecordatorios.js    — CRUD recordatorios periódicos
│   └── useReportes.js         — Reportes IA guardados (límite 3/mes)
│
├── lib/
│   ├── supabase.js            — Cliente Supabase singleton
│   ├── parser.js              — NLP local para chatbot (tipo + monto + categoría)
│   ├── diccionario.js         — Palabras clave → categorías (base)
│   ├── insights.js            — Motor de insights locales (5 reglas, sin IA)
│   ├── evaluarReglas.js       — Reglas automáticas (presupuesto, metas) + procesarRecordatorios
│   ├── ia-analyzer.js         — Llamada a API de Anthropic para análisis mensual
│   └── pushService.js         — Web Push: suscribir, cancelar, enviar, helpers iOS/PWA
│
└── pages/
    ├── LoginPage.jsx          — Login + signup con Supabase Auth
    ├── DashboardPage.jsx      — Inicio: balance, gráficos, insights, dólar blue, FAB
    ├── RegistrarPage.jsx      — Formulario de registro manual de movimientos
    ├── MovimientosPage.jsx    — Historial completo de movimientos con filtros
    ├── ChatbotPage.jsx        — Chat Monedita: registro por lenguaje natural
    ├── MetasPage.jsx          — Metas de ahorro con progreso y proyección
    ├── PresupuestoPage.jsx    — Presupuesto mensual general y por categoría
    ├── CategoriasPage.jsx     — CRUD de categorías con emoji picker
    ├── RecordatoriosPage.jsx  — Recordatorios periódicos con push notifications
    ├── AnalisisPage.jsx       — Análisis detallado: comparativas + IA
    ├── ProfilePage.jsx        — Editar nombre del perfil
    └── MenuPage.jsx           — (existe, ruta /menu, probablemente legacy)

supabase/
├── schema.sql                 — Schema inicial (tablas base)
├── supabase_migrations.sql    — Migración: notificaciones, recordatorios, push, logs
├── cron_recordatorios.sql     — Setup pg_cron para llamar cron-check cada minuto
└── functions/
    ├── send-push/index.ts     — Edge Function: envía push a suscriptores de un usuario
    └── cron-check/index.ts    — Edge Function: procesa recordatorios vencidos de TODOS los usuarios
```

---

## 4. BASE DE DATOS

Todas las tablas tienen RLS activado. La política base es `user_id = auth.uid()`.

### Tablas del schema inicial (`schema.sql`)

**`users`** — Perfil público del usuario
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | FK → auth.users |
| nombre | TEXT | Se autocompletea con el email al registrarse |
| email | TEXT | |
| moneda_principal | TEXT | Default: 'ARS' |
| created_at | TIMESTAMPTZ | |

Trigger `on_auth_user_created`: al registrarse, crea automáticamente el perfil y 11 categorías por defecto.

**`categorias`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| nombre | TEXT | |
| emoji | TEXT | Default: '📦' |
| tipo | TEXT | CHECK: gasto / ingreso / ahorro |
| activa | BOOLEAN | Default: true |
| created_at | TIMESTAMPTZ | |

**`metas`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| nombre | TEXT | |
| emoji | TEXT | Default: '🎯' |
| monto_objetivo | NUMERIC | CHECK > 0 |
| fecha_objetivo | DATE | Opcional |
| archivada | BOOLEAN | Default: false |
| created_at | TIMESTAMPTZ | |

**`movimientos`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| tipo | TEXT | CHECK: gasto / ingreso / ahorro |
| categoria_id | UUID | FK → categorias (nullable, SET NULL on delete) |
| monto | NUMERIC | CHECK > 0 |
| concepto | TEXT | Descripción libre, default '' |
| fecha | DATE | Default CURRENT_DATE |
| meta_id | UUID | FK → metas (nullable, para ahorros vinculados) |
| created_at | TIMESTAMPTZ | |

Índice: `(user_id, fecha DESC)` para queries por mes.

**`presupuesto`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| categoria_id | UUID | FK → categorias. UNIQUE(user_id, categoria_id, mes) |
| monto_max | NUMERIC | CHECK > 0 |
| mes | DATE | Siempre primer día del mes: YYYY-MM-01 |
| created_at | TIMESTAMPTZ | |

Nota: para presupuesto general (sin categoría), `categoria_id` es NULL. El schema lo requiere NOT NULL pero el código lo usa como nullable — probablemente la columna se modificó después.

**`diccionario_personal`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| palabra_clave | TEXT | UNIQUE(user_id, palabra_clave) |
| categoria_id | UUID | FK → categorias |
| created_at | TIMESTAMPTZ | |

### Tablas de la migración (`supabase_migrations.sql`)

**`notificaciones`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| tipo | TEXT | CHECK: urgente / recordatorio / info / sistema |
| titulo | TEXT | |
| mensaje | TEXT | |
| emoji | TEXT | Default: '🔔' |
| accion_url | TEXT | Ruta interna (ej: '/presupuesto') |
| accion_data | JSONB | Datos extra opcionales |
| leida | BOOLEAN | Default: false |
| created_at | TIMESTAMPTZ | |

**`recordatorios`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| nombre | TEXT | |
| emoji | TEXT | Default: '🔔' |
| monto_estimado | NUMERIC | Opcional (para recordatorios de pagos) |
| categoria_sugerida_id | UUID | FK → categorias, nullable |
| frecuencia | TEXT | CHECK: unico / semanal / mensual / anual |
| dia | INTEGER | Día de semana (0-6) o del mes (1-31) |
| mes | INTEGER | Solo para frecuencia anual (1-12) |
| fecha_unica | DATE | Solo para frecuencia único |
| hora | TIME | Default: '09:00' |
| dias_anticipacion | INTEGER | Default: 0 (feature removida de UI, hardcodeado en 0) |
| activo | BOOLEAN | Default: true |
| proximo_aviso | TIMESTAMPTZ | Cuándo disparar la próxima notificación |
| created_at | TIMESTAMPTZ | |

**`push_subscriptions`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| endpoint | TEXT | URL del push service (único por device) |
| keys | JSONB | `{ p256dh, auth }` — claves VAPID del browser |
| device_info | TEXT | User agent |
| created_at | TIMESTAMPTZ | |

Índice único en `endpoint`.

**`reglas_sistema_log`**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| regla_id | TEXT | Ej: `presupuesto_excedido_<cat_id>_<mes>` |
| disparada_at | TIMESTAMPTZ | Default: now() |

Usado para cooldown de reglas automáticas (no repetir la misma alerta en N días).

**`reportes_mensuales`** — *No está en ningún archivo SQL del repo. Tabla creada manualmente en Supabase.*
| Columna | Tipo | Inferido del código |
|---------|------|---------------------|
| id | UUID PK | |
| user_id | UUID | |
| mes | DATE | Primer día del mes |
| contenido | TEXT | Texto Markdown del reporte |
| modelo_usado | TEXT | 'claude-sonnet-4-6' |
| generado_at | TIMESTAMPTZ | |

---

## 5. FEATURES IMPLEMENTADAS

### Auth
**Archivos:** `LoginPage.jsx`, `AuthContext.jsx`, `useAuth.js`
Login y signup con email/password via Supabase Auth. Rutas protegidas en `App.jsx`. Al registrarse, un trigger de PostgreSQL crea el perfil y las categorías por defecto. Estado: **funcionando**.

### Dashboard
**Archivos:** `DashboardPage.jsx`
- Balance del mes (ingresos - gastos - ahorro), con porcentaje de ahorro
- Tarjetas resumen: ingresos / gastos / ahorro
- Navegador de mes (← →), puede ver meses anteriores
- Cotización dólar blue en tiempo real (dolarapi.com, falla silenciosamente)
- Insights automáticos: alertas urgentes siempre visibles, resto colapsable
- Top 3 categorías de gasto con barra de progreso
- Últimos 5 movimientos con botón eliminar
- Pie chart de gastos por categoría (interactivo, toca para ver detalle)
- Bar chart de últimos 6 meses (ingresos/gastos/ahorro)
- Floating Action Button (+) que lleva a /registrar

Estado: **funcionando**.

### Registro manual
**Archivos:** `RegistrarPage.jsx`
Formulario para registrar gasto/ingreso/ahorro. Selección de categoría, monto, concepto, fecha. Si el tipo es ahorro, aparece selector de meta vinculada. Estado: **funcionando**.

### Historial de movimientos
**Archivos:** `MovimientosPage.jsx`
Lista completa de movimientos. Probablemente tiene filtros. Estado: **funcionando** (no se leyó en detalle).

### Chatbot Monedita
**Archivos:** `ChatbotPage.jsx`, `lib/parser.js`, `lib/diccionario.js`
Chat de lenguaje natural para registrar movimientos. Parser local detecta: tipo (gasto/ingreso/ahorro), monto (soporta $3.500, 3k, 50 mil), categoría (por diccionario base + diccionario personal del usuario). También responde a consultas del tipo "¿cómo voy este mes?". Si el parser no detecta categoría, pregunta al usuario. El usuario puede confirmar/editar antes de guardar. Aprende nuevas palabras clave (diccionario_personal). Chips rápidos para empezar a tipear. Estado: **funcionando**.

### Categorías
**Archivos:** `CategoriasPage.jsx`, `useCategorias.js`
CRUD de categorías. Cada una tiene nombre, emoji y tipo (gasto/ingreso/ahorro). Puede activarse/desactivarse. 11 categorías por defecto al registrarse. Estado: **funcionando**.

### Presupuesto mensual
**Archivos:** `PresupuestoPage.jsx`, `usePresupuesto.js`
Presupuesto general del mes y por categoría. Muestra barra de progreso (verde → amarillo → rojo según % usado). Si el presupuesto no existe para el mes, ofrece copiarlo del mes anterior. Estado: **funcionando**.

### Metas de ahorro
**Archivos:** `MetasPage.jsx`, `useMetas.js`
CRUD de metas. Cada meta tiene nombre, emoji, monto objetivo y fecha objetivo opcional. Muestra progreso de ahorro acumulado vinculado a la meta. Calcula cuánto ahorrar por mes para llegar a tiempo. Se puede archivar. Estado: **funcionando**.

### Recordatorios con push notifications
**Archivos:** `RecordatoriosPage.jsx`, `useRecordatorios.js`, `lib/evaluarReglas.js` (función `procesarRecordatorios`), `lib/pushService.js`, `PushPermiso.jsx`, `sw.js`, `supabase/functions/send-push/`, `supabase/functions/cron-check/`, `supabase/cron_recordatorios.sql`

Frecuencias: único / semanal / mensual / anual. Campos: nombre, emoji, monto estimado, hora, día/mes según frecuencia. Al activar la app se procesan recordatorios vencidos (client-side). El servidor también los procesa cada minuto via pg_cron → Edge Function `cron-check`.

Push notifications: Web Push API con VAPID. PushPermiso modal aparece a los 6s después de abrir la app. En iOS sin PWA instalada muestra instrucción de "Añadir a pantalla de inicio". Campana de notificaciones solo visible en desktop. Estado: **funcionando** (con limitación en iOS: push solo funciona con PWA instalada).

### Análisis e Insights
**Archivos:** `AnalisisPage.jsx`, `lib/insights.js`, `lib/ia-analyzer.js`, `ReporteMensual.jsx`, `HistorialReportes.jsx`, `useReportes.js`

**Insights locales** (sin IA, `insights.js`): 5 tipos de reglas locales — alertas de presupuesto (general y por categoría), ritmo de ahorro, comparación con mes anterior, patrón inusual semanal, proyección de metas. Aparecen en Dashboard (top 4) y en Análisis (todos, agrupados por tipo).

**Análisis IA** (`ia-analyzer.js`): llama directamente a `claude-sonnet-4-6` desde el browser con la API key del usuario. Límite de 3 generaciones por mes (guardadas en `reportes_mensuales`). El reporte se guarda y se puede ver historial de meses anteriores.

**Sección Análisis también incluye:**
- Comparativa vs mes anterior por categoría (con % de variación)
- Distribución semanal del gasto
- Evolución de tasa de ahorro últimos 6 meses (barras)

Estado: **funcionando**.

### Sistema de notificaciones in-app
**Archivos:** `useNotificaciones.js`, `NotifPanel.jsx`, `lib/evaluarReglas.js`

Panel de notificaciones deslizable desde la campana (solo desktop). Notificaciones in-app creadas por: recordatorios, reglas automáticas (presupuesto excedido, meta cumplida, etc.). Se pueden marcar como leídas, marcar todas, eliminar.

`evaluarReglas.js` ejecuta reglas automáticas con cooldown configurable por regla:
- Inicio de mes (día 1): sugerir presupuesto
- Presupuesto excedido (cooldown 3 días)
- Presupuesto al 80% (cooldown 3 días)
- Sin presupuesto a partir del día 25 (cooldown 7 días)
- Sin movimientos en 7+ días (cooldown 1 día)
- Meta cumplida (cooldown 999 días)
- Meta al 50% (cooldown 999 días)

Estado: **funcionando**.

### PWA instalable
**Archivos:** `src/sw.js`, `vite.config.js`, `public/icon-192.png`, `public/icon-512.png`, `index.html`
Solo activa en build de producción (no en dev). Precaching de assets estáticos. Push handler en SW. `autoUpdate` para nuevas versiones. Estado: **funcionando en producción**.

---

## 6. CONFIGURACIÓN Y VARIABLES DE ENTORNO

### `.env.local` (desarrollo + Vercel)

```
VITE_SUPABASE_URL        # URL del proyecto: Settings → API → Project URL
VITE_SUPABASE_ANON_KEY   # Clave anon pública: Settings → API → anon key
VITE_ANTHROPIC_API_KEY   # API key de Anthropic: console.anthropic.com
VITE_VAPID_PUBLIC_KEY    # Clave pública VAPID (generada con web-push)
```

### Secrets de Supabase Edge Functions
Configurar en Supabase Dashboard → Edge Functions → Secrets:
```
VAPID_PUBLIC_KEY    # Misma clave pública VAPID
VAPID_PRIVATE_KEY   # Clave privada VAPID (nunca commitear)
VAPID_SUBJECT       # mailto:tu@email.com
```

### Generar VAPID keys (si se recrean)
```bash
npx web-push generate-vapid-keys
```

---

## 7. COMANDOS DE DESARROLLO

```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo (http://localhost:5173)
npm run build        # Build de producción (activa PWA)
npm run preview      # Preview del build de producción
```

El SW (`sw.js`) solo se inyecta en `mode === 'production'`. En dev no hay SW.

---

## 8. DEPLOY

**Plataforma:** Vercel (CI/CD automático desde push a `main` en GitHub).

**Repo:** github.com/agusrojas2001-stack/misfinanzas

**Para deployar:** push a `main` → Vercel detecta el cambio y hace el build automáticamente.

**Variables de entorno en Vercel:** configurar las 4 variables de `.env.local` en Vercel Dashboard → Settings → Environment Variables.

**Edge Functions de Supabase:** deployar por separado con Supabase CLI:
```bash
supabase functions deploy send-push
supabase functions deploy cron-check
```

**pg_cron:** ejecutar el SQL de `supabase/cron_recordatorios.sql` en el SQL Editor de Supabase (una sola vez).

---

## 9. CONVENCIONES Y DECISIONES DE DISEÑO

**Naming:**
- Componentes: PascalCase (`BottomNav.jsx`, `InsightCard.jsx`)
- Hooks: camelCase con prefijo `use` (`useMovimientos`, `usePresupuesto`)
- Utilidades / lib: camelCase (`parsearMensaje`, `calcularInsights`, `generarAnalisis`)
- Variables de entorno: `VITE_` prefix para acceso desde el cliente

**Estado:**
- Estado de sesión global: `AuthContext` (user + perfil)
- Datos de Supabase: en hooks custom con estado local + función `refetch`
- Preferencias de UI: `localStorage` (`lastEvalReglas`, `pushDecision`)
- Navegación y modales: estado local en los componentes de página

**Diseño:**
- Siempre dark mode (`bg-zinc-950` fondo, `bg-zinc-900` cards)
- Acento: `violet-500/600`
- Positivo/ingresos: `emerald-400`
- Negativo/gastos: `rose-400`
- Ahorro: `violet-400`
- Fuente moneda: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`
- Safe areas PWA: `.safe-top` y `.safe-bottom` para iPhone con notch
- Clases reutilizables: `.card`, `.input-dark`, `.btn-primary`, `.btn-secondary` en `index.css`

**Prevención de bugs móviles:**
- `font-size: 1rem` en todos los inputs (evita zoom automático en Safari iOS)
- `touch-action: none` en `input[type="range"]`
- `-webkit-appearance: none` en `input[type="date"]` y `input[type="time"]`
- `document.body.style.overflow = 'hidden'` cuando modal o drawer están abiertos
- `viewport-fit=cover` en index.html para notch

---

## 10. BUGS CONOCIDOS Y LIMITACIONES

1. **API key de Anthropic en el browser:** `VITE_ANTHROPIC_API_KEY` queda en el bundle del frontend. Aceptable para uso personal, inaceptable si hay más usuarios. Solución: mover `generarAnalisis` a una Edge Function de Supabase.

2. **`MenuDrawer.jsx` y `Header.jsx` sin usar:** existen en `src/components/Layout/` pero no se importan desde ningún lado. El drawer está inline en `Layout.jsx`. Son código muerto.

3. **`reportes_mensuales` sin migración en repo:** la tabla existe en Supabase pero no hay SQL para crearla en el repo. Si alguien clona el proyecto, falta esa tabla.

4. **`presupuesto.categoria_id` en schema vs código:** el schema define `categoria_id NOT NULL`, pero el código usa `categoria_id = null` para presupuesto general. La tabla real en Supabase probablemente tiene la columna como nullable.

5. **Push notifications en iOS:** solo funcionan si la app está instalada como PWA (añadida a pantalla de inicio). Safari no soporta Web Push sin instalación.

6. **Recordatorios existentes no se actualizan solos:** si se corrige la lógica de `calcularProximoAviso`, los recordatorios ya existentes en la DB mantienen el `proximo_aviso` viejo. Hay que eliminarlos y volver a crearlos.

7. **`MenuPage.jsx`:** existe como página en la ruta `/menu` pero parece ser un residuo legacy. El menú real está en el drawer de `Layout.jsx`.

---

## 11. FEATURES PENDIENTES O IDEAS

- **Mover IA a Edge Function:** proteger la API key de Anthropic moviéndola a `supabase/functions/analizar-mes/index.ts`.
- **Editar movimientos:** actualmente solo se pueden eliminar. Agregar botón "editar" con el mismo formulario de RegistrarPage.
- **Exportar datos:** CSV o PDF del historial de movimientos por mes.
- **Notificaciones in-app en mobile:** la campana está oculta en mobile. Considerar mostrar un badge en el ícono del menú hamburguesa o una pestaña en la BottomNav.
- **Modo multi-moneda:** el campo `moneda_principal` en `users` existe pero no se usa. Hay margen para soportar USD/EUR.
- **Recordatorios recurrentes con confirmación:** al disparar un recordatorio, ofrecer "registrarlo como movimiento" directamente desde la notificación.
- **Widget de balance:** en iOS 16+ se pueden agregar widgets con Service Worker. Puede ser un plus de PWA.
- **Limpieza de `reglas_sistema_log`:** los logs se acumulan sin nunca borrarse. A largo plazo puede crecer mucho.
- **Soporte offline parcial:** el SW precachea los assets estáticos pero no los datos de Supabase. Una caché de los últimos datos permitiría ver el dashboard sin conexión.
