# Variáveis de ambiente

## Backend (`backend/.env`)

| Variável | Descrição | Obrigatório |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | Sim |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (bypass RLS) | Sim |
| `DATABASE_URL` | Connection string PostgreSQL | Sim |
| `QDRANT_HOST` | Host do Qdrant | Sim |
| `QDRANT_PORT` | Porta do Qdrant (padrão 6333) | Não |
| `QDRANT_API_KEY` | API key Qdrant Cloud | Não |
| `OPENAI_API_KEY` | Chave OpenAI | Sim |
| `OPENAI_MODEL` | Modelo LLM (padrão gpt-4o) | Não |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | Sim |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | Sim |
| `SECRET_KEY` | Segredo JWT (mín. 32 chars) | Sim |

## Frontend (`frontend/.env.local`)

| Variável | Descrição | Obrigatório |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase | Sim |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe | Sim |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe (server-side) | Sim |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook | Sim |
| `NEXT_PUBLIC_API_URL` | URL base da API FastAPI | Não |
