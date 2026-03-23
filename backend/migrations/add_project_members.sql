-- migrations/add_project_members.sql
-- Executar no Supabase SQL Editor

-- 1. Cria a tabela de membros de projetos
CREATE TABLE IF NOT EXISTS public.project_members (
    project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- 2. Índice para busca por usuário (list_projects)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id
    ON public.project_members (user_id);

-- 3. Migração de projetos existentes: registra todos os donos atuais como "owner"
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, user_id, 'owner'
FROM   public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4. (Opcional) Função RPC para buscar user_id por e-mail de forma eficiente.
--    Usada como alternativa ao list_users() do SDK em bases com muitos usuários.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
$$;
