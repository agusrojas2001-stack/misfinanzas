# MisFinanzas — Documentación del proyecto

App de finanzas personales. React + Vite + Tailwind + Supabase.

## Stack

| Capa        | Tecnología                         |
|-------------|------------------------------------|
| Frontend    | React 18 + Vite 5                  |
| Estilos     | Tailwind CSS 3 (dark mode: `class`)|
| Routing     | react-router-dom v6                |
| Backend/DB  | Supabase (PostgreSQL + Auth + RLS) |
| Gráficos    | Recharts                           |
| PWA         | vite-plugin-pwa                    |
| Deploy      | Vercel                             |
| Iconos      | Emojis nativos (sin dependencias)  |

## Correr localmente

```bash
npm install
cp .env.example .env.local   # completar con credenciales Supabase
npm run dev
```

App disponible en http://localhost:5173

## Estructura de carpetas

```
src/
├── components/
│   └── Layout/
│       ├── BottomNav.jsx   # Navegación inferior fija (5 tabs)
│       ├── Header.jsx      # Encabezado reutilizable de página
│       └── Layout.jsx      # Wrapper que envuelve Outlet + BottomNav
├── hooks/
│   ├── useAuth.js          # Sesión de usuario vía Supabase Auth
│   └── useMovimientos.js   # Movimientos filtrados por mes
├── lib/
│   ├── supabase.js         # Cliente Supabase singleton
│   ├── parser.js           # Parser NLP local para el chatbot
│   └── diccionario.js      # Palabras clave → categorías (base)
├── pages/
│   ├── DashboardPage.jsx   # Vista principal con resumen del mes
│   ├── RegistrarPage.jsx   # Formulario de movimiento manual
│   ├── ChatbotPage.jsx     # Chat con Monedita (parser local)
│   ├── MetasPage.jsx       # Metas de ahorro con progreso
│   ├── MenuPage.jsx        # Categorías, presupuesto, perfil, logout
│   └── LoginPage.jsx       # Login con Supabase Auth
├── App.jsx                 # Router principal + rutas protegidas
├── main.jsx                # Entry point React
└── index.css               # Tailwind base + utilidades custom
```

## Convenciones de naming

- **Componentes**: PascalCase (`BottomNav.jsx`, `SaldoCard`)
- **Hooks**: camelCase con prefijo `use` (`useAuth`, `useMovimientos`)
- **Utilidades / lib**: camelCase (`parsearMensaje`, `formatARS`)
- **Variables de entorno**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Clases Tailwind custom**: definidas en `index.css` como `@layer components`

## Diseño

- **Modo**: oscuro por defecto (`class="dark"` en `<html>`)
- **Fondo**: `bg-zinc-950` (main) / `bg-zinc-900` (cards)
- **Acento primario**: `violet-500/600`
- **Positivo / ingresos**: `emerald-400`
- **Negativo / gastos**: `rose-400`
- **Ahorro**: `violet-400`
- **Bordes**: `border-zinc-800` (normal) / `border-zinc-700` (hover)
- **Safe areas PWA**: `.safe-top` y `.safe-bottom` en `index.css`

## Clases CSS reutilizables (index.css)

| Clase           | Uso                                   |
|-----------------|---------------------------------------|
| `.card`         | Contenedor base (bg zinc-900 + borde) |
| `.input-dark`   | Input estilizado para modo oscuro     |
| `.btn-primary`  | Botón violeta principal               |
| `.btn-secondary`| Botón secundario gris                 |
| `.page-enter`   | Animación fade+slide al entrar        |
| `.safe-top`     | `padding-top: env(safe-area-inset-top)` |
| `.safe-bottom`  | `padding-bottom: env(safe-area-inset-bottom)` |

## Schema de Supabase

### Tablas

- **users** — Extiende `auth.users`. Campos: `id`, `nombre`, `email`, `moneda_principal`
- **categorias** — `id`, `user_id`, `nombre`, `emoji`, `tipo` (enum: gasto/ingreso/ahorro), `activa`
- **movimientos** — `id`, `user_id`, `tipo`, `categoria_id`, `monto`, `concepto`, `fecha`, `meta_id`
- **presupuesto** — `id`, `user_id`, `categoria_id`, `monto_max`, `mes` (YYYY-MM-01)
- **metas** — `id`, `user_id`, `nombre`, `emoji`, `monto_objetivo`, `fecha_objetivo`, `archivada`
- **diccionario_personal** — `id`, `user_id`, `palabra_clave`, `categoria_id`

Todas las tablas tienen **Row Level Security** activada:
`user_id = auth.uid()`

## Orden de desarrollo

1. ✅ Setup base (Vite + React + Tailwind + estructura)
2. ⬜ Supabase conectado (tablas + RLS)
3. ⬜ Auth (login / signup / logout)
4. ⬜ Categorías (CRUD)
5. ⬜ Registro manual de movimientos
6. ⬜ Dashboard con datos reales
7. ⬜ Chatbot Monedita (parser + guardado)
8. ⬜ Gráficos (pie + barras evolución)
9. ⬜ Presupuesto mensual
10. ⬜ Metas de ahorro
11. ⬜ PWA instalable + offline
12. ⬜ Deploy en Vercel

## Agregar una feature nueva

1. Si necesita datos → agregar tabla en Supabase con RLS
2. Si necesita estado global → crear hook en `src/hooks/`
3. Pantalla nueva → crear página en `src/pages/` y registrar ruta en `App.jsx`
4. Componente reutilizable → crear en `src/components/` en subcarpeta por dominio
5. Nunca poner lógica de negocio dentro de los componentes de Layout

## Variables de entorno

```
VITE_SUPABASE_URL       — URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY  — Clave anon pública de Supabase
```

Crear `.env.local` (nunca commitear al repo).
