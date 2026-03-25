"""
app/api/integrations/google_drive.py
--------------------------------------
Integração com Google Drive para sincronização automática de documentos.

Fluxo OAuth completo:
  1. Frontend chama GET /api/integrations/google-drive/auth (com JWT do Supabase).
     → Backend gera URL de autorização do Google com state=<JWT assinado contendo user_id>.
     → Frontend redireciona o usuário para a URL retornada.

  2. Google redireciona para GET /api/integrations/google-drive/callback?code=...&state=...
     → Backend valida o state, troca o code por tokens e salva em `integrations`.
     → Backend redireciona para {FRONTEND_URL}/integrations?status=connected.

Rotas de integração (prefixo /api/integrations):
  GET  /google-drive/auth          → Gera URL de autorização OAuth
  GET  /google-drive/callback      → Recebe code do Google, salva tokens
  GET  /google-drive/status        → Verifica se usuário tem Drive conectado
  GET  /google-drive/folders       → Lista pastas do Drive do usuário

Rotas de projeto (prefixo /api/projects):
  GET    /{project_id}/integrations/google-drive          → Status da integração no projeto
  POST   /{project_id}/integrations/google-drive          → Vincula pasta ao projeto
  POST   /{project_id}/integrations/google-drive/sync     → Sincroniza arquivos da pasta
  DELETE /{project_id}/integrations/google-drive          → Remove vinculação
"""

import io
import logging
import os
import secrets
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from jose import JWTError, jwt
from pydantic import BaseModel
from supabase import Client

from app.api.projects.permissions import ProjectAccess, require_project_access
from app.core.config import settings
from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user
from rag.ingest import ingest_document

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# MIMEs aceitos para ingestão → extensão de arquivo
ALLOWED_MIME_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}

FOLDER_MIME = "application/vnd.google-apps.folder"

# Tempo de validade do state JWT para o fluxo OAuth (10 minutos)
_STATE_TTL_MINUTES = 10

# ── Routers ───────────────────────────────────────────────────────────────────

# Montado em /api/integrations
integrations_router = APIRouter()

# Montado em /api/projects (rotas específicas de projeto)
project_integrations_router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────


class AuthUrlResponse(BaseModel):
    auth_url: str


class DriveConnectionStatus(BaseModel):
    connected: bool


class FolderItem(BaseModel):
    id: str
    name: str


class LinkFolderBody(BaseModel):
    folder_id: str
    folder_name: str


class ProjectIntegrationStatus(BaseModel):
    connected: bool          # se o usuário tem credentials do Drive salvas
    folder_id: str | None
    folder_name: str | None
    last_synced_at: datetime | None


class SyncResponse(BaseModel):
    message: str
    status: str              # "started"


# ── Helpers privados ──────────────────────────────────────────────────────────


def _build_flow() -> Flow:
    """Cria um Flow OAuth com as credenciais configuradas."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Integração com Google Drive não está configurada neste servidor",
        )
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=DRIVE_SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )


def _encode_state(user_id: str, project_id: str | None = None) -> str:
    """Codifica o user_id (e opcionalmente project_id) em um JWT assinado para o state OAuth."""
    payload = {
        "user_id": user_id,
        "project_id": project_id,
        "nonce": secrets.token_hex(8),
        "exp": datetime.utcnow() + timedelta(minutes=_STATE_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode_state(state: str) -> tuple[str, str | None]:
    """Decodifica e valida o state JWT. Retorna (user_id, project_id)."""
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload["user_id"], payload.get("project_id")
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State de autenticação inválido ou expirado. Tente conectar novamente.",
        )


def _get_credentials(user_id: str, supabase: Client) -> Credentials:
    """
    Busca os tokens do Google Drive armazenados e retorna um objeto Credentials.
    Atualiza o access_token no banco se estiver expirado.

    Raises:
        HTTP 401 se o usuário não tiver o Drive conectado.
    """
    row = (
        supabase.table("integrations")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", user_id)
        .eq("provider", "google_drive")
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Drive não conectado. Acesse /api/integrations/google-drive/auth",
        )

    data = row.data
    expiry = (
        datetime.fromisoformat(data["expires_at"]).replace(tzinfo=timezone.utc)
        if data.get("expires_at")
        else None
    )

    creds = Credentials(
        token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=DRIVE_SCOPES,
        expiry=expiry,
    )

    # Renova o access_token se expirado
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            supabase.table("integrations").update({
                "access_token": creds.token,
                "expires_at": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("user_id", user_id).eq("provider", "google_drive").execute()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token do Google Drive expirou e não pôde ser renovado: {exc}. "
                       "Reconecte em /api/integrations/google-drive/auth",
            )

    return creds


def _build_drive_service(creds: Credentials):
    """Constrói o cliente da Google Drive API v3."""
    return build("drive", "v3", credentials=creds, cache_discovery=False)


# ── Background: sincronização ─────────────────────────────────────────────────


def _sync_drive_folder_bg(
    project_id: str,
    folder_id: str,
    owner_id: str,
    user_id: str,
) -> None:
    """
    Executada na thread pool após a resposta 202 ser enviada ao cliente.

    Fluxo por arquivo:
      1. Lista arquivos PDF/DOCX/TXT na pasta do Drive.
      2. Pula arquivos já sincronizados (source_id presente em documents).
      3. Faz download do arquivo.
      4. Faz upload para Supabase Storage em {owner_id}/{project_id}/{filename}.
      5. Insere registro em documents com status="processing".
      6. Executa ingest_document() sincronamente (já estamos em thread pool).
      7. Atualiza status e last_synced_at.
    """
    supabase = get_supabase()
    synced = skipped = failed = 0

    try:
        creds = _get_credentials(user_id, supabase)
    except HTTPException as exc:
        logger.error("[gdrive sync] Credenciais inválidas | project=%s: %s", project_id, exc.detail)
        return

    service = _build_drive_service(creds)

    # Monta a query de arquivos (só tipos permitidos, não na lixeira)
    mime_filter = " or ".join(
        f"mimeType='{m}'" for m in ALLOWED_MIME_TYPES
    )
    query = f"'{folder_id}' in parents and trashed=false and ({mime_filter})"

    try:
        response = service.files().list(
            q=query,
            fields="files(id, name, mimeType, size)",
            pageSize=100,
        ).execute()
        files = response.get("files", [])
    except Exception as exc:
        logger.error("[gdrive sync] Erro ao listar arquivos | project=%s: %s", project_id, exc)
        return

    logger.info("[gdrive sync] %d arquivos encontrados | project=%s", len(files), project_id)

    for file in files:
        file_id = file["id"]
        filename = file["name"]
        mime_type = file.get("mimeType", "").split(";")[0].strip()
        ext = ALLOWED_MIME_TYPES.get(mime_type)

        if not ext:
            continue

        # 1. Pula se já foi sincronizado
        existing = (
            supabase.table("documents")
            .select("id")
            .eq("project_id", project_id)
            .eq("source_id", file_id)
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        tmp_path: str | None = None
        document_id: str | None = None
        storage_path = f"{owner_id}/{project_id}/{filename}"

        try:
            # 2. Download do Google Drive
            request = service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            content = fh.getvalue()

            if not content:
                logger.warning("[gdrive sync] Arquivo vazio ignorado: %s", filename)
                continue

            # 3. Upload para Supabase Storage
            supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": mime_type},
            )
            file_url = supabase.storage.from_(
                settings.SUPABASE_STORAGE_BUCKET
            ).get_public_url(storage_path)

            # 4. Insere registro com status="processing" e source_id rastreável
            doc_insert = supabase.table("documents").insert({
                "project_id":    project_id,
                "file_name":     filename,
                "file_url":      file_url,
                "chunks_count":  0,
                "status":        "processing",
                "error_message": None,
                "source_id":     file_id,        # rastreabilidade para deduplicação
            }).execute()

            if not doc_insert.data:
                logger.error("[gdrive sync] Falha ao inserir documento no banco: %s", filename)
                failed += 1
                continue

            document_id = doc_insert.data[0]["id"]

            # 5. Salva em arquivo temporário para o LlamaIndex
            fd, tmp_path = tempfile.mkstemp(suffix=ext, prefix="gdrive_")
            os.close(fd)
            Path(tmp_path).write_bytes(content)

            # 6. Ingestão síncrona (já estamos na thread pool do BackgroundTasks)
            result = ingest_document(
                file_path=Path(tmp_path),
                tenant_id=owner_id,
                project_id=project_id,
                original_filename=filename,
            )

            if result.status == "success":
                supabase.table("documents").update({
                    "status": "ready",
                    "chunks_count": result.chunks,
                }).eq("id", document_id).execute()
                synced += 1
                logger.info("[gdrive sync] OK | file=%s chunks=%d", filename, result.chunks)
            else:
                supabase.table("documents").update({
                    "status": "error",
                    "error_message": result.message[:500],
                }).eq("id", document_id).execute()
                # Rollback Storage
                try:
                    supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
                except Exception:
                    pass
                failed += 1
                logger.error("[gdrive sync] Ingestão falhou | file=%s: %s", filename, result.message)

        except Exception as exc:
            failed += 1
            logger.exception("[gdrive sync] Erro inesperado | file=%s: %s", filename, exc)
            if document_id:
                try:
                    supabase.table("documents").update({
                        "status": "error",
                        "error_message": str(exc)[:500],
                    }).eq("id", document_id).execute()
                except Exception:
                    pass
        finally:
            if tmp_path:
                try:
                    Path(tmp_path).unlink(missing_ok=True)
                except Exception:
                    pass

    # Atualiza last_synced_at após processar todos os arquivos
    supabase.table("project_integrations").update({
        "last_synced_at": datetime.utcnow().isoformat(),
    }).eq("project_id", project_id).eq("provider", "google_drive").execute()

    logger.info(
        "[gdrive sync] Concluído | project=%s synced=%d skipped=%d failed=%d",
        project_id, synced, skipped, failed,
    )


# ── Endpoints: /api/integrations/google-drive ─────────────────────────────────


@integrations_router.get(
    "/google/authorize",
    response_model=AuthUrlResponse,
    summary="Inicia o fluxo OAuth do Google Drive",
)
@integrations_router.get(
    "/google-drive/auth",
    response_model=AuthUrlResponse,
    summary="Inicia o fluxo OAuth do Google Drive (alias)",
    include_in_schema=False,
)
async def google_drive_auth(
    user: AuthUser = Depends(get_current_user),
    project_id: str | None = Query(None, description="ID do projeto para redirecionar após OAuth"),
) -> AuthUrlResponse:
    """
    Retorna a URL de autorização do Google Drive.
    O frontend deve redirecionar o usuário para essa URL.
    """
    flow = _build_flow()
    state = _encode_state(user.id, project_id)
    auth_url, _ = flow.authorization_url(
        access_type="offline",      # solicita refresh_token
        include_granted_scopes="true",
        prompt="consent",           # garante que o refresh_token seja retornado
        state=state,
    )
    return AuthUrlResponse(auth_url=auth_url)


@integrations_router.get(
    "/google-drive/callback",
    summary="Callback OAuth do Google Drive",
    description="Endpoint chamado pelo Google após a autorização. Salva tokens e redireciona para o frontend.",
)
async def google_drive_callback(
    code: str = Query(..., description="Código de autorização retornado pelo Google"),
    state: str = Query(..., description="State JWT que contém o user_id"),
    error: str | None = Query(None, description="Mensagem de erro caso o usuário negue acesso"),
    supabase: Client = Depends(get_supabase),
):
    """
    Recebe o código OAuth do Google, troca por tokens e salva na tabela `integrations`.
    Redireciona para o frontend após o processo.
    """
    # Valida state e extrai user_id + project_id (mesmo em caso de erro, para redirecionar certo)
    try:
        user_id, project_id = _decode_state(state)
    except HTTPException:
        user_id, project_id = None, None

    def _redirect_url(param: str) -> str:
        if project_id:
            return f"{settings.FRONTEND_URL}/project/{project_id}/settings?{param}"
        return f"{settings.FRONTEND_URL}/dashboard?{param}"

    # Usuário negou acesso
    if error:
        logger.warning("[gdrive callback] Acesso negado pelo usuário: %s", error)
        return RedirectResponse(url=_redirect_url("gdrive_error=denied"))

    if not user_id:
        return RedirectResponse(url=_redirect_url("gdrive_error=invalid_state"))

    # Troca o code por tokens
    try:
        flow = _build_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials
    except Exception as exc:
        logger.error("[gdrive callback] Falha ao trocar code por tokens: %s", exc)
        return RedirectResponse(url=_redirect_url("gdrive_error=token_exchange"))

    expires_at = (
        creds.expiry.replace(tzinfo=timezone.utc).isoformat()
        if creds.expiry
        else (datetime.utcnow() + timedelta(hours=1)).isoformat()
    )

    # Salva (ou atualiza) tokens na tabela integrations
    supabase.table("integrations").upsert({
        "user_id":       user_id,
        "provider":      "google_drive",
        "access_token":  creds.token,
        "refresh_token": creds.refresh_token,
        "expires_at":    expires_at,
        "updated_at":    datetime.utcnow().isoformat(),
    }, on_conflict="user_id,provider").execute()

    logger.info("[gdrive callback] Tokens salvos | user=%s project=%s", user_id, project_id)
    return RedirectResponse(url=_redirect_url("gdrive_connected=1"))


@integrations_router.get(
    "/google-drive/status",
    response_model=DriveConnectionStatus,
    summary="Verifica se o Google Drive está conectado",
)
async def google_drive_status(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> DriveConnectionStatus:
    """Retorna se o usuário já autorizou o Google Drive."""
    row = (
        supabase.table("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "google_drive")
        .execute()
    )
    return DriveConnectionStatus(connected=bool(row.data))


@integrations_router.get(
    "/google-drive/folders",
    response_model=list[FolderItem],
    summary="Lista pastas do Google Drive do usuário",
)
async def list_drive_folders(
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
) -> list[FolderItem]:
    """
    Retorna até 100 pastas do Google Drive do usuário autenticado.
    Requer que o Google Drive já esteja conectado.
    """
    creds = _get_credentials(user.id, supabase)
    service = _build_drive_service(creds)

    try:
        response = service.files().list(
            q=f"mimeType='{FOLDER_MIME}' and trashed=false",
            fields="files(id, name)",
            orderBy="name",
            pageSize=100,
        ).execute()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao acessar o Google Drive: {exc}")

    return [
        FolderItem(id=f["id"], name=f["name"])
        for f in response.get("files", [])
    ]


# ── Endpoints: /api/projects/{project_id}/integrations/google-drive ───────────


@project_integrations_router.get(
    "/{project_id}/integrations/google-drive",
    response_model=ProjectIntegrationStatus,
    summary="Status da integração Google Drive no projeto",
)
async def get_project_integration_status(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("viewer")),
    supabase: Client = Depends(get_supabase),
) -> ProjectIntegrationStatus:
    """Retorna se há uma pasta do Drive vinculada ao projeto e quando foi sincronizada."""
    # Verifica se o usuário tem Drive conectado
    integration_row = (
        supabase.table("integrations")
        .select("id")
        .eq("user_id", access.owner_id)
        .eq("provider", "google_drive")
        .execute()
    )
    connected = bool(integration_row.data)

    # Verifica se há pasta vinculada ao projeto
    proj_int = (
        supabase.table("project_integrations")
        .select("folder_id, folder_name, last_synced_at")
        .eq("project_id", project_id)
        .eq("provider", "google_drive")
        .execute()
    )

    if not proj_int.data:
        return ProjectIntegrationStatus(
            connected=connected,
            folder_id=None,
            folder_name=None,
            last_synced_at=None,
        )

    row = proj_int.data[0]
    return ProjectIntegrationStatus(
        connected=connected,
        folder_id=row["folder_id"],
        folder_name=row["folder_name"],
        last_synced_at=row.get("last_synced_at"),
    )


@project_integrations_router.post(
    "/{project_id}/integrations/google-drive",
    response_model=ProjectIntegrationStatus,
    status_code=status.HTTP_201_CREATED,
    summary="Vincula uma pasta do Google Drive ao projeto",
)
async def link_drive_folder(
    project_id: str,
    body: LinkFolderBody,
    access: ProjectAccess = Depends(require_project_access("editor")),
    supabase: Client = Depends(get_supabase),
) -> ProjectIntegrationStatus:
    """
    Vincula uma pasta do Google Drive ao projeto.
    Se já houver uma pasta vinculada, substitui pela nova.
    Exige role mínimo: editor.
    """
    # Garante que o owner tem o Drive conectado
    _get_credentials(access.owner_id, supabase)

    supabase.table("project_integrations").upsert({
        "project_id":  project_id,
        "provider":    "google_drive",
        "folder_id":   body.folder_id,
        "folder_name": body.folder_name,
    }, on_conflict="project_id,provider").execute()

    return ProjectIntegrationStatus(
        connected=True,
        folder_id=body.folder_id,
        folder_name=body.folder_name,
        last_synced_at=None,
    )


@project_integrations_router.post(
    "/{project_id}/integrations/google-drive/sync",
    response_model=SyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Sincroniza arquivos da pasta vinculada ao Google Drive",
)
async def sync_drive_folder(
    project_id: str,
    background_tasks: BackgroundTasks,
    access: ProjectAccess = Depends(require_project_access("editor")),
    supabase: Client = Depends(get_supabase),
) -> SyncResponse:
    """
    Inicia a sincronização em segundo plano dos arquivos PDF/DOCX/TXT
    da pasta do Google Drive vinculada ao projeto.
    Retorna imediatamente com status='started'.
    Exige role mínimo: editor.
    """
    # Busca a pasta vinculada
    proj_int = (
        supabase.table("project_integrations")
        .select("folder_id, folder_name")
        .eq("project_id", project_id)
        .eq("provider", "google_drive")
        .single()
        .execute()
    )
    if not proj_int.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma pasta do Google Drive vinculada a este projeto. "
                   "Use POST /integrations/google-drive primeiro.",
        )

    folder_id = proj_int.data["folder_id"]
    folder_name = proj_int.data["folder_name"]

    # Valida credenciais antes de enfileirar (falha rápido se não conectado)
    _get_credentials(access.owner_id, supabase)

    background_tasks.add_task(
        _sync_drive_folder_bg,
        project_id=project_id,
        folder_id=folder_id,
        owner_id=access.owner_id,
        user_id=access.owner_id,   # credenciais são sempre do owner do projeto
    )

    logger.info(
        "[gdrive] Sync agendado | project=%s folder=%s (%s)",
        project_id, folder_id, folder_name,
    )
    return SyncResponse(
        message=f"Sincronização da pasta '{folder_name}' iniciada em segundo plano.",
        status="started",
    )


@project_integrations_router.delete(
    "/{project_id}/integrations/google-drive",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a vinculação do Google Drive do projeto",
)
async def unlink_drive_folder(
    project_id: str,
    access: ProjectAccess = Depends(require_project_access("editor")),
    supabase: Client = Depends(get_supabase),
):
    """
    Remove a vinculação da pasta do Google Drive com o projeto.
    Documentos já ingeridos não são removidos.
    Exige role mínimo: editor.
    """
    result = (
        supabase.table("project_integrations")
        .delete()
        .eq("project_id", project_id)
        .eq("provider", "google_drive")
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma integração com Google Drive encontrada neste projeto",
        )
