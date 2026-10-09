import { createClient } from "@supabase/supabase-js";

// Essas duas informações vêm do arquivo .env (veja o .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env"
  );
} else {
  // Diagnóstico leve (não expõe a chave inteira) — ajuda a confirmar em
  // produção se as variáveis realmente chegaram no build.
  console.info(
    `[PlantID] Supabase configurado: URL=${supabaseUrl.slice(0, 20)}... / ANON_KEY termina em ...${supabaseAnonKey.slice(-6)}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
