-- ============================================================
-- MisFinanzas — Schema completo de Supabase
-- Correr en: Supabase Dashboard → SQL Editor → New Query
-- Pegá TODO este bloque y ejecutá de una sola vez
-- ============================================================


-- ============================================================
-- 1. TABLA: users (perfil público, extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL DEFAULT '',
  email           TEXT,
  moneda_principal TEXT DEFAULT 'ARS',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);


-- ============================================================
-- 2. TABLA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '📦',
  tipo        TEXT NOT NULL CHECK (tipo IN ('gasto', 'ingreso', 'ahorro')),
  activa      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select_own" ON public.categorias
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "categorias_insert_own" ON public.categorias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categorias_update_own" ON public.categorias
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "categorias_delete_own" ON public.categorias
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 3. TABLA: metas (antes que movimientos por la FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.metas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  emoji           TEXT DEFAULT '🎯',
  monto_objetivo  NUMERIC NOT NULL CHECK (monto_objetivo > 0),
  fecha_objetivo  DATE,
  archivada       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_select_own" ON public.metas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "metas_insert_own" ON public.metas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "metas_update_own" ON public.metas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "metas_delete_own" ON public.metas
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 4. TABLA: movimientos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movimientos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('gasto', 'ingreso', 'ahorro')),
  categoria_id  UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  monto         NUMERIC NOT NULL CHECK (monto > 0),
  concepto      TEXT DEFAULT '',
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  meta_id       UUID REFERENCES public.metas(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimientos_select_own" ON public.movimientos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "movimientos_insert_own" ON public.movimientos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "movimientos_update_own" ON public.movimientos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "movimientos_delete_own" ON public.movimientos
  FOR DELETE USING (auth.uid() = user_id);

-- Índice para acelerar queries por mes
CREATE INDEX IF NOT EXISTS idx_movimientos_user_fecha
  ON public.movimientos(user_id, fecha DESC);


-- ============================================================
-- 5. TABLA: presupuesto
-- ============================================================
CREATE TABLE IF NOT EXISTS public.presupuesto (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id  UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  monto_max     NUMERIC NOT NULL CHECK (monto_max > 0),
  mes           DATE NOT NULL, -- siempre primer día del mes: YYYY-MM-01
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, categoria_id, mes)
);

ALTER TABLE public.presupuesto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presupuesto_select_own" ON public.presupuesto
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "presupuesto_insert_own" ON public.presupuesto
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presupuesto_update_own" ON public.presupuesto
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "presupuesto_delete_own" ON public.presupuesto
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 6. TABLA: diccionario_personal (chatbot Monedita)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diccionario_personal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  palabra_clave TEXT NOT NULL,
  categoria_id  UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, palabra_clave)
);

ALTER TABLE public.diccionario_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diccionario_select_own" ON public.diccionario_personal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "diccionario_insert_own" ON public.diccionario_personal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diccionario_update_own" ON public.diccionario_personal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "diccionario_delete_own" ON public.diccionario_personal
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 7. FUNCIÓN + TRIGGER: al registrarse, crear perfil y
--    categorías por defecto automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Perfil público
  INSERT INTO public.users (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  -- Categorías por defecto
  INSERT INTO public.categorias (user_id, nombre, emoji, tipo) VALUES
    (NEW.id, 'Comida',          '🍔', 'gasto'),
    (NEW.id, 'Vivienda',        '🏠', 'gasto'),
    (NEW.id, 'Servicios',       '💡', 'gasto'),
    (NEW.id, 'Transporte',      '🚗', 'gasto'),
    (NEW.id, 'Entretenimiento', '🎬', 'gasto'),
    (NEW.id, 'Salud',           '💊', 'gasto'),
    (NEW.id, 'Deudas',          '💳', 'gasto'),
    (NEW.id, 'Otros',           '📦', 'gasto'),
    (NEW.id, 'Sueldo',          '💰', 'ingreso'),
    (NEW.id, 'Freelance',       '💻', 'ingreso'),
    (NEW.id, 'Ahorro',          '🏦', 'ahorro');

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
