-- migrations/add_updated_at_to_integrations.sql
-- Executar no Supabase SQL Editor
-- Adiciona coluna updated_at à tabela integrations (caso já exista sem ela)
-- e garante trigger de auto-atualização.

-- 1. Adiciona a coluna se não existir
ALTER TABLE public.integrations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Garante que a função update_updated_at() existe (já criada em schema.sql,
--    mas recriamos com OR REPLACE para ser idempotente)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Cria o trigger somente se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'integrations_updated_at'
          AND tgrelid = 'public.integrations'::regclass
    ) THEN
        CREATE TRIGGER integrations_updated_at
            BEFORE UPDATE ON public.integrations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END;
$$;
