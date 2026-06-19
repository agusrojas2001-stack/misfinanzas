import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '⚠️  Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.\n' +
    'Creá el archivo .env.local con esas variables y reiniciá el servidor.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
