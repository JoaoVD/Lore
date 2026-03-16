# Arquitetura do sistema

## Fluxo geral

```
Browser → Next.js (SSR/CSR)
             │
             ├─ Supabase Auth (sessão)
             └─ FastAPI (REST /api/v1)
                    │
                    ├─ Supabase Postgres  (dados relacionais)
                    ├─ Qdrant            (embeddings / busca semântica)
                    ├─ OpenAI            (LLM + embeddings via LlamaIndex)
                    └─ Stripe            (assinaturas / pagamentos)
```

## Decisões de design

- **Route Groups** (`(auth)`, `(dashboard)`) — separar layouts sem afetar URL
- **Server Components por padrão** — hidratação mínima, SSR nativo
- **Supabase SSR helpers** — cookie-based auth compatível com App Router
- **LlamaIndex** — abstração sobre OpenAI + Qdrant para RAG
- **Zustand** — estado global leve (auth, UI)
- **React Query** — cache e sincronização de dados do servidor

## Módulos do backend

| Módulo      | Responsabilidade                          |
|-------------|-------------------------------------------|
| `core`      | Config (pydantic-settings), JWT, hashing  |
| `db`        | Clientes Supabase e Qdrant                |
| `api/v1`    | Roteamento REST versionado                |
| `models`    | Entidades do banco (futuro: SQLModel)     |
| `schemas`   | Contratos de request/response (Pydantic)  |
| `services`  | Lógica de integração (Stripe, AI)         |
