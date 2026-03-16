"""
auth/middleware.py
------------------
FastAPI dependency que valida o JWT do Supabase e extrai o user autenticado.

Uso:
    from auth.middleware import get_current_user, AuthUser

    @router.get("/me")
    async def me(user: AuthUser = Depends(get_current_user)):
        return {"user_id": user.id}
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.db.supabase import get_supabase

# Extrai o Bearer token do header Authorization
_bearer = HTTPBearer(auto_error=True)


@dataclass(frozen=True)
class AuthUser:
    """Dados do usuário autenticado, disponíveis em todas as rotas protegidas."""
    id: str           # Supabase user UUID — usado como tenant_id no Qdrant
    email: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    supabase: Client = Depends(get_supabase),
) -> AuthUser:
    """
    Valida o JWT do Supabase chamando auth.get_user().

    - Lança HTTP 401 se o token for inválido ou expirado.
    - Retorna AuthUser com id e email do usuário.

    O user.id é usado como tenant_id em todas as operações de RAG,
    garantindo isolamento total de dados entre usuários.
    """
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)
        user = response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido ou expirado: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthUser(id=str(user.id), email=str(user.email))
