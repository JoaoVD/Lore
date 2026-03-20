"""
app/api/projects/router.py
--------------------------
Rotas de negócio da plataforma RAG.

Todas as rotas exigem JWT válido do Supabase (via get_current_user).
O tenant_id no Qdrant é sempre o user.id do Supabase.

Prefixo montado em main.py: /api/projects
"""

import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.core.config import settings
from app.db.supabase import get_supabase
from app.schemas.projects import (
    ChatRequest,
    ChatResponse,
    ChatMessageResponse,
    DocumentResponse,
    ProjectCreate,
    ProjectResponse,
)
from auth.middleware import AuthUser, get_current_user
from app.services.limits_service import (
    check_project_limit,
    check_question_limit,
    log_usage,
)
from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue
from rag.query import query_documents

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_qdrant() -> QdrantClient:
    import os
    url = os.environ.get("QDRANT_URL", settings.QDRANT_URL)
    api_key = os.environ.get("QDRANT_API_KEY", settings.QDRANT_API_KEY)
    if url:
        return QdrantClient(url=url, api_key=api_key or None)
    return QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)


def _assert_project_owner(project: dict | None, user_id: str) -> dict:
    """Garante que o projeto existe e pertence ao usuário autenticado."""
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    if project["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return project


def _delete_qdrant_points(tenant_id: str, collection: str, extra_filter: Filter | None = None) -> None:
    """
    Deleta pontos do Qdrant.
    Se extra_filter for None, apaga a collection inteira (útil ao deletar projeto).
    """
    qdrant = _get_qdrant()
    collections = {c.name for c in qdrant.get_collections().collections}
    if collection not in collections:
        return

    if extra_filter is None:
        qdrant.delete_collection(collection)
    else:
        qdrant.delete(collection_name=collection, points_selector=extra_filter)


# ── Projects ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um novo projeto para o usuário autenticado."""
    check_project_limit(user.id)

    result = (
        supabase.table("projects")
        .insert({
            "user_id": user.id,
            "name": body.name,
            "description": body.description,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Falha ao criar projeto")

    log_usage(user.id, "project_create")
    return result.data[0]


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os projetos do usuário autenticado."""
    result = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verifica ownership
    proj_result = supabase.table("projects") \
        .select("id") \
        .eq("id", project_id) \
        .eq("user_id", user.id) \
        .execute()

    if not proj_result.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # 1. Remove arquivos do Supabase Storage
    docs_result = (
        supabase.table("documents")
        .select("file_url, file_name")
        .eq("project_id", project_id)
        .execute()
    )
    storage_paths = [
        f"{user.id}/{project_id}/{doc['file_name']}"
        for doc in (docs_result.data or [])
    ]
    if storage_paths:
        try:
            supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove(storage_paths)
        except Exception:
            pass  # Não bloqueia a deleção se storage falhar

    # 2. Remove vetores do Qdrant
    collection = f"tenant_{user.id}"
    _delete_qdrant_points(
        tenant_id=user.id,
        collection=collection,
        extra_filter=Filter(
            must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
        ),
    )

    # 3. Deleta registros do banco
    supabase.table("projects").delete().eq("id", project_id).execute()

    return {"message": "Projeto deletado com sucesso", "project_id": project_id}

# ── Documents ─────────────────────────────────────────────────────────────────
# Upload e status de processamento → api/upload.py (assíncrono com BackgroundTasks)

@router.get("/{project_id}/files", response_model=list[DocumentResponse])
async def list_files(
    project_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os documentos de um projeto."""
    proj_result = supabase.table("projects").select("id, user_id").eq("id", project_id).single().execute()
    _assert_project_owner(proj_result.data, user.id)

    result = (
        supabase.table("documents")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{project_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    project_id: str,
    file_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Remove um arquivo: Storage, vetores no Qdrant e registro no banco."""
    # Verifica ownership do projeto
    proj_result = supabase.table("projects").select("id, user_id").eq("id", project_id).single().execute()
    _assert_project_owner(proj_result.data, user.id)

    # Busca o documento
    doc_result = (
        supabase.table("documents")
        .select("*")
        .eq("id", file_id)
        .eq("project_id", project_id)
        .single()
        .execute()
    )
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    doc = doc_result.data
    file_name = doc["file_name"]

    # 1. Remove do Supabase Storage
    storage_path = f"{user.id}/{project_id}/{file_name}"
    try:
        supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
    except Exception:
        pass

    # 2. Remove vetores do Qdrant filtrados por file_name + project_id
    collection = f"tenant_{user.id}"
    _delete_qdrant_points(
        tenant_id=user.id,
        collection=collection,
        extra_filter=Filter(
            must=[
                FieldCondition(key="project_id", match=MatchValue(value=project_id)),
                FieldCondition(key="file_name",  match=MatchValue(value=file_name)),
            ]
        ),
    )

    # 3. Remove do banco
    supabase.table("documents").delete().eq("id", file_id).execute()


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/{project_id}/chat", response_model=ChatResponse)
async def chat(
    project_id: str,
    body: ChatRequest,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Envia uma mensagem ao RAG e retorna a resposta com fontes.
    O histórico das últimas 10 mensagens é automaticamente incluído no contexto.
    """
    proj_result = supabase.table("projects").select("id, user_id").eq("id", project_id).single().execute()
    _assert_project_owner(proj_result.data, user.id)

    check_question_limit(user.id)

    # Busca as últimas 10 mensagens para contexto de conversa
    history_result = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    # Inverte para ordem cronológica
    chat_history = list(reversed(history_result.data or []))

    # Chama o RAG em thread para não bloquear o event loop
    rag_result = await asyncio.to_thread(
        query_documents,
        question=body.message,
        tenant_id=user.id,
        project_id=project_id,
        chat_history=chat_history,
    )

    if rag_result.status != "success":
        raise HTTPException(status_code=500, detail=rag_result.message)

    sources = [s.to_dict() for s in rag_result.sources]

    # Persiste as duas mensagens (user + assistant) no banco
    msgs_to_insert = [
        {"project_id": project_id, "role": "user",      "content": body.message, "sources": []},
        {"project_id": project_id, "role": "assistant",  "content": rag_result.answer, "sources": sources},
    ]
    insert_result = supabase.table("chat_messages").insert(msgs_to_insert).execute()
    if not insert_result.data or len(insert_result.data) < 2:
        raise HTTPException(status_code=500, detail="Falha ao salvar mensagens")

    user_msg, assistant_msg = insert_result.data[0], insert_result.data[1]

    log_usage(user.id, "question", project_id)

    return ChatResponse(
        user_message=ChatMessageResponse(**user_msg),
        assistant_message=ChatMessageResponse(**assistant_msg),
        tokens=rag_result.tokens.to_dict(),
    )


@router.get("/{project_id}/history", response_model=list[ChatMessageResponse])
async def get_history(
    project_id: str,
    limit: int = 50,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Retorna o histórico de conversas de um projeto (padrão: últimas 50 mensagens)."""
    proj_result = supabase.table("projects").select("id, user_id").eq("id", project_id).single().execute()
    _assert_project_owner(proj_result.data, user.id)

    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=False)
        .limit(min(limit, 200))
        .execute()
    )
    return result.data
