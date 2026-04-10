"""
app/api/subscriptions/router.py
--------------------------------
Endpoints de assinatura por produto.

Rotas:
  GET /api/subscriptions/{product}  → retorna (ou cria trial) para o produto
  GET /api/subscriptions            → lista todas as assinaturas do usuário
"""

import traceback
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
    try:
        result = (
            supabase.table("product_subscriptions")
            .select("*")
            .eq("user_id", str(user.id))
            .eq("product", product)
            .execute()
        )

        if not result.data:
            trial_ends = (datetime.utcnow() + timedelta(days=14)).isoformat()
            new_sub = supabase.table("product_subscriptions").insert({
                "user_id":       str(user.id),
                "product":       product,
                "plan":          "trial",
                "status":        "active",
                "trial_ends_at": trial_ends,
            }).execute()
            data = new_sub.data[0] if new_sub.data else {
                "plan": "trial", "status": "active", "trial_ends_at": trial_ends
            }
        else:
            data = result.data[0]

        # Calcula dias restantes do trial
        days_left = 0
        if data.get("trial_ends_at"):
            try:
                end_str = data["trial_ends_at"]
                if end_str.endswith("Z"):
                    end_str = end_str[:-1]
                end = datetime.fromisoformat(end_str)
                days_left = max(0, (end - datetime.utcnow()).days)
            except Exception:
                days_left = 14

        return {**data, "days_left": days_left}

    except Exception:
        traceback.print_exc()
        # Retorna trial padrão em vez de 500
        trial_ends = (datetime.utcnow() + timedelta(days=14)).isoformat()
        return {
            "plan":          "trial",
            "status":        "active",
            "trial_ends_at": trial_ends,
            "days_left":     14,
            "product":       product,
        }


@router.get("/subscriptions")
async def list_subscriptions(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todas as assinaturas do usuário."""
    try:
        result = (
            supabase.table("product_subscriptions")
            .select("*")
            .eq("user_id", str(user.id))
            .execute()
        )
        return result.data or []
    except Exception:
        traceback.print_exc()
        return []
