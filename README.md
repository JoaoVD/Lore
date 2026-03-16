# SaaS Boilerplate

Full-stack SaaS com Next.js 14, FastAPI, Supabase, Qdrant, LlamaIndex e Stripe.

## Stack

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend     | FastAPI (Python 3.11)               |
| Banco       | Supabase (PostgreSQL)               |
| Vector DB   | Qdrant                              |
| IA          | LlamaIndex + OpenAI                 |
| Pagamentos  | Stripe                              |

## Estrutura

```
projeto_02/
├── frontend/          # Next.js 14
│   └── src/
│       ├── app/
│       │   ├── (auth)/        # login, register
│       │   ├── (dashboard)/   # área autenticada
│       │   └── api/stripe/    # webhook Stripe
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       │   ├── supabase/      # client e server helpers
│       │   ├── stripe.ts
│       │   └── api.ts         # axios instance
│       ├── store/             # Zustand
│       └── types/
├── backend/           # FastAPI
│   └── app/
│       ├── api/v1/endpoints/  # health, auth, users, billing, ai
│       ├── core/              # config, security
│       ├── db/                # supabase, qdrant clients
│       ├── models/            # SQLModel / Pydantic models
│       ├── schemas/           # request/response schemas
│       └── services/          # stripe_service, ai_service
└── docs/              # Documentação interna
```

## Setup rápido

### Pré-requisitos

- Node.js 20+
- Python 3.11+
- Docker (para Qdrant local)

### 1. Qdrant (Docker)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # preencha as variáveis
uvicorn app.main:app --reload --port 8000
```

Acesse: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local       # preencha as variáveis
npm install
npm run dev
```

Acesse: http://localhost:3000

## Variáveis de ambiente

Copie os arquivos `.env.example` e preencha:

- **`backend/.env.example`** → `backend/.env`
- **`frontend/.env.example`** → `frontend/.env.local`

## Scripts úteis

```bash
# Backend — testes
cd backend && pytest

# Frontend — build de produção
cd frontend && npm run build
```
