-- ============================================================
-- PlantID — SQL 1 de 3: estrutura das tabelas + permissões (RLS)
-- Cole TUDO no SQL Editor do Supabase e clique em Run.
-- É seguro rodar mais de uma vez (não apaga dados).
-- ============================================================

-- ---------- 1) user_plants (Minhas Plantas / favoritos) ----------
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS plant_name text;
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS plant_image text;
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS scientific_name text;

-- plant_id precisa aceitar texto: a Perenual usa números ("155") e o
-- catálogo local usa "local:<uuid>". Antes era uuid, e isso dava erro 400.
ALTER TABLE public.user_plants DROP CONSTRAINT IF EXISTS user_plants_plant_id_fkey;
ALTER TABLE public.user_plants ALTER COLUMN plant_id TYPE text USING plant_id::text;

ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plantid_user_plants_select_own ON public.user_plants;
DROP POLICY IF EXISTS plantid_user_plants_insert_own ON public.user_plants;
DROP POLICY IF EXISTS plantid_user_plants_update_own ON public.user_plants;
DROP POLICY IF EXISTS plantid_user_plants_delete_own ON public.user_plants;
CREATE POLICY plantid_user_plants_select_own ON public.user_plants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY plantid_user_plants_insert_own ON public.user_plants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY plantid_user_plants_update_own ON public.user_plants
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY plantid_user_plants_delete_own ON public.user_plants
  FOR DELETE USING (auth.uid() = user_id);

-- ---------- 2) reminders (Agenda) ----------
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plantid_reminders_select_own ON public.reminders;
DROP POLICY IF EXISTS plantid_reminders_insert_own ON public.reminders;
DROP POLICY IF EXISTS plantid_reminders_update_own ON public.reminders;
DROP POLICY IF EXISTS plantid_reminders_delete_own ON public.reminders;
CREATE POLICY plantid_reminders_select_own ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY plantid_reminders_insert_own ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY plantid_reminders_update_own ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY plantid_reminders_delete_own ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- ---------- 3) plants (catálogo local) — todo mundo pode LER ----------
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plantid_plants_read_all ON public.plants;
CREATE POLICY plantid_plants_read_all ON public.plants
  FOR SELECT USING (true);

-- ---------- 4) plant_requests (buscas sem resultado) ----------
CREATE TABLE IF NOT EXISTS public.plant_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  search_term text NOT NULL,
  request_count int8 NOT NULL DEFAULT 1
);
ALTER TABLE public.plant_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert plant_requests" ON public.plant_requests;
DROP POLICY IF EXISTS plantid_plant_requests_insert ON public.plant_requests;
CREATE POLICY plantid_plant_requests_insert ON public.plant_requests
  FOR INSERT TO public WITH CHECK (true);

-- Ranking das plantas mais procuradas que ainda não temos
-- (veja em Table Editor > plant_requests_ranking).
DROP VIEW IF EXISTS public.plant_requests_ranking;
CREATE VIEW public.plant_requests_ranking WITH (security_invoker = true) AS
  SELECT lower(trim(search_term)) AS planta_procurada,
         sum(request_count) AS vezes_procurada,
         max(created_at) AS ultima_busca
  FROM public.plant_requests
  GROUP BY lower(trim(search_term))
  ORDER BY vezes_procurada DESC;

-- ---------- 5) contact_messages (Contato e Suporte) ----------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS plantid_contact_insert ON public.contact_messages;
CREATE POLICY plantid_contact_insert ON public.contact_messages
  FOR INSERT TO public WITH CHECK (true);
