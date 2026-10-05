-- ============================================================
-- Correção de favoritos, lembretes e IDs da Perenual
-- Execute no SQL Editor do Supabase uma única vez.
-- ============================================================

-- A Perenual usa IDs numéricos e o catálogo local usa IDs UUID.
-- O campo precisa aceitar os dois formatos como texto.
ALTER TABLE public.user_plants
  ALTER COLUMN plant_id TYPE text USING plant_id::text;

ALTER TABLE public.user_plants
  DROP CONSTRAINT IF EXISTS user_plants_plant_id_fkey;

-- Garante que cada usuário possa ler e alterar apenas os próprios favoritos.
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plants'
      AND policyname = 'plantid_user_plants_select_own'
  ) THEN
    CREATE POLICY plantid_user_plants_select_own
      ON public.user_plants FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plants'
      AND policyname = 'plantid_user_plants_insert_own'
  ) THEN
    CREATE POLICY plantid_user_plants_insert_own
      ON public.user_plants FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plants'
      AND policyname = 'plantid_user_plants_update_own'
  ) THEN
    CREATE POLICY plantid_user_plants_update_own
      ON public.user_plants FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plants'
      AND policyname = 'plantid_user_plants_delete_own'
  ) THEN
    CREATE POLICY plantid_user_plants_delete_own
      ON public.user_plants FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Os lembretes também precisam aceitar leitura, criação, alteração e remoção
-- apenas pelo usuário autenticado que os criou.
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'plantid_reminders_select_own'
  ) THEN
    CREATE POLICY plantid_reminders_select_own
      ON public.reminders FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'plantid_reminders_insert_own'
  ) THEN
    CREATE POLICY plantid_reminders_insert_own
      ON public.reminders FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'plantid_reminders_update_own'
  ) THEN
    CREATE POLICY plantid_reminders_update_own
      ON public.reminders FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reminders'
      AND policyname = 'plantid_reminders_delete_own'
  ) THEN
    CREATE POLICY plantid_reminders_delete_own
      ON public.reminders FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
