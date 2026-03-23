"""
app/api/projects/router.py
--------------------------
Rotas de negócio da plataforma RAG.

Todas as rotas exigem JWT válido do Supabase (via get_current_user).
Operações sensíveis usam require_project_access para verificar o role
do usuário dentro do projeto antes de executar qualquer lógica.

Hierarquia de permissões:
    owner  → pode tudo (deletar projeto, gerenciar membros)
    editor → pode fazer upload e deletar documentos
    viewer → pode consultar (chat, histórico, listar arquivos)

Prefixo montado em main.py: /api/projects
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.api.projects.permissions import (
    ProjectAccess,
    ROLE_HIERARCHY,
    require_project_access,
)
from app.core.config import settings
from app.db.supabase import get_supabase
from app.schemas.projects import (
    ChatRequest,
    ChatResponse,
    ChatMessageResponse,
    DocumentResponse,
    MemberInvite,
    MemberResponse,
    MemberUpdate,
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


def _delete_qdrant_points(
    collection: str,
    extra_filter: Filter | None = None,
) -> None:
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


def _find_user_id_by_email(supabase: Client, email: str) -> str | None:
    """
    Busca o user_id de um usuário pelo e-mail via API de admin do Supabase.

    NOTA: Para bases de usuários muito grandes, crie uma função RPC no Supabase:
        CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
        RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
          SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
        $$;
    e substitua esta função por: supabase.rpc("get_user_id_by_email", {"user_email": email})
    """
    try:
        page = 1
        while True:
            users = supabase.auth.admin.list_users(page=page, per_page=1000)
            if not users:
                break
            for u in users:
                if u.email == email:
                    return str(u.id)
            if len(users) < 1000:
                break
            page += 1
    except Exception:
        pass
    return None


# ── Projects ──────────────────────────────────────────────────────────────────

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Cria um novo projeto e define o criador como owner em project_members."""
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

    project = result.data[0]

    # Registra o criador como owner em project_members
    supabase.table("project_members").insert({
        "project_id": project["id"],
        "user_id": user.id,
        "role": "owner",
    }).execute()

    log_usage(user.id, "project_create")
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Lista todos os projetos dos quais o usuário é membro (qualquer role).
    Inclui projetos legados (sem entrada em project_members) onde o usuário é dono direto.
    """
    # Projetos via project_members (novo sistema)
    member_rows = (
        supabase.table("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .execute()
    )
    member_ids = {r["project_id"] for r in (member_rows.data or [])}

    # Projetos legados onde user_id == usuário mas sem entrada em project_members
    owned_rows = (
        supabase.table("projects")
        .select("id")
        .eq("user_id", user.id)
        .execute()
    )
    owned_ids = {r["id"] for r in (owned_rows.data or [])}

    all_ids = list(member_ids | owned_ids)
    if not all_ids:
        return []

    result = (
        supabase.table("projects")
        .select("*")
        .in_("id", all_ids)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """Remove o projeto, todos os seus arquivos (Storage + Qdrant) e membros."""
    owner_id = access.owner_id

    # 1. Remove arquivos do Supabase Storage
    docs_result = (
        supabase.table("documents")
        .select("file_name")
        .eq("project_id", project_id)
        .execute()
    )
    storage_paths = [
        f"{owner_id}/{project_id}/{doc['file_name']}"
        for doc in (docs_result.data or [])
    ]
    if storage_paths:
        try:
            supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove(storage_paths)
        except Exception:
            pass  # Não bloqueia a deleção se storage falhar

    # 2. Remove vetores do Qdrant filtrados pelo project_id
    collection = f"tenant_{owner_id}"
    _delete_qdrant_points(
        collection=collection,
        extra_filter=Filter(
            must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
        ),
    )

    # 3. Deleta registros do banco (project_members em cascata via FK ou explicitamente)
    supabase.table("project_members").delete().eq("project_id", project_id).execute()
    supabase.table("projects").delete().eq("id", project_id).execute()


# ── Documents ─────────────────────────────────────────────────────────────────
# Upload e status de processamento → api/upload.py (assíncrono com BackgroundTasks)

@router.get("/{project_id}/files", response_model=list[DocumentResponse])
async def list_files(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("viewer")),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os documentos de um projeto. Exige role mínimo: viewer."""
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
    access: ProjectAccess = Depends(require_project_access("editor")),
    supabase: Client = Depends(get_supabase),
):
    """Remove um arquivo: Storage, vetores no Qdrant e registro no banco. Exige role mínimo: editor."""
    owner_id = access.owner_id

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
    storage_path = f"{owner_id}/{project_id}/{file_name}"
    try:
        supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
    except Exception:
        pass

    # 2. Remove vetores do Qdrant filtrados por file_name + project_id
    collection = f"tenant_{owner_id}"
    _delete_qdrant_points(
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
    access: ProjectAccess = Depends(require_project_access("viewer")),
    supabase: Client = Depends(get_supabase),
):
    """
    Envia uma mensagem ao RAG e retorna a resposta com fontes.
    O histórico das últimas 10 mensagens é automaticamente incluído no contexto.
    Exige role mínimo: viewer.
    """
    check_question_limit(access.owner_id)

    # Busca as últimas 10 mensagens para contexto de conversa
    history_result = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    chat_history = list(reversed(history_result.data or []))

    # Chama o RAG em thread para não bloquear o event loop
    # tenant_id é sempre o owner do projeto para garantir acesso à collection correta
    rag_result = await asyncio.to_thread(
        query_documents,
        question=body.message,
        tenant_id=access.owner_id,
        project_id=project_id,
        chat_history=chat_history,
    )

    if rag_result.status != "success":
        raise HTTPException(status_code=500, detail=rag_result.message)

    sources = [s.to_dict() for s in rag_result.sources]

    msgs_to_insert = [
        {"project_id": project_id, "role": "user",      "content": body.message,      "sources": []},
        {"project_id": project_id, "role": "assistant",  "content": rag_result.answer, "sources": sources},
    ]
    insert_result = supabase.table("chat_messages").insert(msgs_to_insert).execute()
    if not insert_result.data or len(insert_result.data) < 2:
        raise HTTPException(status_code=500, detail="Falha ao salvar mensagens")

    user_msg, assistant_msg = insert_result.data[0], insert_result.data[1]

    log_usage(access.owner_id, "question", project_id)

    return ChatResponse(
        user_message=ChatMessageResponse(**user_msg),
        assistant_message=ChatMessageResponse(**assistant_msg),
        tokens=rag_result.tokens.to_dict(),
    )


@router.get("/{project_id}/history", response_model=list[ChatMessageResponse])
async def get_history(
    project_id: str,
    limit: int = 50,
    access: ProjectAccess = Depends(require_project_access("viewer")),
    supabase: Client = Depends(get_supabase),
):
    """Retorna o histórico de conversas de um projeto. Exige role mínimo: viewer."""
    result = (
        supabase.table("chat_messages")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=False)
        .limit(min(limit, 200))
        .execute()
    )
    return result.data


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/members", response_model=list[MemberResponse])
async def list_members(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """Lista todos os membros do projeto. Exige role: owner."""
    rows = (
        supabase.table("project_members")
        .select("user_id, role, created_at")
        .eq("project_id", project_id)
        .execute()
    )

    members = []
    for row in (rows.data or []):
        try:
            user_info = supabase.auth.admin.get_user_by_id(row["user_id"])
            email = user_info.user.email or ""
        except Exception:
            email = ""
        members.append(MemberResponse(
            user_id=row["user_id"],
            email=email,
            role=row["role"],
            created_at=row["created_at"],
        ))

    return members


@router.post(
    "/{project_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    project_id: str,
    body: MemberInvite,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """
    Convida um usuário por e-mail para o projeto.
    O usuário precisa ter uma conta ativa no Lore.
    Exige role: owner.
    """
    # 1. Busca o user_id pelo e-mail
    invited_user_id = _find_user_id_by_email(supabase, body.email)
    if not invited_user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado — ele precisa ter conta no Lore",
        )

    # 2. Verifica se já é membro
    existing = (
        supabase.table("project_members")
        .select("role")
        .eq("project_id", project_id)
        .eq("user_id", invited_user_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Usuário já é membro com role '{existing.data[0]['role']}'",
        )

    # 3. Insere em project_members
    insert_result = (
        supabase.table("project_members")
        .insert({
            "project_id": project_id,
            "user_id": invited_user_id,
            "role": body.role,
        })
        .execute()
    )
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Falha ao adicionar membro")

    row = insert_result.data[0]
    return MemberResponse(
        user_id=row["user_id"],
        email=body.email,
        role=row["role"],
        created_at=row["created_at"],
    )


@router.patch("/{project_id}/members/{member_user_id}", response_model=MemberResponse)
async def update_member_role(
    project_id: str,
    member_user_id: str,
    body: MemberUpdate,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """
    Altera o role de um membro existente.
    Não é possível alterar o role do próprio owner do projeto.
    Exige role: owner.
    """
    if member_user_id == access.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar o role do owner do projeto",
        )

    # Verifica se o membro existe
    existing = (
        supabase.table("project_members")
        .select("role, created_at")
        .eq("project_id", project_id)
        .eq("user_id", member_user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    update_result = (
        supabase.table("project_members")
        .update({"role": body.role})
        .eq("project_id", project_id)
        .eq("user_id", member_user_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Falha ao atualizar role")

    row = update_result.data[0]
    try:
        user_info = supabase.auth.admin.get_user_by_id(member_user_id)
        email = user_info.user.email or ""
    except Exception:
        email = ""

    return MemberResponse(
        user_id=row["user_id"],
        email=email,
        role=row["role"],
        created_at=row["created_at"],
    )


@router.delete("/{project_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: str,
    member_user_id: str,
    access: ProjectAccess = Depends(require_project_access("owner")),
    supabase: Client = Depends(get_supabase),
):
    """
    Remove um membro do projeto.
    Não é possível remover o próprio owner do projeto.
    Exige role: owner.
    """
    if member_user_id == access.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível remover o owner do projeto",
        )

    existing = (
        supabase.table("project_members")
        .select("user_id")
        .eq("project_id", project_id)
        .eq("user_id", member_user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    supabase.table("project_members").delete() \
        .eq("project_id", project_id) \
        .eq("user_id", member_user_id) \
        .execute()
