from supabase import Client, create_client

from app.core.config import settings

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """
    Retorna um singleton do Supabase inicializado com a service_role key.
    Usar como dependência FastAPI: Depends(get_supabase).
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
        )
    return _supabase_client
