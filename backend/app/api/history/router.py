"""
app/api/history/router.py
--------------------------
Endpoints de histórico de conversas e relatório de uso.

Sessões (chat_sessions) são criadas automaticamente pelo endpoint de chat
quando FEATURE_HISTORY=true. Aqui ficam os endpoints de leitura/busca/deleção.

Rotas (sem prefixo — caminhos completos definidos aqui):
  GET    /api/projects/{project_id}/sessions              — lista sessões
  GET    /api/projects/{project_id}/sessions/search       — busca em mensagens
  GET    /api/projects/{project_id}/sessions/{session_id} — mensagens de uma sessão
  DELETE /api/projects/{project_id}/sessions/{session_id} — deleta sessão
  GET    /api/projects/{project_id}/usage                 — relatório de uso
"""

from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.features import Features
from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

router = APIRouter()


# ── Sessões ───────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/sessions")
async def list_sessions(
    project_id: str,
    limit: int = 20,
    offset: int = 0,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Lista todas as sessões de chat do usuário neste projeto, mais recentes primeiro."""
    if not Features.HISTORY:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    result = (
        supabase.table("chat_sessions")
        .select("id, title, created_at, updated_at, message_count")
        .eq("project_id", project_id)
        .eq("user_id", user.id)
        .order("updated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"sessions": result.data or [], "total": len(result.data or [])}


@router.get("/api/projects/{project_id}/sessions/search")
async def search_sessions(
    project_id: str,
    q: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Busca full-text em mensagens do projeto. Retorna as 20 mais recentes."""
    if not Features.HISTORY:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Termo de busca muito curto")

    result = (
        supabase.table("chat_messages")
        .select("id, session_id, role, content, created_at")
        .eq("project_id", project_id)
        .eq("user_id", user.id)
        .ilike("content", f"%{q.strip()}%")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"results": result.data or [], "query": q}


@router.get("/api/projects/{project_id}/sessions/{session_id}")
async def get_session_messages(
    project_id: str,
    session_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Retorna todas as mensagens de uma sessão específica."""
    if not Features.HISTORY:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    # Verifica que a sessão pertence ao usuário
    session = (
        supabase.table("chat_sessions")
        .select("id, title, created_at, message_count")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .limit(1)
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

    messages = (
        supabase.table("chat_messages")
        .select("id, role, content, sources, created_at")
        .eq("session_id", session_id)
        .eq("user_id", user.id)
        .order("created_at", desc=False)
        .execute()
    )
    return {
        "session": session.data[0],
        "messages": messages.data or [],
    }


@router.delete("/api/projects/{project_id}/sessions/{session_id}", status_code=204)
async def delete_session(
    project_id: str,
    session_id: str,
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Deleta uma sessão e todas as suas mensagens (ON DELETE CASCADE)."""
    if not Features.HISTORY:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    existing = (
        supabase.table("chat_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

    supabase.table("chat_sessions").delete().eq("id", session_id).execute()


# ── Relatório de uso ──────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/usage")
async def get_usage_report(
    project_id: str,
    period: str = "30d",
    user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Relatório de uso do projeto: perguntas, sessões, usuários únicos e tempo economizado.
    period: "7d" | "30d" | "90d" | "all"
    """
    if not Features.USAGE_REPORT:
        raise HTTPException(status_code=404, detail="Feature não disponível")

    # Verifica que o usuário tem acesso ao projeto
    proj = (
        supabase.table("projects")
        .select("id, user_id")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    if not proj.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # Calcula data de início
    periods_map = {"7d": 7, "30d": 30, "90d": 90}
    days = periods_map.get(period)
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat() if days else None

    # Busca todas as perguntas do período
    query = (
        supabase.table("chat_messages")
        .select("id, content, created_at, user_id, session_id")
        .eq("project_id", project_id)
        .eq("role", "user")
    )
    if start_date:
        query = query.gte("created_at", start_date)

    questions = query.order("created_at", desc=True).execute()
    data = questions.data or []

    # Perguntas mais frequentes (match exato truncado)
    question_texts = [m["content"][:80] for m in data]
    top_questions = [
        {"question": q, "count": c}
        for q, c in Counter(question_texts).most_common(10)
    ]

    # Uso por dia
    daily: dict[str, int] = defaultdict(int)
    for m in data:
        day = m["created_at"][:10]
        daily[day] += 1

    daily_sorted = [
        {"date": k, "questions": v}
        for k, v in sorted(daily.items())
    ]

    unique_users = len({m["user_id"] for m in data if m.get("user_id")})
    unique_sessions = len({m["session_id"] for m in data if m.get("session_id")})
    total_questions = len(data)

    return {
        "period": period,
        "summary": {
            "total_questions": total_questions,
            "total_sessions":  unique_sessions,
            "unique_users":    unique_users,
            "minutes_saved":   total_questions * 3,
            "hours_saved":     round(total_questions * 3 / 60, 1),
        },
        "top_questions": top_questions,
        "daily_usage":   daily_sorted,
        "most_active_day": max(daily, key=lambda k: daily[k]) if daily else None,
    }
