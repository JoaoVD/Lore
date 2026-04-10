"""
app/api/subscriptions/router.py
--------------------------------
Endpoints de assinatura por produto.

Rotas:
  GET /api/subscriptions/{product}  → retorna (ou cria trial) para o produto
  GET /api/subscriptions            → lista todas as assinaturas do usuário
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from supabase import Client

from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


@router.get("/subscriptions/{product}")
async def get_subscription(
    product: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Retorna a assinatura do usuário para um produto específico.
    Na primeira vez, cria automaticamente um trial de 14 dias."""
    result = (
        supabase.table("product_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("product", product)
        .execute()
    )

    if not result.data:
        trial_ends = (datetime.utcnow() + timedelta(days=14)).isoformat()
        new_sub = supabase.table("product_subscriptions").insert({
            "user_id":       user.id,
            "product":       product,
            "plan":          "trial",
            "status":        "active",
            "trial_ends_at": trial_ends,
        }).execute()
        return new_sub.data[0] if new_sub.data else {
            "plan": "trial", "status": "active"
        }

    return result.data[0]


@router.get("/subscriptions")
async def list_subscriptions(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todas as assinaturas do usuário."""
    result = (
        supabase.table("product_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .execute()
    )
    return result.data or []
