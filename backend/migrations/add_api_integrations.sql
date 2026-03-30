-- Migração: integração com API REST genérica por projeto
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS api_integrations (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
    name            text NOT NULL,                       -- ex: "Estoque Bling"
    base_url        text NOT NULL,                       -- ex: "https://api.bling.com.br/v3"
    auth_type       text NOT NULL DEFAULT 'api_key',     -- 'api_key' | 'bearer' | 'basic'
    auth_header     text NOT NULL DEFAULT 'Authorization',
    auth_value      text NOT NULL,                       -- token/chave de autenticação
    endpoint_stock  text NOT NULL,                       -- ex: "/produtos?nome={query}"
    response_path   text NOT NULL DEFAULT 'data',        -- caminho JSON da lista de itens
    field_name      text NOT NULL DEFAULT 'nome',
    field_price     text NOT NULL DEFAULT 'preco',
    field_stock     text NOT NULL DEFAULT 'estoque',
    field_sku       text DEFAULT 'codigo',
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(project_id)
);

-- Row Level Security
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage api integrations"
    ON api_integrations FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );
