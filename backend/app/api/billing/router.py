"""
app/api/billing/router.py
--------------------------
Endpoints de cobrança via Stripe Checkout.

Rotas:
  POST /api/billing/checkout   → cria sessão Stripe e retorna URL
  POST /api/billing/portal     → abre portal do cliente Stripe
  GET  /api/billing/status     → retorna plano/status do usuário
  POST /api/billing/webhook    → recebe eventos do Stripe
"""

import os
from datetime import datetime, timedelta

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://uselore.com.br")

PRICE_IDS = {
    "pro": {
        "monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY"),
        "annual":  os.getenv("STRIPE_PRICE_PRO_ANNUAL"),
    },
    "business": {
        "monthly": os.getenv("STRIPE_PRICE_BUSINESS_MONTHLY"),
        "annual":  os.getenv("STRIPE_PRICE_BUSINESS_ANNUAL"),
    },
}

router = APIRouter()


class CheckoutRequest(BaseModel):
    plan:   str  # "pro" | "business"
    period: str  # "monthly" | "annual"


# ── Checkout ──────────────────────────────────────────────────────────────────

@router.post("/billing/checkout")
async def create_checkout(
    body: CheckoutRequest,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria uma sessão do Stripe Checkout e retorna a URL de redirecionamento."""
    # Normaliza para minúsculo — evita erro por capitalização
    plan   = body.plan.lower().strip()
    period = body.period.lower().strip()

    period_map = {
        "monthly": "monthly", "mensal": "monthly", "month": "monthly",
        "annual":  "annual",  "anual":  "annual",  "yearly": "annual", "year": "annual",
    }
    period = period_map.get(period, period)

    plan_map = {"pro": "pro", "business": "business", "empresarial": "business"}
    plan = plan_map.get(plan, plan)

    if plan not in ("pro", "business"):
        raise HTTPException(status_code=400, detail=f"Plano inválido: '{plan}'. Use 'pro' ou 'business'.")
    if period not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail=f"Período inválido: '{period}'. Use 'monthly' ou 'annual'.")

    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados")

    price_id = PRICE_IDS.get(plan, {}).get(period)
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price ID não configurado para {plan}/{period}. Verifique as variáveis de ambiente do Stripe.")

    # Busca customer_id existente
    customer_id: str | None = None
    try:
        sub = (
            supabase.table("product_subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .eq("product", "juridico")
            .execute()
        )
        if sub.data and sub.data[0].get("stripe_customer_id"):
            customer_id = sub.data[0]["stripe_customer_id"]
    except Exception:
        pass

    session_params: dict = {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": (
            f"{FRONTEND_URL}/app/planos"
            f"?success=true&session_id={{CHECKOUT_SESSION_ID}}"
        ),
        "cancel_url": f"{FRONTEND_URL}/app/planos?cancelled=true",
        "metadata": {
            "user_id": user.id,
            "plan":    plan,
            "period":  period,
            "product": "juridico",
        },
        "subscription_data": {
            "metadata": {
                "user_id": user.id,
                "plan":    plan,
                "product": "juridico",
            }
        },
        "allow_promotion_codes":      True,
        "billing_address_collection": "auto",
        "locale": "pt-BR",
    }

    if customer_id:
        session_params["customer"] = customer_id
    elif user.email:
        session_params["customer_email"] = user.email

    session = stripe.checkout.Session.create(**session_params)
    return {"checkout_url": session.url, "session_id": session.id}


# ── Portal ────────────────────────────────────────────────────────────────────

@router.post("/billing/portal")
async def create_portal(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Abre o portal Stripe para o cliente gerenciar a assinatura."""
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Pagamentos não configurados")

    sub = (
        supabase.table("product_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .eq("product", "juridico")
        .execute()
    )

    if not sub.data or not sub.data[0].get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="Nenhuma assinatura encontrada")

    portal = stripe.billing_portal.Session.create(
        customer=sub.data[0]["stripe_customer_id"],
        return_url=f"{FRONTEND_URL}/app/planos",
    )
    return {"portal_url": portal.url}


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/billing/status")
async def get_billing_status(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Retorna o plano e status de assinatura do usuário."""
    sub = (
        supabase.table("product_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("product", "juridico")
        .execute()
    )

    if not sub.data:
        return {"plan": "none", "status": "inactive"}

    s = sub.data[0]
    days_left: int | None = None
    if s.get("trial_ends_at"):
        diff = (
            datetime.fromisoformat(s["trial_ends_at"].replace("Z", ""))
            - datetime.utcnow()
        )
        days_left = max(0, diff.days)

    return {
        "plan":      s.get("plan", "none"),
        "status":    s.get("status", "inactive"),
        "period":    s.get("period", "monthly"),
        "days_left": days_left,
        "renews_at": s.get("period_ends_at"),
    }


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/billing/webhook")
async def stripe_webhook(
    request: Request,
    supabase: Client = Depends(get_supabase),
):
    """Recebe eventos do Stripe e atualiza o banco de dados."""
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Assinatura inválida")

    def _plan_from_price(price_id: str) -> tuple[str, str]:
        for plan, periods in PRICE_IDS.items():
            for period, pid in periods.items():
                if pid and pid == price_id:
                    return plan, period
        return "pro", "monthly"

    etype = event["type"]
    obj   = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id  = obj.get("metadata", {}).get("user_id")
        plan     = obj.get("metadata", {}).get("plan", "pro")
        period   = obj.get("metadata", {}).get("period", "monthly")
        customer = obj.get("customer")
        sub_id   = obj.get("subscription")

        if user_id:
            days         = 365 if period == "annual" else 30
            period_end   = (datetime.utcnow() + timedelta(days=days)).isoformat()
            supabase.table("product_subscriptions").upsert(
                {
                    "user_id":                user_id,
                    "product":               "juridico",
                    "plan":                  plan,
                    "period":                period,
                    "status":                "active",
                    "stripe_customer_id":    customer,
                    "stripe_subscription_id": sub_id,
                    "period_ends_at":        period_end,
                },
                on_conflict="user_id,product",
            ).execute()

    elif etype == "invoice.payment_succeeded":
        sub_id = obj.get("subscription")
        if sub_id:
            supabase.table("product_subscriptions").update(
                {"status": "active"}
            ).eq("stripe_subscription_id", sub_id).execute()

    elif etype in ("customer.subscription.deleted", "invoice.payment_failed"):
        sub_id = obj.get("id") or obj.get("subscription")
        if sub_id:
            supabase.table("product_subscriptions").update(
                {"status": "inactive"}
            ).eq("stripe_subscription_id", sub_id).execute()

    elif etype == "customer.subscription.updated":
        sub_id = obj.get("id")
        status = "active" if obj.get("status") == "active" else "inactive"
        if sub_id:
            supabase.table("product_subscriptions").update(
                {"status": status}
            ).eq("stripe_subscription_id", sub_id).execute()

    return {"received": True}
