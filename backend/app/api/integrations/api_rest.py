"""
app/api/integrations/api_rest.py
---------------------------------
Endpoints para gerenciar integrações com APIs REST externas por projeto.
Permite conectar qualquer API externa (ex: estoque/preço) ao pipeline RAG.

Rotas (prefixo /api/projects montado em main.py):
  GET    /{project_id}/api-integration         — retorna config salva
  POST   /{project_id}/api-integration         — salva/atualiza config
  DELETE /{project_id}/api-integration         — remove config
  POST   /{project_id}/api-integration/test    — testa conectividade
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.api.projects.permissions import ProjectAccess, require_project_access
from app.db.supabase import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ApiIntegrationCreate(BaseModel):
    name: str
    base_url: str
    auth_type: str = "api_key"
    auth_header: str = "Authorization"
    auth_value: Optional[str] = None   # None = manter token existente
    endpoint_stock: str
    response_path: str = "data"
    field_name: str = "nome"
    field_price: str = "preco"
    field_stock: str = "estoque"
    field_sku: Optional[str] = "codigo"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/api-integration")
async def get_api_integration(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """Retorna a configuração da integração de API do projeto (auth_value mascarado)."""
    result = (
        supabase.table("api_integrations")
        .select("*")
        .eq("project_id", project_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    row = dict(result.data[0])
    row["auth_value"] = "configured" if row.get("auth_value") else ""
    return row


@router.post("/{project_id}/api-integration")
async def save_api_integration(
    project_id: str,
    data: ApiIntegrationCreate,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """Salva ou atualiza a configuração da integração de API REST externa."""
    # Se auth_value não fornecido, mantém o existente
    auth_value = data.auth_value
    if not auth_value:
        existing = (
            supabase.table("api_integrations")
            .select("auth_value")
            .eq("project_id", project_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            auth_value = existing.data[0]["auth_value"]
        else:
            raise HTTPException(
                status_code=400,
                detail="Token de autenticação obrigatório para nova integração",
            )

    payload = {
        "project_id": project_id,
        "name": data.name,
        "base_url": data.base_url.rstrip("/"),
        "auth_type": data.auth_type,
        "auth_header": data.auth_header,
        "auth_value": auth_value,
        "endpoint_stock": data.endpoint_stock,
        "response_path": data.response_path,
        "field_name": data.field_name,
        "field_price": data.field_price,
        "field_stock": data.field_stock,
        "field_sku": data.field_sku or "codigo",
        "is_active": True,
    }

    result = (
        supabase.table("api_integrations")
        .upsert(payload, on_conflict="project_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Falha ao salvar integração")

    row = dict(result.data[0])
    row["auth_value"] = "configured"
    return row


@router.delete("/{project_id}/api-integration", status_code=204)
async def delete_api_integration(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """Remove a integração de API externa do projeto."""
    supabase.table("api_integrations").delete().eq("project_id", project_id).execute()


@router.post("/{project_id}/api-integration/test")
async def test_api_integration(
    project_id: str,
    body: dict,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """
    Testa a conectividade com a API externa.
    Usa config salva se existir; caso contrário, usa campos do body.
    """
    saved = (
        supabase.table("api_integrations")
        .select("*")
        .eq("project_id", project_id)
        .limit(1)
        .execute()
    )

    if saved.data:
        integration = dict(saved.data[0])
    else:
        # Testar com config do body (antes de salvar)
        required = ["base_url", "auth_value", "endpoint_stock"]
        missing = [f for f in required if not body.get(f)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Campos obrigatórios ausentes: {', '.join(missing)}",
            )
        integration = {
            "base_url":       body.get("base_url", "").rstrip("/"),
            "auth_header":    body.get("auth_header", "Authorization"),
            "auth_value":     body.get("auth_value", ""),
            "endpoint_stock": body.get("endpoint_stock", ""),
            "response_path":  body.get("response_path", ""),
            "field_name":     body.get("field_name", "nome"),
            "field_price":    body.get("field_price", "preco"),
            "field_stock":    body.get("field_stock", "estoque"),
            "field_sku":      body.get("field_sku", "codigo"),
        }

    query = body.get("query", "produto")
    endpoint = integration["endpoint_stock"].replace("{query}", query)
    url = integration["base_url"].rstrip("/") + "/" + endpoint.lstrip("/")
    headers = {integration["auth_header"]: integration["auth_value"]}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=400, detail=f"Não foi possível conectar à API: {exc}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout: a API não respondeu em 10s")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erro de conexão: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"API retornou status {response.status_code}: {response.text[:300]}",
        )

    try:
        data = response.json()
    except Exception:
        raise HTTPException(status_code=400, detail="A API não retornou JSON válido")

    # Navega pelo response_path (ex: "data.items" → data["data"]["items"])
    path = integration.get("response_path", "")
    for key in path.split("."):
        if key and isinstance(data, dict):
            data = data.get(key, data)

    sample = data[:3] if isinstance(data, list) else data
    count = len(data) if isinstance(data, list) else None

    return {
        "success": True,
        "sample": sample,
        "count": count,
        "url_called": url,
    }


# ── Utility: consulta a API durante o chat RAG ────────────────────────────────

async def query_api_for_products(project_id: str, query: str, supabase: Client) -> str:
    """
    Chamada durante o pipeline RAG — consulta a API externa e retorna os
    resultados formatados como bloco de contexto para o LLM.
    Retorna string vazia se não houver integração ativa ou em caso de erro.
    """
    try:
        result = (
            supabase.table("api_integrations")
            .select("*")
            .eq("project_id", project_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not result.data:
            return ""

        integration = result.data[0]

        endpoint = integration["endpoint_stock"].replace("{query}", query)
        url = integration["base_url"].rstrip("/") + "/" + endpoint.lstrip("/")
        headers = {integration["auth_header"]: integration["auth_value"]}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=8)

        if response.status_code != 200:
            logger.warning(
                "API integration retornou %d para projeto %s",
                response.status_code, project_id,
            )
            return ""

        data = response.json()

        path = integration.get("response_path", "")
        for key in path.split("."):
            if key and isinstance(data, dict):
                data = data.get(key, data)

        if not isinstance(data, list) or not data:
            return ""

        lines = ["[DADOS DO SISTEMA DE ESTOQUE — TEMPO REAL]"]
        for item in data[:10]:
            name  = item.get(integration["field_name"], "—")
            price = item.get(integration["field_price"], "—")
            stock = item.get(integration["field_stock"], "—")
            sku   = item.get(integration.get("field_sku") or "codigo", "")

            line = f"• {name}"
            if sku:
                line += f" (Cód: {sku})"
            line += f" — Estoque: {stock} unidades"
            if price and price != "—":
                line += f" — Preço: R$ {price}"
            lines.append(line)

        return "\n".join(lines)

    except Exception as exc:
        logger.error("Erro ao consultar API externa (projeto %s): %s", project_id, exc)
        return ""
