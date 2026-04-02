from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Projects ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    created_at: datetime


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    project_id: str
    file_name: str
    file_url: str
    chunks_count: int
    status: str              # "processing" | "ready" | "error"
    error_message: str | None = None
    created_at: datetime


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str | None = None    # opcional — se None e HISTORY ativo, cria nova sessão


class ChatMessageResponse(BaseModel):
    id: str
    project_id: str
    role: str                        # "user" | "assistant"
    content: str
    sources: list[dict[str, Any]]    # [{file_name, page_number, score}]
    created_at: datetime
    session_id: str | None = None    # preenchido quando FEATURE_HISTORY=true


class ChatResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    tokens: dict[str, int]           # {prompt, completion, total}
    session_id: str | None = None    # retorna o session_id criado/usado


# ── Members ───────────────────────────────────────────────────────────────────

class MemberInvite(BaseModel):
    email: str
    role: Literal["viewer", "editor"]   # "owner" só é atribuído na criação do projeto


class MemberUpdate(BaseModel):
    role: Literal["viewer", "editor"]   # owner não pode ser rebaixado via PATCH


class MemberResponse(BaseModel):
    user_id: str
    email: str
    role: str                           # "owner" | "editor" | "viewer"
    created_at: datetime
