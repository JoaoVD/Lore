-- migrations/add_google_drive_integration.sql
-- Executar no Supabase SQL Editor

-- 1. Tabela de credenciais OAuth por usuário/provedor
--    Armazena access_token, refresh_token e expiração.
--    Unique em (user_id, provider) — um registro por provedor por usuário.
CREATE TABLE IF NOT EXISTS public.integrations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider      TEXT        NOT NULL,           -- ex: "google_drive"
    access_token  TEXT        NOT NULL,
    refresh_token TEXT,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_provider
    ON public.integrations (user_id, provider);


-- 2. Tabela de vinculação de pastas/fontes a projetos
--    Um projeto pode ter no máximo uma integração por provedor.
CREATE TABLE IF NOT EXISTS public.project_integrations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    provider       TEXT        NOT NULL,           -- ex: "google_drive"
    folder_id      TEXT        NOT NULL,           -- ID da pasta no Drive
    folder_name    TEXT        NOT NULL,
    last_synced_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_project_integrations_project
    ON public.project_integrations (project_id);


-- 3. Coluna source_id em documents para rastrear arquivos sincronizados do Drive
--    Nullable — preenchida apenas para documentos vindos de integrações externas.
--    Permite deduplicação: se source_id já existe para o projeto, não reingesta.
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_source_id
    ON public.documents (project_id, source_id)
    WHERE source_id IS NOT NULL;
