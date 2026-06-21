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
