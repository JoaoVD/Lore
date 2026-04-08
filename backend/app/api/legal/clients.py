"""
app/api/legal/clients.py
------------------------
Gestão de clientes e processos do Lore Jurídico.

Rotas:
  GET    /api/projects/{project_id}/legal/clients                          — lista clientes
  POST   /api/projects/{project_id}/legal/clients                          — cria cliente
  DELETE /api/projects/{project_id}/legal/clients/{client_id}             — remove cliente
  GET    /api/projects/{project_id}/legal/clients/{client_id}/cases        — lista processos do cliente
  POST   /api/projects/{project_id}/legal/cases                           — cria processo
  PATCH  /api/projects/{project_id}/legal/cases/{case_id}                 — atualiza processo
  DELETE /api/projects/{project_id}/legal/cases/{case_id}                 — remove processo
"""

from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.core.features import Features
from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: str = "pessoa_fisica"
    notes: Optional[str] = None


class CaseCreate(BaseModel):
    client_id: str
    title: str
    process_number: Optional[str] = None
    area: Optional[str] = None
    description: Optional[str] = None


# ── Clientes ──────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/legal/clients")
async def list_clients(
    project_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os clientes do projeto com seus processos vinculados."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = (
        supabase.table("legal_clients")
        .select("*, legal_cases(id, title, status)")
        .eq("project_id", project_id)
        .order("name")
        .execute()
    )
    return {"clients": result.data}


@router.post("/api/projects/{project_id}/legal/clients")
async def create_client(
    project_id: str,
    body: ClientCreate,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um novo cliente no projeto."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = supabase.table("legal_clients").insert({
        "project_id": project_id,
        "name": body.name,
        "cpf_cnpj": body.cpf_cnpj,
        "email": body.email,
        "phone": body.phone,
        "type": body.type,
        "notes": body.notes,
        "created_by": user.id,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar cliente")

    return result.data[0]


@router.delete("/api/projects/{project_id}/legal/clients/{client_id}")
async def delete_client(
    project_id: str,
    client_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Remove um cliente e seus processos vinculados (CASCADE no banco)."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    supabase.table("legal_clients").delete() \
        .eq("id", client_id).eq("project_id", project_id).execute()

    return {"message": "Cliente removido"}


# ── Processos ─────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/legal/clients/{client_id}/cases")
async def list_cases(
    project_id: str,
    client_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista processos de um cliente com seus prazos e documentos."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = (
        supabase.table("legal_cases")
        .select("*, legal_deadlines(id, title, deadline_date, status), legal_documents(id, name, created_at)")
        .eq("project_id", project_id)
        .eq("client_id", client_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"cases": result.data}


@router.post("/api/projects/{project_id}/legal/cases")
async def create_case(
    project_id: str,
    body: CaseCreate,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um novo processo vinculado a um cliente."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = supabase.table("legal_cases").insert({
        "project_id": project_id,
        "client_id": body.client_id,
        "title": body.title,
        "process_number": body.process_number,
        "area": body.area,
        "description": body.description,
        "created_by": user.id,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar processo")

    return result.data[0]


@router.patch("/api/projects/{project_id}/legal/cases/{case_id}")
async def update_case(
    project_id: str,
    case_id: str,
    body: dict = Body(...),
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Atualiza campos de um processo (ex: status, tribunal)."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = (
        supabase.table("legal_cases")
        .update(body)
        .eq("id", case_id)
        .eq("project_id", project_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Processo não encontrado")

    return result.data[0]


@router.delete("/api/projects/{project_id}/legal/cases/{case_id}")
async def delete_case(
    project_id: str,
    case_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Remove um processo."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    supabase.table("legal_cases").delete() \
        .eq("id", case_id).eq("project_id", project_id).execute()

    return {"message": "Processo removido"}
