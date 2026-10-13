import { createClient } from "@supabase/supabase-js";

// Essas duas informações vêm do arquivo .env (veja o .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
