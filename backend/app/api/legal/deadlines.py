"""
app/api/legal/deadlines.py
---------------------------
Gestão de prazos processuais do Lore Jurídico.

Rotas:
  GET    /api/projects/{project_id}/legal/deadlines                   — lista prazos
  POST   /api/projects/{project_id}/legal/deadlines                   — cria prazo
  PATCH  /api/projects/{project_id}/legal/deadlines/{deadline_id}     — atualiza prazo
  DELETE /api/projects/{project_id}/legal/deadlines/{deadline_id}     — remove prazo
"""

from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.core.features import Features
from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


class DeadlineCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline_date: date
    process_number: Optional[str] = None
    category: str = "prazo"
    alert_days: int = 3


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/legal/deadlines")
async def list_deadlines(
    project_id: str,
    status: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os prazos do projeto ordenados por data, com urgência calculada."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    query = (
        supabase.table("legal_deadlines")
        .select("*")
        .eq("project_id", project_id)
        .order("deadline_date", desc=False)
    )

    if status:
        query = query.eq("status", status)

    result = query.execute()

    today = date.today()
    deadlines = result.data or []
    for item in deadlines:
        dl = date.fromisoformat(item["deadline_date"])
        diff = (dl - today).days
        item["days_remaining"] = diff
        if diff < 0:
            item["urgency"] = "overdue"
        elif diff <= item.get("alert_days", 3):
            item["urgency"] = "urgent"
        else:
            item["urgency"] = "ok"

    return {"deadlines": deadlines}


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/api/projects/{project_id}/legal/deadlines")
async def create_deadline(
    project_id: str,
    body: DeadlineCreate,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um novo prazo processual."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = supabase.table("legal_deadlines").insert({
        "project_id": project_id,
        "title": body.title,
        "description": body.description,
        "deadline_date": str(body.deadline_date),
        "process_number": body.process_number,
        "category": body.category,
        "alert_days": body.alert_days,
        "created_by": user.id,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar prazo")

    item = result.data[0]
    dl = date.fromisoformat(item["deadline_date"])
    diff = (dl - date.today()).days
    item["days_remaining"] = diff
    item["urgency"] = "overdue" if diff < 0 else ("urgent" if diff <= item.get("alert_days", 3) else "ok")

    return item


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/api/projects/{project_id}/legal/deadlines/{deadline_id}")
async def update_deadline(
    project_id: str,
    deadline_id: str,
    body: Dict[str, Any] = Body(...),
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Atualiza um prazo — ex: marcar como concluído com {'status': 'done'}."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    # Converte date para string se vier como objeto date
    if "deadline_date" in body and not isinstance(body["deadline_date"], str):
        body["deadline_date"] = str(body["deadline_date"])

    result = (
        supabase.table("legal_deadlines")
        .update(body)
        .eq("id", deadline_id)
        .eq("project_id", project_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Prazo não encontrado")

    return result.data[0]


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/api/projects/{project_id}/legal/deadlines/{deadline_id}")
async def delete_deadline(
    project_id: str,
    deadline_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Remove um prazo processual."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    supabase.table("legal_deadlines").delete().eq("id", deadline_id).eq(
        "project_id", project_id
    ).execute()

    return {"message": "Prazo removido"}
