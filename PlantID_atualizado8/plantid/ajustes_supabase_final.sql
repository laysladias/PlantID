-- ============================================================
-- PASSO 1 — Corrigir a coluna plant_id (motivo real do "não favorita")
-- Antes, só removemos a foreign key, mas a coluna continuou sendo do
-- tipo uuid. A Perenual usa números simples (ex: "155"), que não são
-- um uuid válido — por isso o erro. Agora trocamos o tipo da coluna
-- para texto puro, que aceita qualquer valor.
-- ============================================================
ALTER TABLE user_plants ALTER COLUMN plant_id TYPE text USING plant_id::text;

-- Garantir que a foreign key antiga não existe mais (caso não tenha sido
-- removida antes). Seguro rodar de novo mesmo se já não existir.
ALTER TABLE user_plants DROP CONSTRAINT IF EXISTS user_plants_plant_id_fkey;

-- ============================================================
-- PASSO 2 — Catálogo local de flores/plantas comuns (fallback)
-- Ver arquivo catalogo_local.sql — rode ele também, nessa ordem.
-- ============================================================
