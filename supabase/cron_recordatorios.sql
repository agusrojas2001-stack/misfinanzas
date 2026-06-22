-- Correr en Supabase → SQL Editor
-- Llama a la Edge Function cron-check cada minuto para enviar pushes exactos

-- 1. Habilitar extensiones (ya vienen en todos los proyectos Supabase)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Programar el cron cada minuto
--    Reemplazá YOUR_PROJECT_REF con tu Reference ID (Settings → General)
--    Reemplazá YOUR_ANON_KEY con tu anon public key (Settings → API)
select cron.schedule(
  'cron-check-recordatorios',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cron-check',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Para verificar que el job quedó registrado:
-- select * from cron.job;

-- Para eliminar el job:
-- select cron.unschedule('cron-check-recordatorios');
