from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.upload import router as upload_router
from app.api.integrations.api_rest import router as api_rest_router
from app.api.integrations.google_drive import (
    integrations_router,
    project_integrations_router,
)
from app.api.admin.router import router as admin_router
from app.api.history.router import router as history_router
from app.api.legal.router import router as legal_router
from app.api.legal.deadlines import router as deadlines_router
from app.api.projects.router import router as projects_router
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas internas / infra
app.include_router(api_router, prefix=settings.API_V1_STR)

# Rotas de negócio — prefixo /api/projects
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])

# Upload assíncrono + status de processamento (BackgroundTasks)
app.include_router(upload_router, prefix="/api/projects", tags=["upload"])

# Google Drive — rotas de autenticação e pastas
app.include_router(integrations_router, prefix="/api/integrations", tags=["integrations"])

# Google Drive — rotas específicas de projeto (vinculação + sync)
app.include_router(project_integrations_router, prefix="/api/projects", tags=["integrations"])

# Integração com API REST externa (estoque/preço)
app.include_router(api_rest_router, prefix="/api/projects", tags=["integrations"])

# Admin — feature flags e debug
app.include_router(admin_router)

# Histórico de conversas e relatório de uso
app.include_router(history_router)

# Lore Jurídico — templates, documentos e prazos processuais
app.include_router(legal_router)
app.include_router(deadlines_router)


@app.get("/health", tags=["infra"])
async def health_check():
    return {"status": "ok", "version": settings.VERSION}
