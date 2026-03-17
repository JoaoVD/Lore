"""
api/v1/endpoints/billing.py
---------------------------
Endpoints de faturamento: checkout, webhook e status da assinatura.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.services import stripe_service
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/create-checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe não configurado")

    checkout_url = stripe_service.create_checkout_session(
        user_id=current_user.id,
        email=current_user.email,
        price_id=body.price_id,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )
    return {"checkout_url": checkout_url}



@router.get("/status")
async def subscription_status(
    current_user: AuthUser = Depends(get_current_user),
):
    return stripe_service.get_subscription_status(current_user.id)
