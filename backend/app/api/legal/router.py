"""
app/api/legal/router.py
------------------------
Endpoints do Lore Jurídico — templates jurídicos pré-configurados.

Rotas (caminhos completos definidos aqui):
  GET  /api/legal/templates                              — lista templates
  GET  /api/legal/templates/{template_id}               — detalhe do template
  POST /api/projects/{project_id}/legal/generate        — gera documento
  GET  /api/projects/{project_id}/legal/documents       — lista documentos gerados
  POST /api/projects/{project_id}/legal/templates       — cria template customizado
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.core.features import Features
from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


class GenerateDocumentRequest(BaseModel):
    template_id: str
    variables: dict        # {"nome_cliente": "João Silva", ...}
    use_ai: bool = False   # se True, usa IA para preencher campos vazios


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/api/legal/templates")
async def list_templates(
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os templates disponíveis (padrão + do projeto)."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    query = supabase.table("legal_templates") \
        .select("*, legal_template_categories(name, icon)")

    if project_id:
        query = query.or_(f"is_default.eq.true,project_id.eq.{project_id}")
    else:
        query = query.eq("is_default", True)

    if category:
        query = query.eq("legal_template_categories.name", category)

    result = query.order("created_at").execute()
    return {"templates": result.data}


@router.get("/api/legal/templates/{template_id}")
async def get_template(
    template_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Retorna um template específico com todas as variáveis."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = supabase.table("legal_templates") \
        .select("*, legal_template_categories(name, icon)") \
        .eq("id", template_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    return result.data[0]


# ── Documentos ────────────────────────────────────────────────────────────────

@router.post("/api/projects/{project_id}/legal/generate")
async def generate_document(
    project_id: str,
    body: GenerateDocumentRequest,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Gera um documento a partir de um template com as variáveis preenchidas."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    template = supabase.table("legal_templates") \
        .select("*") \
        .eq("id", body.template_id) \
        .execute()

    if not template.data:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    template_data = template.data[0]
    content = template_data["content"]

    # Substitui as variáveis no template
    for key, value in body.variables.items():
        content = content.replace(f"{{{{{key}}}}}", str(value))

    # Se use_ai=True, usa GPT para preencher campos técnicos vazios
    if body.use_ai:
        remaining = re.findall(r'\{\{(\w+)\}\}', content)
        if remaining:
            content = await _fill_with_ai(content, remaining, template_data["name"])

    doc_name = (
        f"{template_data['name']} — "
        f"{body.variables.get('nome_cliente', body.variables.get('nome_reclamante', 'Documento'))}"
    )

    saved = supabase.table("legal_documents").insert({
        "project_id": project_id,
        "template_id": body.template_id,
        "name": doc_name,
        "content": content,
        "variables": body.variables,
        "created_by": user.id,
    }).execute()

    return {
        "document_id": saved.data[0]["id"],
        "name": doc_name,
        "content": content,
        "variables_filled": len(body.variables),
        "variables_remaining": len(re.findall(r'\{\{(\w+)\}\}', content)),
    }


@router.get("/api/projects/{project_id}/legal/documents")
async def list_documents(
    project_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista documentos gerados do projeto."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = supabase.table("legal_documents") \
        .select("id, name, created_at, template_id, legal_templates(name)") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .execute()

    return {"documents": result.data}


@router.post("/api/projects/{project_id}/legal/templates")
async def create_custom_template(
    project_id: str,
    body: dict,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um template customizado para o projeto."""
    if not Features.JURIDICO:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    variables = [
        {"key": v, "label": v.replace("_", " ").title(), "type": "text"}
        for v in set(re.findall(r'\{\{(\w+)\}\}', body.get("content", "")))
    ]

    result = supabase.table("legal_templates").insert({
        "project_id": project_id,
        "category_id": body.get("category_id"),
        "name": body["name"],
        "description": body.get("description", ""),
        "content": body["content"],
        "variables": variables,
        "is_default": False,
        "created_by": user.id,
    }).execute()

    return result.data[0]


# ── IA helper ─────────────────────────────────────────────────────────────────

async def _fill_with_ai(content: str, missing_vars: list, template_name: str) -> str:
    """Usa GPT para sugerir preenchimento de campos jurídicos técnicos vazios."""
    import os
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = (
        f"Você é um assistente jurídico brasileiro especializado em {template_name}.\n\n"
        f"O documento abaixo tem campos não preenchidos marcados com {{{{variavel}}}}.\n"
        f"Campos faltando: {', '.join(missing_vars)}\n\n"
        f"Preencha APENAS os campos técnicos padrão (como fundamentos jurídicos, "
        f"cláusulas padrão) com texto juridicamente correto.\n"
        f"NÃO invente dados pessoais — mantenha {{{{variavel}}}} para dados do cliente.\n\n"
        f"Documento:\n{content[:3000]}\n\n"
        f"Retorne o documento com os campos técnicos preenchidos."
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
    )

    return response.choices[0].message.content
