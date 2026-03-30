"""
backend/test_api_rest.py
------------------------
Testes da integração com API REST externa.

Cobre todos os cenários relevantes:
  ✅ Dados válidos      — verifica status code e estrutura da resposta
  ❌ Dados inválidos    — verifica que a API rejeita inputs incorretos
  🔒 Sem autenticação   — verifica que rotas protegidas retornam 403
  🌐 HTTP mock          — httpx.AsyncClient mockado para não fazer chamadas reais
  🔗 RAG integration    — verifica que query_api_for_products alimenta o chat

Execução:
  cd backend
  pytest test_api_rest.py -v
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("SUPABASE_URL",        "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY",   "eyJtest-anon")
os.environ.setdefault("SUPABASE_SERVICE_KEY","eyJtest-service")
os.environ.setdefault("OPENAI_API_KEY",      "sk-test-openai")

import pytest
import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.db.supabase import get_supabase
from auth.middleware import get_current_user, AuthUser
from rag.query import QueryResult, Source, TokenUsage

# ── Dados de teste ────────────────────────────────────────────────────────────

FAKE_USER  = AuthUser(id="user-uuid-abc123", email="teste@exemplo.com")
PROJECT_ID = "proj-uuid-def456"

FAKE_PROJECT_STUB = {"id": PROJECT_ID, "user_id": FAKE_USER.id}

FAKE_INTEGRATION = {
    "id":             "integ-uuid-001",
    "project_id":     PROJECT_ID,
    "name":           "Estoque ERP",
    "base_url":       "https://api.erp.com/v1",
    "auth_type":      "bearer",
    "auth_header":    "Authorization",
    "auth_value":     "Bearer TOKEN_SECRETO",
    "endpoint_stock": "/produtos?busca={query}",
    "response_path":  "data",
    "field_name":     "descricao",
    "field_price":    "preco",
    "field_stock":    "quantidade",
    "field_sku":      "codigo",
    "is_active":      True,
    "created_at":     "2024-01-15T10:00:00+00:00",
}

FAKE_PRODUCTS = [
    {"descricao": "Cimento CP-II 50kg", "preco": "38.90", "quantidade": 47, "codigo": "CIM-001"},
    {"descricao": "Rejunte Branco 1kg",  "preco": "12.50", "quantidade": 12, "codigo": "REJ-002"},
    {"descricao": "Argamassa AC-II 20kg","preco": "22.00", "quantidade":  5, "codigo": "ARG-003"},
]


# ── Helpers de mock ───────────────────────────────────────────────────────────

def _ok(data=None):
    r = MagicMock()
    r.data = data if data is not None else []
    return r

def _empty():
    r = MagicMock()
    r.data = None
    return r

def _sb(*table_names: str):
    # Sempre inclui "projects" e "project_members" — usados por require_project_access
    all_tables = set(table_names) | {"projects", "project_members"}
    mocks = {name: MagicMock() for name in all_tables}
    sb = MagicMock()
    sb.table.side_effect = lambda name: mocks.get(name, MagicMock())
    return sb, mocks

def _setup_access(m: dict, role: str = "owner") -> None:
    """
    Configura mocks para que require_project_access() passe corretamente.

    permissions.py usa:
      - projects: .select().eq().limit(1).execute()   ← NÃO .single()
      - project_members: .select().eq().eq().execute()
    """
    m["projects"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_PROJECT_STUB])
    m["project_members"].select.return_value.eq.return_value.eq.return_value.execute.return_value = _ok([{"role": role}])

def _setup_not_found(m: dict) -> None:
    """Configura mock para simular projeto inexistente → 404."""
    m["projects"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])

def setup_auth(sb: MagicMock | None = None) -> None:
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    if sb is not None:
        app.dependency_overrides[get_supabase] = lambda: sb

def _mock_httpx_ok(json_data=None):
    """Mock de httpx.AsyncClient que retorna HTTP 200 com JSON."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = json_data if json_data is not None else []

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_client)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    return mock_cm

def _mock_httpx_error(status: int, text: str = "Erro"):
    """Mock de httpx.AsyncClient que retorna status de erro."""
    mock_response = MagicMock()
    mock_response.status_code = status
    mock_response.text = text

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_client)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    return mock_cm

def _mock_httpx_raise(exc):
    """Mock de httpx.AsyncClient que levanta exceção na chamada .get()."""
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=exc)

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_client)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    return mock_cm


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_overrides():
    app.dependency_overrides[get_supabase] = lambda: MagicMock()
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


# ══════════════════════════════════════════════════════════════════════════════
# 1. GET /api/projects/{project_id}/api-integration
# ══════════════════════════════════════════════════════════════════════════════

class TestGetApiIntegration:

    def test_ok_with_integration(self, client):
        """Integração configurada → 200 com dados (auth_value mascarado)."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/api-integration")

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Estoque ERP"
        assert body["base_url"] == "https://api.erp.com/v1"
        assert body["endpoint_stock"] == "/produtos?busca={query}"
        assert body["auth_value"] == "configured"   # token nunca exposto

    def test_ok_no_integration(self, client):
        """Nenhuma integração configurada → 200 com null."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/api-integration")

        assert resp.status_code == 200
        assert resp.json() is None

    def test_project_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb()
        _setup_not_found(m)
        setup_auth(sb)

        resp = client.get("/api/projects/inexistente/api-integration")

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.get(f"/api/projects/{PROJECT_ID}/api-integration")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 2. POST /api/projects/{project_id}/api-integration  — Salvar integração
# ══════════════════════════════════════════════════════════════════════════════

class TestSaveApiIntegration:

    VALID_PAYLOAD = {
        "name":           "Estoque ERP",
        "base_url":       "https://api.erp.com/v1",
        "auth_type":      "bearer",
        "auth_header":    "Authorization",
        "auth_value":     "Bearer TOKEN_SECRETO",
        "endpoint_stock": "/produtos?busca={query}",
        "response_path":  "data",
        "field_name":     "descricao",
        "field_price":    "preco",
        "field_stock":    "quantidade",
        "field_sku":      "codigo",
    }

    def test_ok_create(self, client):
        """Payload completo com auth_value → 200 com integração criada."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].upsert.return_value.execute.return_value = _ok([FAKE_INTEGRATION])
        setup_auth(sb)

        resp = client.post(f"/api/projects/{PROJECT_ID}/api-integration", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Estoque ERP"
        assert body["auth_value"] == "configured"   # token mascarado na resposta

    def test_ok_keep_existing_token(self, client):
        """auth_value vazio com config existente → mantém token anterior → 200."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        # Simula config existente com token salvo
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([{"auth_value": "Bearer TOKEN_EXISTENTE"}])
        m["api_integrations"].upsert.return_value.execute.return_value = _ok([FAKE_INTEGRATION])
        setup_auth(sb)

        payload = {**self.VALID_PAYLOAD, "auth_value": ""}
        resp = client.post(f"/api/projects/{PROJECT_ID}/api-integration", json=payload)

        assert resp.status_code == 200

    def test_fail_no_auth_value_and_no_existing(self, client):
        """auth_value vazio sem config prévia → 400."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        payload = {**self.VALID_PAYLOAD, "auth_value": ""}
        resp = client.post(f"/api/projects/{PROJECT_ID}/api-integration", json=payload)

        assert resp.status_code == 400

    def test_fail_missing_required_fields(self, client):
        """Payload sem campos obrigatórios → 422."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        setup_auth(sb)
        resp = client.post(f"/api/projects/{PROJECT_ID}/api-integration", json={"name": "Teste"})
        assert resp.status_code == 422

    def test_project_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb()
        _setup_not_found(m)
        setup_auth(sb)

        resp = client.post("/api/projects/inexistente/api-integration", json=self.VALID_PAYLOAD)
        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.post(f"/api/projects/{PROJECT_ID}/api-integration", json=self.VALID_PAYLOAD)
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 3. DELETE /api/projects/{project_id}/api-integration
# ══════════════════════════════════════════════════════════════════════════════

class TestDeleteApiIntegration:

    def test_ok(self, client):
        """Deleção bem-sucedida → 204 No Content."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].delete.return_value.eq.return_value.execute.return_value = _ok()
        setup_auth(sb)

        resp = client.delete(f"/api/projects/{PROJECT_ID}/api-integration")

        assert resp.status_code == 204

    def test_project_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb()
        _setup_not_found(m)
        setup_auth(sb)

        resp = client.delete("/api/projects/inexistente/api-integration")
        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.delete(f"/api/projects/{PROJECT_ID}/api-integration")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 4. POST /api/projects/{project_id}/api-integration/test
# ══════════════════════════════════════════════════════════════════════════════

class TestTestApiIntegration:

    def _setup_saved_integration(self):
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])
        return sb

    def test_ok_with_saved_integration(self, client):
        """Config salva + API retorna 200 → 200 com sample de produtos."""
        setup_auth(self._setup_saved_integration())

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok({"data": FAKE_PRODUCTS})):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json={"query": "cimento"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert isinstance(body["sample"], list)
        assert len(body["sample"]) <= 3

    def test_ok_with_body_config(self, client):
        """Sem config salva, mas com config no body → testa com body → 200."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        body_config = {
            "query":          "produto",
            "base_url":       "https://jsonplaceholder.typicode.com",
            "auth_header":    "Authorization",
            "auth_value":     "Bearer TOKEN",
            "endpoint_stock": "/users",
            "response_path":  "",
            "field_name":     "name",
            "field_price":    "id",
            "field_stock":    "id",
            "field_sku":      "",
        }

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok([{"name": "User A", "id": 1}])):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json=body_config,
            )

        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_fail_api_returns_non_200(self, client):
        """API externa retorna 401 → 400 com detalhe do status."""
        setup_auth(self._setup_saved_integration())

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_error(401, "Unauthorized")):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json={"query": "teste"},
            )

        assert resp.status_code == 400
        assert "401" in resp.json()["detail"]

    def test_fail_api_returns_500(self, client):
        """API externa retorna 500 → 400."""
        setup_auth(self._setup_saved_integration())

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_error(500, "Internal Server Error")):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json={"query": "teste"},
            )

        assert resp.status_code == 400
        assert "500" in resp.json()["detail"]

    def test_fail_connection_error(self, client):
        """Erro de conexão (host não existe) → 400."""
        setup_auth(self._setup_saved_integration())

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_raise(httpx.ConnectError("Connection refused"))):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json={"query": "teste"},
            )

        assert resp.status_code == 400
        assert "conectar" in resp.json()["detail"].lower()

    def test_fail_timeout(self, client):
        """Timeout na chamada → 408."""
        setup_auth(self._setup_saved_integration())

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_raise(httpx.TimeoutException("Timeout"))):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/api-integration/test",
                json={"query": "teste"},
            )

        assert resp.status_code == 408

    def test_fail_missing_body_fields_when_no_saved_config(self, client):
        """Sem config salva e sem campos no body → 400."""
        sb, m = _sb("api_integrations")
        _setup_access(m)
        m["api_integrations"].select.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        resp = client.post(
            f"/api/projects/{PROJECT_ID}/api-integration/test",
            json={"query": "produto"},    # sem base_url, auth_value, endpoint_stock
        )

        assert resp.status_code == 400

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.post(
            f"/api/projects/{PROJECT_ID}/api-integration/test",
            json={"query": "produto"},
        )
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 5. query_api_for_products() — função utilitária do pipeline RAG
# ══════════════════════════════════════════════════════════════════════════════

class TestQueryApiForProducts:

    async def test_returns_formatted_context(self):
        """Integração ativa + API retorna produtos → contexto formatado."""
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok({"data": FAKE_PRODUCTS})):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "cimento", sb)

        assert "[DADOS DO SISTEMA DE ESTOQUE" in result
        assert "Cimento CP-II 50kg" in result
        assert "38.90" in result
        assert "47" in result
        assert "CIM-001" in result

    async def test_returns_empty_when_no_integration(self):
        """Sem integração configurada → string vazia."""
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])

        from app.api.integrations.api_rest import query_api_for_products
        result = await query_api_for_products(PROJECT_ID, "produto", sb)

        assert result == ""

    async def test_returns_empty_when_api_non_200(self):
        """API retorna 503 → string vazia (sem exceção)."""
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_error(503)):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "produto", sb)

        assert result == ""

    async def test_returns_empty_on_connection_error(self):
        """Falha de rede → string vazia (exceção capturada silenciosamente)."""
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_raise(httpx.ConnectError("refused"))):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "produto", sb)

        assert result == ""

    async def test_navigates_response_path(self):
        """response_path 'result.items' extrai lista corretamente."""
        integration = {**FAKE_INTEGRATION, "response_path": "result.items"}
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([integration])

        nested_json = {"result": {"items": FAKE_PRODUCTS}}

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok(nested_json)):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "cimento", sb)

        assert "Cimento CP-II 50kg" in result

    async def test_empty_response_path_uses_root_array(self):
        """response_path vazio → usa raiz diretamente (já é lista)."""
        integration = {**FAKE_INTEGRATION, "response_path": ""}
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([integration])

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok(FAKE_PRODUCTS)):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "cimento", sb)

        assert "Cimento CP-II 50kg" in result

    async def test_limits_to_10_items(self):
        """API retorna 20 produtos → contexto limitado a 10 linhas de produto."""
        sb = MagicMock()
        sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])

        twenty_products = [
            {"descricao": f"Produto {i}", "preco": "10.00", "quantidade": i, "codigo": f"P{i:03d}"}
            for i in range(20)
        ]

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok({"data": twenty_products})):
            from app.api.integrations.api_rest import query_api_for_products
            result = await query_api_for_products(PROJECT_ID, "produto", sb)

        # Conta linhas de produto (começam com "• ")
        product_lines = [l for l in result.splitlines() if l.strip().startswith("•")]
        assert len(product_lines) == 10


# ══════════════════════════════════════════════════════════════════════════════
# 6. Chat + integração com API  — fluxo completo end-to-end mockado
# ══════════════════════════════════════════════════════════════════════════════

class TestChatWithApiIntegration:

    def _make_sb(self):
        sb, m = _sb("chat_messages", "api_integrations")
        _setup_access(m)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([])
        m["chat_messages"].insert.return_value.execute.return_value = _ok([
            {"id": "m1", "project_id": PROJECT_ID, "role": "user",
             "content": "Tem cimento?", "sources": [], "created_at": "2024-01-15T12:00:00Z"},
            {"id": "m2", "project_id": PROJECT_ID, "role": "assistant",
             "content": "Cimento CP-II 50kg: 47 unidades · R$ 38,90",
             "sources": [], "created_at": "2024-01-15T12:00:01Z"},
        ])
        # Integração ativa retornada pelo query_api_for_products
        m["api_integrations"].select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([FAKE_INTEGRATION])
        return sb, m

    def _rag_ok(self) -> QueryResult:
        return QueryResult(
            answer="Cimento CP-II 50kg: 47 unidades · R$ 38,90",
            sources=[],
            tokens=TokenUsage(prompt=200, completion=60, total=260),
            status="success",
        )

    def test_chat_calls_api_and_passes_context_to_rag(self, client):
        """Chat com integração ativa → query_api_for_products chamado + contexto passado ao RAG."""
        sb, _ = self._make_sb()
        setup_auth(sb)

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_ok({"data": FAKE_PRODUCTS})), \
             patch("app.api.projects.router.query_documents", return_value=self._rag_ok()) as mock_rag, \
             patch("app.api.projects.router.check_question_limit"), \
             patch("app.api.projects.router.log_usage"):

            resp = client.post(
                f"/api/projects/{PROJECT_ID}/chat",
                json={"message": "Tem cimento CP-II em estoque?"},
            )

        assert resp.status_code == 200
        # Verifica que o RAG foi chamado com api_context preenchido
        call_kwargs = mock_rag.call_args.kwargs
        assert call_kwargs.get("api_context", "") != ""
        assert "ESTOQUE" in call_kwargs["api_context"]

    def test_chat_without_integration_passes_empty_context(self, client):
        """Chat sem integração configurada → api_context vazio → RAG chamado normalmente."""
        sb, m = _sb("chat_messages", "api_integrations")
        _setup_access(m)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([])
        m["chat_messages"].insert.return_value.execute.return_value = _ok([
            {"id": "m1", "project_id": PROJECT_ID, "role": "user",
             "content": "Pergunta", "sources": [], "created_at": "2024-01-15T12:00:00Z"},
            {"id": "m2", "project_id": PROJECT_ID, "role": "assistant",
             "content": "Resposta",  "sources": [], "created_at": "2024-01-15T12:00:01Z"},
        ])
        m["api_integrations"].select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        with patch("app.api.projects.router.query_documents", return_value=self._rag_ok()) as mock_rag, \
             patch("app.api.projects.router.check_question_limit"), \
             patch("app.api.projects.router.log_usage"):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/chat",
                json={"message": "Qual é a política de devolução?"},
            )

        assert resp.status_code == 200
        call_kwargs = mock_rag.call_args.kwargs
        assert call_kwargs.get("api_context", "") == ""

    def test_chat_returns_200_even_when_api_fails(self, client):
        """API externa falha (conexão) → chat continua normalmente com contexto vazio."""
        sb, _ = self._make_sb()
        setup_auth(sb)

        with patch("app.api.integrations.api_rest.httpx.AsyncClient",
                   return_value=_mock_httpx_raise(httpx.ConnectError("refused"))), \
             patch("app.api.projects.router.query_documents", return_value=self._rag_ok()), \
             patch("app.api.projects.router.check_question_limit"), \
             patch("app.api.projects.router.log_usage"):

            resp = client.post(
                f"/api/projects/{PROJECT_ID}/chat",
                json={"message": "Tem cimento?"},
            )

        assert resp.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 7. query_documents() com api_context  — mudanças no rag/query.py
# ══════════════════════════════════════════════════════════════════════════════

class TestQueryDocumentsApiContext:

    def _mock_openai_response(self, text: str):
        mock_msg   = MagicMock()
        mock_msg.content = text
        mock_choice = MagicMock()
        mock_choice.message = mock_msg
        mock_usage = MagicMock()
        mock_usage.prompt_tokens     = 100
        mock_usage.completion_tokens =  50
        mock_usage.total_tokens      = 150
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        mock_resp.usage   = mock_usage
        return mock_resp

    def test_api_context_included_in_messages(self):
        """api_context é incluído no bloco de contexto enviado ao LLM."""
        from rag.query import query_documents

        api_ctx = "[DADOS DO SISTEMA DE ESTOQUE — TEMPO REAL]\n• Cimento CP-II — Estoque: 47 unidades"

        with patch("rag.query._retrieve_chunks", return_value=[]), \
             patch("rag.query._get_openai_client") as mock_oai:

            mock_oai.return_value.chat.completions.create.return_value = \
                self._mock_openai_response("47 unidades disponíveis.")

            result = query_documents(
                question="Quanto tem de cimento?",
                tenant_id="tenant-test",
                project_id=PROJECT_ID,
                api_context=api_ctx,
            )

        assert result.status == "success"
        # Verifica que o contexto de estoque foi enviado ao LLM
        call_args = mock_oai.return_value.chat.completions.create.call_args
        messages = call_args.kwargs.get("messages") or call_args.args[0]
        full_content = " ".join(m["content"] for m in messages)
        assert "ESTOQUE" in full_content

    def test_stock_system_prompt_used_when_api_context_present(self):
        """SYSTEM_PROMPT_WITH_STOCK é usado quando api_context não está vazio."""
        from rag.query import query_documents, SYSTEM_PROMPT_WITH_STOCK

        api_ctx = "[DADOS DO SISTEMA DE ESTOQUE — TEMPO REAL]\n• Produto X"

        with patch("rag.query._retrieve_chunks", return_value=[]), \
             patch("rag.query._get_openai_client") as mock_oai:

            mock_oai.return_value.chat.completions.create.return_value = \
                self._mock_openai_response("Resposta.")

            query_documents(
                question="Pergunta de estoque",
                tenant_id="tenant-test",
                project_id=PROJECT_ID,
                api_context=api_ctx,
            )

        call_args = mock_oai.return_value.chat.completions.create.call_args
        messages = call_args.kwargs.get("messages") or call_args.args[0]
        system_msg = next(m for m in messages if m["role"] == "system")
        # O system prompt com estoque menciona "estoque"
        assert "estoque" in system_msg["content"].lower()
        assert system_msg["content"] == SYSTEM_PROMPT_WITH_STOCK

    def test_default_system_prompt_when_no_api_context(self):
        """SYSTEM_PROMPT padrão é usado quando api_context está vazio."""
        from rag.query import query_documents, SYSTEM_PROMPT

        with patch("rag.query._retrieve_chunks", return_value=[]), \
             patch("rag.query._get_openai_client") as mock_oai:

            mock_oai.return_value.chat.completions.create.return_value = \
                self._mock_openai_response("Resposta padrão.")

            query_documents(
                question="Qual é a política de reembolso?",
                tenant_id="tenant-test",
                project_id=PROJECT_ID,
                api_context="",   # sem contexto de API
            )

        call_args = mock_oai.return_value.chat.completions.create.call_args
        messages = call_args.kwargs.get("messages") or call_args.args[0]
        system_msg = next(m for m in messages if m["role"] == "system")
        assert system_msg["content"] == SYSTEM_PROMPT
