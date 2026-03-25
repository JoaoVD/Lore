from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SaaS API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str        # service_role key — bypassa RLS no backend
    DATABASE_URL: str = ""           # postgresql://... (opcional, usado por ORMs futuros)

    # Qdrant
    QDRANT_URL: str = ""             # Qdrant Cloud URL (prioritário)
    QDRANT_HOST: str = "localhost"   # fallback local
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Stripe (opcional — não bloqueia startup se vazio)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID_PRO_MONTHLY: str = ""
    STRIPE_PRICE_ID_PRO_ANNUAL: str = ""
    STRIPE_PRICE_ID_BUSINESS_MONTHLY: str = ""
    STRIPE_PRICE_ID_BUSINESS_ANNUAL: str = ""

    # Auth JWT interno (para rotas não-Supabase)
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"

    # Supabase Storage
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # Google OAuth — Google Drive integration
    # Obtenha em: console.cloud.google.com → APIs & Services → Credentials
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # URI de redirecionamento cadastrado no Google Cloud Console
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/integrations/google/callback"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"             # ignora variáveis do .env não declaradas aqui


settings = Settings()
