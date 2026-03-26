"""
app/api/projects/permissions.py
---------------------------------
Dependência de controle de acesso por nível de permissão dentro de um projeto.

Hierarquia de roles:
    owner (3) > editor (2) > viewer (1)

Uso:
    access: ProjectAccess = Depends(require_project_access("editor"))

O objeto ProjectAccess retornado expõe:
    - role      → role do usuário autenticado neste projeto
    - project   → dados completos do projeto (inclui user_id = dono)
    - owner_id  → project.user_id, usado como tenant_id no Qdrant/Storage
"""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from supabase import Client

from app.db.supabase import get_supabase
from auth.middleware import AuthUser, get_current_user

ROLE_HIERARCHY: dict[str, int] = {"viewer": 1, "editor": 2, "owner": 3}


@dataclass
class ProjectAccess:
    """Contexto de acesso ao projeto, injetado via Depends."""
    role: str       # role do usuário autenticado neste projeto
    project: dict   # dados completos do projeto
    owner_id: str   # project["user_id"] — usado como tenant_id no Qdrant/Storage


def require_project_access(required_role: str):
    """
    Factory que retorna uma dependência FastAPI verificando o nível mínimo de acesso.

    - Consulta `project_members` para determinar o role do usuário.
    - Compatibilidade retroativa: se o usuário é dono do projeto mas ainda não
      tem entrada em `project_members`, insere automaticamente com role="owner".

    Args:
        required_role: "viewer", "editor" ou "owner"

    Raises:
        HTTP 404 se o projeto não existir.
        HTTP 403 se o usuário não for membro ou não tiver o role exigido.
    """
    async def _dependency(
        project_id: str,
        user: AuthUser = Depends(get_current_user),
        supabase: Client = Depends(get_supabase),
    ) -> ProjectAccess:
        # 1. Verifica se o projeto existe
        try:
            proj_result = (
                supabase.table("projects")
                .select("*")
                .eq("id", project_id)
                .limit(1)
                .execute()
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao consultar o banco de dados",
            )
        if not proj_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projeto não encontrado",
            )

        project = proj_result.data[0]

        # 2. Verifica role na tabela project_members
        member_result = (
            supabase.table("project_members")
            .select("role")
            .eq("project_id", project_id)
            .eq("user_id", user.id)
            .execute()
        )

        if not member_result.data:
            # Compatibilidade retroativa: owner direto sem registro em project_members
            if project["user_id"] == user.id:
                supabase.table("project_members").insert({
                    "project_id": project_id,
                    "user_id": user.id,
                    "role": "owner",
                }).execute()
                role = "owner"
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acesso negado",
                )
        else:
            role = member_result.data[0]["role"]

        # 3. Verifica nível mínimo de permissão
        if ROLE_HIERARCHY.get(role, 0) < ROLE_HIERARCHY.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão insuficiente. Necessário: {required_role}",
            )

        return ProjectAccess(
            role=role,
            project=project,
            owner_id=project["user_id"],
        )

    return _dependency
