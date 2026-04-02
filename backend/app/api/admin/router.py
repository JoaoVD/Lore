from fastapi import APIRouter
from app.core.features import Features

router = APIRouter()


@router.get("/api/admin/features")
async def list_features():
    """
    Lista todas as feature flags e seus estados atuais.
    Útil para debug — ver o que está ativo sem abrir o Railway.
    """
    return {
        "features": {
            "ESTOQ":          Features.ESTOQ,
            "WIDGET":         Features.WIDGET,
            "AUDIT_LOG":      Features.AUDIT_LOG,
            "DRIVE_AUTOSYNC": Features.DRIVE_AUTOSYNC,
            "ANNUAL_PLAN":    Features.ANNUAL_PLAN,
            "MULTILANG":      Features.MULTILANG,
            "WEEKLY_DIGEST":  Features.WEEKLY_DIGEST,
            "EXPORT_PDF":     Features.EXPORT_PDF,
            "PUBLIC_API":     Features.PUBLIC_API,
            "DEMO_MODE":      Features.DEMO_MODE,
        }
    }
