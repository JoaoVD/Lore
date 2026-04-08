import os

from fastapi import APIRouter, Depends, Header, HTTPException
from supabase import Client

from app.core.features import Features
from app.db.supabase import get_supabase

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
            "JURIDICO":       Features.JURIDICO,
        }
    }


@router.post("/api/admin/send-deadline-notifications")
async def trigger_deadline_notifications(
    x_cron_secret: str = Header(default=""),
    supabase: Client = Depends(get_supabase),
):
    """
    Disparado diariamente pelo cron-job.org às 7h.
    Protegido por CRON_SECRET para evitar chamadas não autorizadas.
    """
    expected = os.getenv("CRON_SECRET", "")
    if expected and x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Acesso negado")

    from app.services.deadline_notifier import send_deadline_notifications
    result = await send_deadline_notifications(supabase)
    return result
