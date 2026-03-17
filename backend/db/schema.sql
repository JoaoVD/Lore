-- =============================================================================
-- schema.sql
-- Execute no SQL Editor do Supabase (dashboard.supabase.com → SQL Editor)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Extensão UUID (já habilitada por padrão no Supabase)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ---------------------------------------------------------------------------
-- TABELA: projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    description TEXT        CHECK (char_length(description) <= 500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê apenas seus projetos"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuário cria seus próprios projetos"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza apenas seus projetos"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuário deleta apenas seus projetos"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- TABELA: documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name     TEXT        NOT NULL,
    file_url      TEXT        NOT NULL,
    chunks_count  INT         NOT NULL DEFAULT 0,
    status        TEXT        NOT NULL DEFAULT 'processing'
                              CHECK (status IN ('processing', 'ready', 'error')),
    error_message TEXT,                              -- preenchido apenas quando status='error'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração para tabelas existentes (idempotente)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS
    status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'error'));
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS
    error_message TEXT;

CREATE INDEX IF NOT EXISTS documents_project_id_idx ON public.documents(project_id);

-- RLS: acesso restrito ao dono do projeto pai
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê documentos de seus projetos"
    ON public.documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = documents.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuário insere documentos em seus projetos"
    ON public.documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = documents.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuário deleta documentos de seus projetos"
    ON public.documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = documents.project_id
              AND p.user_id = auth.uid()
        )
    );


-- ---------------------------------------------------------------------------
-- TABELA: chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    sources     JSONB       NOT NULL DEFAULT '[]',  -- [{file_name, page_number, score}]
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_project_id_idx ON public.chat_messages(project_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);

-- RLS: acesso restrito ao dono do projeto pai
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê mensagens de seus projetos"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = chat_messages.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuário insere mensagens em seus projetos"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = chat_messages.project_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuário deleta mensagens de seus projetos"
    ON public.chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = chat_messages.project_id
              AND p.user_id = auth.uid()
        )
    );


-- ---------------------------------------------------------------------------
-- SUPABASE STORAGE: bucket para documentos
-- (execute separadamente se preferir criar via dashboard)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,                         -- privado: acesso apenas via service_role ou signed URL
    20971520,                      -- 20 MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS no Storage: apenas o dono da pasta pode ver/inserir/deletar
CREATE POLICY "storage: usuário acessa própria pasta"
    ON storage.objects FOR ALL
    USING  (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------
-- TABELA: subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    status                  TEXT        NOT NULL DEFAULT 'inactive'
                                        CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'inactive')),
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx       ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_idx ON public.subscriptions(stripe_subscription_id);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Coluna plan: identifica o plano contratado ('free', 'pro', 'business')
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'business'));

CREATE POLICY "Usuário vê apenas sua assinatura"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- TABELA: usage_logs
-- Rastreia ações de uso (perguntas, uploads, criação de projetos) por usuário.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action     TEXT        NOT NULL CHECK (action IN ('question', 'document_upload', 'project_create')),
    project_id UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx    ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS usage_logs_action_idx     ON public.usage_logs(action);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON public.usage_logs(created_at);

-- RLS: usuário vê apenas seus próprios logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê apenas seus usage_logs"
    ON public.usage_logs FOR SELECT
    USING (auth.uid() = user_id);
