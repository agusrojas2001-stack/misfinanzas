-- ============================================================
-- MIGRACIÓN: Sistema de Notificaciones y Recordatorios
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. TABLA: notificaciones
-- ============================================================
create table if not exists notificaciones (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tipo            text not null default 'sistema'
                    check (tipo in ('urgente', 'recordatorio', 'info', 'sistema')),
  titulo          text not null,
  mensaje         text not null,
  emoji           text not null default '🔔',
  accion_url      text,
  accion_data     jsonb,
  leida           boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table notificaciones enable row level security;

create policy "notificaciones_user_policy"
  on notificaciones
  for all
  using (user_id = auth.uid());

-- Índice para buscar no leídas rápido
create index if not exists notificaciones_user_leida_idx
  on notificaciones (user_id, leida, created_at desc);


-- 2. TABLA: recordatorios
-- ============================================================
create table if not exists recordatorios (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  nombre                text not null,
  emoji                 text not null default '🔔',
  monto_estimado        numeric,
  categoria_sugerida_id uuid references categorias(id) on delete set null,
  frecuencia            text not null default 'mensual'
                          check (frecuencia in ('unico', 'semanal', 'mensual', 'anual')),
  dia                   integer,
  mes                   integer,
  fecha_unica           date,
  hora                  time not null default '09:00',
  dias_anticipacion     integer not null default 0,
  activo                boolean not null default true,
  proximo_aviso         timestamptz,
  created_at            timestamptz not null default now()
);

alter table recordatorios enable row level security;

create policy "recordatorios_user_policy"
  on recordatorios
  for all
  using (user_id = auth.uid());

-- Índice para buscar recordatorios activos con proximo_aviso pasado
create index if not exists recordatorios_activo_aviso_idx
  on recordatorios (user_id, activo, proximo_aviso);


-- 3. TABLA: push_subscriptions
-- ============================================================
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  keys        jsonb not null,
  device_info text,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_user_policy"
  on push_subscriptions
  for all
  using (user_id = auth.uid());

-- Unicidad por endpoint para no duplicar suscripciones
create unique index if not exists push_subscriptions_endpoint_idx
  on push_subscriptions (endpoint);


-- 4. TABLA: reglas_sistema_log
-- ============================================================
create table if not exists reglas_sistema_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  regla_id     text not null,
  disparada_at timestamptz not null default now()
);

alter table reglas_sistema_log enable row level security;

create policy "reglas_sistema_log_user_policy"
  on reglas_sistema_log
  for all
  using (user_id = auth.uid());

-- Índice para lookup rápido de reglas por usuario
create index if not exists reglas_sistema_log_user_regla_idx
  on reglas_sistema_log (user_id, regla_id, disparada_at desc);


-- ============================================================
-- MIGRACIÓN: Reportes mensuales (Resumen de Monedita IA)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 5. TABLA: reportes_mensuales
-- Un solo reporte por usuario por mes (UNIQUE user_id + mes).
-- Inmutable una vez generado: no se sobreescribe, se archiva.
-- ============================================================
create table if not exists reportes_mensuales (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,

  -- Mes al que corresponde el reporte, siempre día 1 (ej: 2025-07-01)
  mes              date        not null,

  -- Markdown generado por Claude
  contenido        text        not null,

  -- Modelo de IA usado para poder comparar calidad entre versiones
  modelo_usado     text        not null default 'claude-sonnet-4-6',

  -- Cuándo se generó
  generado_at      timestamptz not null default now(),

  -- Nota libre que el usuario escribe antes de pedir el análisis
  -- (ej: "este mes tuve gasto extra por mudanza")
  contexto_usuario text,

  -- Preguntas que la IA le hizo al usuario + sus respuestas
  -- Estructura: [{ "pregunta": "...", "respuesta": "..." }, ...]
  preguntas        jsonb,

  -- Snapshot de los números del mes al momento de generar
  -- (para comparar meses futuros sin recalcular)
  -- Estructura: { ingresos, gastos, ahorro, balance, gastos_por_categoria: [...] }
  resumen_datos    jsonb,

  -- Un solo reporte por mes por usuario
  unique (user_id, mes)
);

alter table reportes_mensuales enable row level security;

create policy "reportes_mensuales_user_policy"
  on reportes_mensuales
  for all
  using (user_id = auth.uid());

-- Índice para listar reportes de un usuario del más reciente al más viejo
create index if not exists reportes_mensuales_user_mes_idx
  on reportes_mensuales (user_id, mes desc);
