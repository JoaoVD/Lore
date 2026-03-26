"""
api/upload.py
-------------
Endpoint de upload assíncrono de documentos.

Fluxo (não bloqueante):
  1. Valida tipo e tamanho do arquivo.
  2. Faz upload dos bytes para o Supabase Storage.
  3. Grava arquivo temporário no disco (para o LlamaIndex ler depois).
  4. Insere registro em `documents` com status="processing".
  5. Retorna imediatamente ao cliente: {document_id, status="processing"}.
  6. BackgroundTask executa ingest_document() na thread pool.
  7. Ao concluir, atualiza documents.status → "ready" ou "error".

Rotas expostas (montadas em /api/projects):
  POST   /{project_id}/upload
  GET    /{project_id}/files/{file_id}/status
"""

import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from supabase import Client

from app.api.projects.permissions import ProjectAccess, require_project_access
from app.core.config import settings
from app.db.supabase import get_supabase
from app.schemas.projects import DocumentResponse
from app.services.limits_service import check_document_limit, log_usage
from rag.ingest import ingest_document

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Constantes ────────────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS: dict[str, str] = {
    ".pdf":  "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt":  "text/plain",
}
MAX_FILE_BYTES = 20 * 1024 * 1024   # 20 MB

# ── Response schemas ─────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: str
    status: str          # sempre "processing" na resposta inicial
    file_name: str
    file_url: str
    message: str = "Arquivo recebido. A ingestão está sendo processada em segundo plano."


class StatusResponse(BaseModel):
    document_id: str
    status: str                  # "processing" | "ready" | "error"
    chunks_count: int
    error_message: str | None
    file_name: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _upload_to_storage(supabase: Client, path: str, content: bytes, content_type: str) -> str:
    """Faz upload para o Supabase Storage e retorna a URL pública."""
    supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": content_type},
    )
    return supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(path)


# ── Background task ───────────────────────────────────────────────────────────

def _run_ingest(
    document_id: str,
    tmp_path: str,
    tenant_id: str,
    project_id: str,
    storage_path: str,
    original_filename: str,
) -> None:
    """
    Executada na thread pool do FastAPI após a resposta ser enviada ao cliente.

    Responsabilidades:
    - Chama ingest_document() (síncrono, pode demorar 5-60s dependendo do arquivo).
    - Atualiza documents.status para "ready" ou "error".
    - Apaga o arquivo temporário em qualquer caso.

    Nota: não usa Depends() — obtém o cliente Supabase via singleton direto.
    """
    supabase = get_supabase()

    try:
        logger.info("[bg] Iniciando ingestão | doc=%s tenant=%s project=%s", document_id, tenant_id, project_id)
        result = ingest_document(
            file_path=Path(tmp_path),
            tenant_id=tenant_id,
            project_id=project_id,
            original_filename=original_filename,
        )

        if result.status == "success":
            logger.info("[bg] Ingestão OK | doc=%s chunks=%d", document_id, result.chunks)
            supabase.table("documents").update({
                "status": "ready",
                "chunks_count": result.chunks,
            }).eq("id", document_id).execute()
        else:
            logger.error("[bg] Ingestão falhou | doc=%s msg=%s", document_id, result.message)
            supabase.table("documents").update({
                "status": "error",
                "error_message": result.message[:500],
            }).eq("id", document_id).execute()

            # Rollback do Storage se ingestão falhar
            try:
                supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
            except Exception:
                pass

    except Exception as exc:
        logger.exception("[bg] Exceção inesperada na ingestão | doc=%s", document_id)
        try:
            supabase.table("documents").update({
                "status": "error",
                "error_message": str(exc)[:500],
            }).eq("id", document_id).execute()
        except Exception:
            pass

    finally:
        # Apaga o arquivo temporário independente do resultado
        try:
            Path(tmp_path).unlink(missing_ok=True)
            logger.debug("[bg] Arquivo temporário removido: %s", tmp_path)
        except Exception:
            pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/{project_id}/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload assíncrono de documento",
    description=(
        "Recebe o arquivo, salva no Storage e inicia a ingestão em segundo plano. "
        "Retorna imediatamente com status='processing'. "
        "Use GET /{project_id}/files/{file_id}/status para acompanhar o progresso."
    ),
)
async def upload_document(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    access: ProjectAccess = Depends(require_project_access("editor")),
    supabase: Client = Depends(get_supabase),
) -> UploadResponse:

    # ── 1. Verifica limite de documentos do plano ────────────────────────────
    # require_project_access("editor") já validou acesso; owner_id é o dono do projeto
    check_document_limit(access.owner_id, project_id)

    # ── 2. Valida extensão ───────────────────────────────────────────────────
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Extensão '{ext}' não permitida. Aceitos: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    content_type = ALLOWED_EXTENSIONS[ext]

    # ── 3. Lê e valida tamanho ───────────────────────────────────────────────
    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo excede o limite de {MAX_FILE_BYTES // (1024*1024)} MB "
                   f"({len(content) // (1024*1024)} MB recebidos)",
        )
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio")

    # ── 4. Upload para Supabase Storage ──────────────────────────────────────
    # Usa owner_id (não o uploader) para manter todos os arquivos do projeto
    # sob o mesmo prefixo no Storage, independente de quem fez o upload.
    storage_path = f"{access.owner_id}/{project_id}/{filename}"
    try:
        file_url = _upload_to_storage(supabase, storage_path, content, content_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha no upload para Storage: {exc}")

    # ── 5. Arquivo temporário persistente (dura até o background task concluir) ──
    fd, tmp_path = tempfile.mkstemp(suffix=ext, prefix="ingest_")
    os.close(fd)
    Path(tmp_path).write_bytes(content)

    # ── 6. Insere registro com status="processing" ───────────────────────────
    doc_insert = supabase.table("documents").insert({
        "project_id":    project_id,
        "file_name":     filename,
        "file_url":      file_url,
        "chunks_count":  0,
        "status":        "processing",
        "error_message": None,
    }).execute()

    if not doc_insert.data:
        Path(tmp_path).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Falha ao registrar documento no banco")

    document_id = doc_insert.data[0]["id"]

    # ── 7. Agenda ingestão em background (não bloqueia a resposta) ───────────
    # FastAPI executa funções síncronas em background na thread pool,
    # evitando bloqueio do event loop.
    background_tasks.add_task(
        _run_ingest,
        document_id=document_id,
        tmp_path=tmp_path,
        tenant_id=access.owner_id,   # sempre o dono do projeto → collection correta no Qdrant
        project_id=project_id,
        storage_path=storage_path,
        original_filename=filename,
    )

    log_usage(access.owner_id, "document_upload", project_id)
    logger.info("Upload recebido | doc=%s file=%s size=%dKB", document_id, filename, len(content) // 1024)

    return UploadResponse(
        document_id=document_id,
        status="processing",
        file_name=filename,
        file_url=file_url,
    )


@router.get(
    "/{project_id}/files/{file_id}/status",
    response_model=StatusResponse,
    summary="Status do processamento de um documento",
    description="Retorna o status atual da ingestão: 'processing', 'ready' ou 'error'.",
)
async def get_file_status(
    project_id: str,
    file_id: str,
    access: ProjectAccess = Depends(require_project_access("viewer")),
    supabase: Client = Depends(get_supabase),
) -> StatusResponse:

    # Busca o documento
    try:
        doc_result = (
            supabase.table("documents")
            .select("id, status, chunks_count, error_message, file_name")
            .eq("id", file_id)
            .eq("project_id", project_id)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao consultar o banco de dados")
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    doc = doc_result.data[0]
    return StatusResponse(
        document_id=doc["id"],
        status=doc.get("status", "processing"),
        chunks_count=doc.get("chunks_count", 0),
        error_message=doc.get("error_message"),
        file_name=doc["file_name"],
    )
