-- ============================================================
-- PlantID — SQL 4 de 4: permite salvar no catálogo as fichas geradas pela IA
-- Cole no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.
-- ============================================================

ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS aliases text;

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa LOGADA pode salvar uma ficha, mas só se ela for marcada como
-- gerada por IA (ninguém consegue alterar ou apagar as fichas do catálogo).
DROP POLICY IF EXISTS plantid_plants_insert_ai ON public.plants;
CREATE POLICY plantid_plants_insert_ai ON public.plants
  FOR INSERT TO authenticated
  WITH CHECK (ai_generated = true);
