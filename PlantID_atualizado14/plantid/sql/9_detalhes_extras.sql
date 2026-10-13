-- ============================================================
-- PlantID — SQL 9: texto "Sobre" mais completo (detalhes extras da planta)
-- Rode DEPOIS dos SQLs 1 a 4. Cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar mais de uma vez.
--
-- O que faz:
--  1) cria a coluna "extra_details" (origem, curiosidade, dicas, problemas
--     comuns e como multiplicar), que a IA preenche;
--  2) deixa uma pessoa LOGADA preencher essa coluna UMA ÚNICA VEZ por planta
--     (botão "Ver mais detalhes com IA"); depois disso ela aparece para todos
--     e ninguém consegue sobrescrever;
--  3) continua proibindo qualquer outra alteração nas plantas.
-- ============================================================

ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS extra_details jsonb;

-- Ninguém (logado ou não) altera colunas da tabela, exceto a extra_details.
REVOKE UPDATE ON public.plants FROM anon, authenticated;
GRANT UPDATE (extra_details) ON public.plants TO authenticated;

DROP POLICY IF EXISTS plantid_plants_fill_extra ON public.plants;
CREATE POLICY plantid_plants_fill_extra ON public.plants
  FOR UPDATE TO authenticated
  USING (extra_details IS NULL)              -- só planta que ainda não tem detalhes
  WITH CHECK (extra_details IS NOT NULL);    -- e só para preencher, não para apagar
