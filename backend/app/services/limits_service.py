"""
services/limits_service.py
--------------------------
Verifica limites de uso baseados no plano de assinatura do usuário.
Lança HTTP 402 quando o limite é atingido e registra uso em usage_logs.
"""

from datetime import datetime, timezone

from fastapi import HTTPException

from app.db.supabase import get_supabase


# ---------------------------------------------------------------------------
# Limites por plano
# ---------------------------------------------------------------------------

PLAN_LIMITS: dict[str, dict] = {
    "free": {
        "max_projects": 1,
        "max_documents_per_project": 5,
        "max_questions_per_month": 50,
        "widget_access": False,
    },
    "pro": {
        "max_projects": 5,
        "max_documents_per_project": 50,
        "max_questions_per_month": 1000,
        "widget_access": True,
    },
    "business": {
        "max_projects": None,        # ilimitado
        "max_documents_per_project": None,  # ilimitado
        "max_questions_per_month": 5000,
        "widget_access": True,
    },
}

PLAN_NAMES = {
    "free": "Gratuito",
    "pro": "Pro",
    "business": "Business",
}


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _get_user_plan(user_id: str) -> str:
    """Retorna o plano ativo do usuário: 'free', 'pro' ou 'business'."""
    supabase = get_supabase()
    result = (
        supabase.table("subscriptions")
        .select("status, plan")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return "free"

    sub = result.data[0]
    if sub.get("status") in ("active", "trialing"):
        return sub.get("plan") or "free"
    return "free"


# ---------------------------------------------------------------------------
# Checks de limite (lançam 402 se ultrapassado)
# ---------------------------------------------------------------------------

def check_project_limit(user_id: str) -> None:
    """Lança 402 se o usuário atingiu o limite de projetos do plano."""
    plan = _get_user_plan(user_id)
    max_projects = PLAN_LIMITS[plan]["max_projects"]

    if max_projects is None:
        return  # ilimitado

    supabase = get_supabase()
    result = (
        supabase.table("projects")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    count = result.count or 0

    if count >= max_projects:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "project_limit_reached",
                "message": (
                    f"Você atingiu o limite de {max_projects} projeto(s) do plano "
                    f"{PLAN_NAMES[plan]}. Faça upgrade para criar mais projetos."
                ),
                "current_plan": plan,
                "limit": max_projects,
                "current_count": count,
            },
        )


def check_document_limit(user_id: str, project_id: str) -> None:
    """Lança 402 se o projeto atingiu o limite de documentos do plano."""
    plan = _get_user_plan(user_id)
    max_docs = PLAN_LIMITS[plan]["max_documents_per_project"]

    if max_docs is None:
        return  # ilimitado

    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("project_id", project_id)
        .neq("status", "error")
        .execute()
    )
    count = result.count or 0

    if count >= max_docs:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "document_limit_reached",
                "message": (
                    f"Você atingiu o limite de {max_docs} documento(s) por projeto do plano "
                    f"{PLAN_NAMES[plan]}. Faça upgrade para enviar mais documentos."
                ),
                "current_plan": plan,
                "limit": max_docs,
                "current_count": count,
            },
        )


def check_question_limit(user_id: str) -> None:
    """Lança 402 se o usuário atingiu o limite mensal de perguntas."""
    plan = _get_user_plan(user_id)
    max_questions = PLAN_LIMITS[plan]["max_questions_per_month"]

    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()

    supabase = get_supabase()
    result = (
        supabase.table("usage_logs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("action", "question")
        .gte("created_at", start_of_month)
        .execute()
    )
    count = result.count or 0

    if count >= max_questions:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "question_limit_reached",
                "message": (
                    f"Você atingiu o limite de {max_questions} pergunta(s) por mês do plano "
                    f"{PLAN_NAMES[plan]}. Faça upgrade para continuar."
                ),
                "current_plan": plan,
                "limit": max_questions,
                "current_count": count,
            },
        )


def check_widget_access(user_id: str) -> None:
    """Lança 402 se o plano não inclui acesso ao Widget embeddable."""
    plan = _get_user_plan(user_id)
    if not PLAN_LIMITS[plan]["widget_access"]:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "widget_access_denied",
                "message": (
                    "O Widget embeddable não está disponível no plano Gratuito. "
                    "Faça upgrade para Pro ou Business para acessar este recurso."
                ),
                "current_plan": plan,
                "limit": None,
                "current_count": None,
            },
        )


# ---------------------------------------------------------------------------
# Log de uso
# ---------------------------------------------------------------------------

def log_usage(user_id: str, action: str, project_id: str | None = None) -> None:
    """Registra uma ação de uso na tabela usage_logs. Não bloqueia em caso de falha."""
    supabase = get_supabase()
    data: dict = {"user_id": user_id, "action": action}
    if project_id:
        data["project_id"] = project_id
    try:
        supabase.table("usage_logs").insert(data).execute()
    except Exception:
        pass
