"""
services/stripe_service.py
--------------------------
Funções de integração com Stripe: checkout, webhook e status.
"""

from datetime import datetime

import stripe

from app.core.config import settings
from app.db.supabase import get_supabase


def _plan_from_price_id(price_id: str) -> str:
    """Determina o plano ('pro' ou 'business') a partir do price_id do Stripe."""
    if price_id and price_id in (
        settings.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
        settings.STRIPE_PRICE_ID_BUSINESS_ANNUAL,
    ):
        return "business"
    if price_id and price_id in (
        settings.STRIPE_PRICE_ID_PRO_MONTHLY,
        settings.STRIPE_PRICE_ID_PRO_ANNUAL,
    ):
        return "pro"
    return "pro"  # padrão para qualquer assinatura ativa não mapeada

stripe.api_key = settings.STRIPE_SECRET_KEY


# ---------------------------------------------------------------------------
# Customer helpers
# ---------------------------------------------------------------------------

def _get_or_create_customer(user_id: str, email: str) -> str:
    """Retorna o stripe_customer_id existente ou cria um novo."""
    supabase = get_supabase()
    result = (
        supabase.table("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user_id)
        .execute()
    )

    if result.data and result.data[0].get("stripe_customer_id"):
        return result.data[0]["stripe_customer_id"]

    customer = stripe.Customer.create(
        email=email,
        metadata={"user_id": user_id},
    )
    return customer.id


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

def create_checkout_session(
    user_id: str,
    email: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """Cria uma Stripe Checkout Session e retorna a URL."""
    customer_id = _get_or_create_customer(user_id, email)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={"trial_period_days": 14},
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user_id},
    )

    return session.url


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

def get_subscription_status(user_id: str) -> dict:
    """Retorna o status da assinatura do usuário."""
    supabase = get_supabase()
    result = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return {"status": "inactive", "plan": "free"}

    sub = result.data[0]
    status = sub.get("status", "inactive")
    plan = sub.get("plan", "free") if status in ("active", "trialing") else "free"
    return {
        "status": status,
        "plan": plan,
        "stripe_subscription_id": sub.get("stripe_subscription_id"),
        "current_period_end": sub.get("current_period_end"),
    }


# ---------------------------------------------------------------------------
# Webhook handlers
# ---------------------------------------------------------------------------

def handle_checkout_completed(session: dict) -> None:
    """Processa checkout.session.completed — cria/atualiza assinatura."""
    user_id = (session.get("metadata") or {}).get("user_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not user_id or not subscription_id:
        return

    stripe_sub = stripe.Subscription.retrieve(subscription_id)
    price_id = stripe_sub.items.data[0].price.id if stripe_sub.items.data else ""
    plan = _plan_from_price_id(price_id)

    supabase = get_supabase()
    supabase.table("subscriptions").upsert(
        {
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "status": stripe_sub.status,
            "plan": plan,
            "current_period_end": datetime.fromtimestamp(
                stripe_sub.current_period_end
            ).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


def handle_subscription_updated(subscription: dict) -> None:
    """Processa customer.subscription.updated — sincroniza status."""
    subscription_id = subscription.get("id")
    period_end = subscription.get("current_period_end")
    items = subscription.get("items", {}).get("data", [])
    price_id = items[0]["price"]["id"] if items else ""
    plan = _plan_from_price_id(price_id)

    supabase = get_supabase()
    supabase.table("subscriptions").update(
        {
            "status": subscription.get("status"),
            "plan": plan,
            "current_period_end": datetime.fromtimestamp(period_end).isoformat()
            if period_end
            else None,
        }
    ).eq("stripe_subscription_id", subscription_id).execute()


def handle_subscription_deleted(subscription: dict) -> None:
    """Processa customer.subscription.deleted — cancela assinatura."""
    subscription_id = subscription.get("id")

    supabase = get_supabase()
    supabase.table("subscriptions").update(
        {"status": "canceled"}
    ).eq("stripe_subscription_id", subscription_id).execute()
