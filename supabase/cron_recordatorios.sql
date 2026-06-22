-- Correr este SQL en Supabase → SQL Editor
-- Requiere que pg_cron y pg_net estén habilitados (están en todos los planes)

-- 1. Habilitar extensiones (si no están ya)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Cron que corre cada 5 minutos y llama a la Edge Function send-push
--    para cada usuario con recordatorios vencidos
select cron.schedule(
  'check-recordatorios',     -- nombre del job (único)
  '*/5 * * * *',             -- cada 5 minutos
  $$
  -- Para cada usuario con recordatorios vencidos:
  -- 1. Insertar notificación en la tabla
  -- 2. Llamar a la Edge Function con pg_net

  with pendientes as (
    select
      r.id,
      r.user_id,
      r.nombre,
      r.emoji,
      r.monto_estimado,
      r.frecuencia,
      r.dia,
      r.mes,
      r.fecha_unica,
      r.hora,
      r.dias_anticipacion
    from recordatorios r
    where r.activo = true
      and r.proximo_aviso <= now()
      and r.proximo_aviso is not null
  ),
  insertadas as (
    insert into notificaciones (user_id, tipo, emoji, titulo, mensaje, accion_url)
    select
      p.user_id,
      'recordatorio',
      coalesce(p.emoji, '🔔'),
      p.nombre,
      case
        when p.monto_estimado is not null
        then 'Recordatorio programado (~$' || p.monto_estimado::text || ').'
        else 'Recordatorio programado.'
      end,
      '/recordatorios'
    from pendientes p
    returning user_id, titulo, mensaje, emoji, accion_url
  )
  -- Llamar Edge Function por cada notificación creada
  select
    net.http_post(
      url     := (select value from vault.secrets where name = 'supabase_url') || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select value from vault.secrets where name = 'supabase_anon_key')
      ),
      body    := jsonb_build_object(
        'user_id', i.user_id,
        'titulo',  i.titulo,
        'mensaje', i.mensaje,
        'emoji',   i.emoji,
        'url',     i.accion_url
      )
    )
  from insertadas i;

  -- Actualizar proximo_aviso de los recordatorios procesados
  -- (simplificado: poner NULL para únicos, NULL para los demás hasta próxima evaluación)
  update recordatorios
  set proximo_aviso = null
  where activo = true
    and proximo_aviso <= now()
    and proximo_aviso is not null;
  $$
);

-- Para ver los jobs existentes:
-- select * from cron.job;

-- Para eliminar este job si algo falla:
-- select cron.unschedule('check-recordatorios');
