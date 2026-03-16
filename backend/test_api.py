"""
backend/test_api.py
-------------------
Testes de integração HTTP para todos os endpoints da API.

Cada endpoint é testado em três cenários:
  ✅ Dados válidos      — verifica status code e estrutura da resposta
  ❌ Dados inválidos    — verifica que a API rejeita inputs incorretos
  🔒 Sem autenticação   — verifica que rotas protegidas retornam 403

Todos os serviços externos (Supabase, Qdrant, OpenAI) são mockados via
app.dependency_overrides e unittest.mock.patch.

Execução:
  cd backend
  pytest test_api.py -v
"""

import io
import os
from unittest.mock import MagicMock, patch

# ── Env vars mínimas (carregadas ANTES do import do app) ──────────────────────
# setdefault preserva valores reais do ambiente / .env, adicionando fallbacks
# apenas para quando nenhum valor está definido (ex.: CI sem .env).
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "eyJtest-anon")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "eyJtest-service")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-openai")

import pytest
from fastapi.testclient import TestClient  # usa httpx internamente

from app.main import app
from app.db.supabase import get_supabase
from auth.middleware import get_current_user, AuthUser
from rag.query import QueryResult, Source, TokenUsage

# ── Dados de teste ────────────────────────────────────────────────────────────

FAKE_USER   = AuthUser(id="user-uuid-abc123", email="teste@exemplo.com")
PROJECT_ID  = "proj-uuid-def456"
FILE_ID     = "file-uuid-ghi789"

FAKE_PROJECT = {
    "id":          PROJECT_ID,
    "user_id":     FAKE_USER.id,
    "name":        "Projeto de Teste",
    "description": "Descrição de teste",
    "created_at":  "2024-01-15T10:00:00+00:00",
}

FAKE_DOCUMENT = {
    "id":            FILE_ID,
    "project_id":    PROJECT_ID,
    "file_name":     "relatorio.pdf",
    "file_url":      "https://storage.test/relatorio.pdf",
    "chunks_count":  12,
    "status":        "ready",
    "error_message": None,
    "created_at":    "2024-01-15T11:00:00+00:00",
}

FAKE_DOC_PROCESSING = {**FAKE_DOCUMENT, "status": "processing", "chunks_count": 0}

FAKE_MSG_USER = {
    "id":         "msg-uuid-001",
    "project_id": PROJECT_ID,
    "role":       "user",
    "content":    "Qual é o tema do documento?",
    "sources":    [],
    "created_at": "2024-01-15T12:00:00+00:00",
}

FAKE_MSG_ASSISTANT = {
    "id":         "msg-uuid-002",
    "project_id": PROJECT_ID,
    "role":       "assistant",
    "content":    "O tema principal é inteligência artificial.",
    "sources":    [{"file_name": "relatorio.pdf", "page_number": 1, "score": 0.95}],
    "created_at": "2024-01-15T12:00:01+00:00",
}

FAKE_PROJECT_STUB = {"id": PROJECT_ID, "user_id": FAKE_USER.id}


# ── Helpers de mock ───────────────────────────────────────────────────────────

def _ok(data=None):
    """Mock de resultado Supabase com .data populado."""
    r = MagicMock()
    r.data = data if data is not None else []
    return r


def _empty():
    """Mock de resultado Supabase com .data = None (sem dados)."""
    r = MagicMock()
    r.data = None
    return r


def _sb(*table_names: str):
    """
    Cria (sb, mocks) onde sb.table(name) retorna um mock específico
    por nome de tabela, permitindo configuração precisa das chains.

    Também configura padrões para sb.storage.

    Exemplo:
        sb, m = _sb("projects", "documents")
        m["projects"].insert.return_value.execute.return_value = _ok([FAKE_PROJECT])
        m["documents"].select.return_value.eq.return_value.order...execute.return_value = _ok([])
    """
    mocks = {name: MagicMock() for name in table_names}
    sb = MagicMock()
    sb.table.side_effect = lambda name: mocks.get(name, MagicMock())

    # Padrões de storage (usados no upload e na deleção)
    sb.storage.from_.return_value.upload.return_value = None
    sb.storage.from_.return_value.get_public_url.return_value = "https://storage.test/file.pdf"
    sb.storage.from_.return_value.remove.return_value = None

    return sb, mocks


def setup_auth(sb: MagicMock | None = None) -> None:
    """Injeta usuário autenticado e, opcionalmente, mock do Supabase."""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    if sb is not None:
        app.dependency_overrides[get_supabase] = lambda: sb


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_overrides():
    """
    Antes de cada teste: injeta um Supabase no-op como padrão, evitando que a
    dependency tente criar um cliente real com credenciais de teste.
    Após cada teste: limpa todos os overrides (isolamento garantido).
    """
    app.dependency_overrides[get_supabase] = lambda: MagicMock()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


# ══════════════════════════════════════════════════════════════════════════════
# 1. HEALTH
# ══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """Rota pública — sem autenticação nem parâmetros de entrada."""

    def test_root_ok(self, client):
        """GET /health → 200 com status e version."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_v1_ok(self, client):
        """GET /api/v1/health → 200 com status ok."""
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ══════════════════════════════════════════════════════════════════════════════
# 2. POST /api/projects  — Criar projeto
# ══════════════════════════════════════════════════════════════════════════════

class TestCreateProject:

    def test_ok(self, client):
        """Payload válido → 201 com os campos do projeto criado."""
        sb, m = _sb("projects")
        m["projects"].insert.return_value.execute.return_value = _ok([FAKE_PROJECT])
        setup_auth(sb)

        resp = client.post("/api/projects", json={"name": "Projeto X", "description": "Desc"})

        assert resp.status_code == 201
        body = resp.json()
        assert body["id"] == PROJECT_ID
        assert body["user_id"] == FAKE_USER.id
        assert body["name"] == "Projeto de Teste"

    def test_invalid_empty_name(self, client):
        """Nome vazio → 422 Unprocessable Entity."""
        setup_auth()
        resp = client.post("/api/projects", json={"name": ""})
        assert resp.status_code == 422

    def test_invalid_missing_name(self, client):
        """Payload sem campo 'name' → 422."""
        setup_auth()
        resp = client.post("/api/projects", json={"description": "sem nome"})
        assert resp.status_code == 422

    def test_invalid_name_too_long(self, client):
        """Nome com mais de 120 chars → 422."""
        setup_auth()
        resp = client.post("/api/projects", json={"name": "x" * 121})
        assert resp.status_code == 422

    def test_no_auth(self, client):
        """Sem token → 403 (HTTPBearer rejeita antes de chegar no handler)."""
        resp = client.post("/api/projects", json={"name": "Projeto"})
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 3. GET /api/projects  — Listar projetos
# ══════════════════════════════════════════════════════════════════════════════

class TestListProjects:

    def test_ok(self, client):
        """Lista de projetos do usuário → 200 com array."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.order.return_value.execute.return_value = _ok([FAKE_PROJECT])
        setup_auth(sb)

        resp = client.get("/api/projects")

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert body[0]["id"] == PROJECT_ID

    def test_empty_list(self, client):
        """Usuário sem projetos → 200 com array vazio."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.order.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        resp = client.get("/api/projects")

        assert resp.status_code == 200
        assert resp.json() == []

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.get("/api/projects")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 4. DELETE /api/projects/{project_id}  — Deletar projeto
# ══════════════════════════════════════════════════════════════════════════════

class TestDeleteProject:

    def test_ok(self, client):
        """Dono deleta projeto → 204 No Content."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT)
        m["documents"].select.return_value.eq.return_value.execute.return_value = _ok([])
        m["projects"].delete.return_value.eq.return_value.execute.return_value = _ok()
        setup_auth(sb)

        with patch("app.api.projects.router._get_qdrant") as mock_q:
            mock_q.return_value.get_collections.return_value.collections = []
            resp = client.delete(f"/api/projects/{PROJECT_ID}")

        assert resp.status_code == 204

    def test_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.delete("/api/projects/id-inexistente")

        assert resp.status_code == 404

    def test_forbidden_wrong_owner(self, client):
        """Projeto de outro usuário → 403."""
        sb, m = _sb("projects")
        outro_dono = {**FAKE_PROJECT, "user_id": "outro-usuario-uuid"}
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(outro_dono)
        setup_auth(sb)

        resp = client.delete(f"/api/projects/{PROJECT_ID}")

        assert resp.status_code == 403

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.delete(f"/api/projects/{PROJECT_ID}")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 5. GET /api/projects/{project_id}/files  — Listar arquivos
# ══════════════════════════════════════════════════════════════════════════════

class TestListFiles:

    def test_ok(self, client):
        """Projeto com documentos → 200 com lista de arquivos."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.order.return_value.execute.return_value = _ok([FAKE_DOCUMENT])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/files")

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert body[0]["file_name"] == "relatorio.pdf"
        assert body[0]["status"] == "ready"

    def test_project_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.get("/api/projects/inexistente/files")

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.get(f"/api/projects/{PROJECT_ID}/files")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 6. DELETE /api/projects/{project_id}/files/{file_id}  — Deletar arquivo
# ══════════════════════════════════════════════════════════════════════════════

class TestDeleteFile:

    def test_ok(self, client):
        """Arquivo existente do próprio projeto → 204."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_DOCUMENT)
        m["documents"].delete.return_value.eq.return_value.execute.return_value = _ok()
        setup_auth(sb)

        with patch("app.api.projects.router._get_qdrant") as mock_q:
            mock_q.return_value.get_collections.return_value.collections = []
            resp = client.delete(f"/api/projects/{PROJECT_ID}/files/{FILE_ID}")

        assert resp.status_code == 204

    def test_file_not_found(self, client):
        """Arquivo inexistente → 404."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.delete(f"/api/projects/{PROJECT_ID}/files/inexistente")

        assert resp.status_code == 404

    def test_project_not_found(self, client):
        """Projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.delete(f"/api/projects/inexistente/files/{FILE_ID}")

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.delete(f"/api/projects/{PROJECT_ID}/files/{FILE_ID}")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 7. POST /api/projects/{project_id}/upload  — Upload assíncrono
# ══════════════════════════════════════════════════════════════════════════════

class TestUpload:

    def _make_sb(self):
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].insert.return_value.execute.return_value = _ok([FAKE_DOC_PROCESSING])
        return sb

    def test_ok(self, client):
        """PDF válido → 202 Accepted com status='processing'."""
        setup_auth(self._make_sb())
        pdf = b"%PDF-1.4 conteudo de teste para upload"

        with patch("api.upload._run_ingest"):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/upload",
                files={"file": ("relatorio.pdf", io.BytesIO(pdf), "application/pdf")},
            )

        assert resp.status_code == 202
        body = resp.json()
        assert body["status"] == "processing"
        assert body["file_name"] == "relatorio.pdf"
        assert "document_id" in body

    def test_invalid_extension(self, client):
        """Extensão não permitida (.jpg) → 415 Unsupported Media Type."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        setup_auth(sb)

        resp = client.post(
            f"/api/projects/{PROJECT_ID}/upload",
            files={"file": ("imagem.jpg", io.BytesIO(b"JFIF fake"), "image/jpeg")},
        )

        assert resp.status_code == 415

    def test_empty_file(self, client):
        """Arquivo com 0 bytes → 400 Bad Request."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        setup_auth(sb)

        resp = client.post(
            f"/api/projects/{PROJECT_ID}/upload",
            files={"file": ("vazio.pdf", io.BytesIO(b""), "application/pdf")},
        )

        assert resp.status_code == 400

    def test_project_not_found(self, client):
        """Upload em projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.post(
            "/api/projects/inexistente/upload",
            files={"file": ("doc.pdf", io.BytesIO(b"content"), "application/pdf")},
        )

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.post(
            f"/api/projects/{PROJECT_ID}/upload",
            files={"file": ("doc.pdf", io.BytesIO(b"content"), "application/pdf")},
        )
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 8. GET /api/projects/{project_id}/files/{file_id}/status  — Status do arquivo
# ══════════════════════════════════════════════════════════════════════════════

class TestFileStatus:

    def _doc_result(self, data: dict):
        r = MagicMock()
        r.data = data
        return r

    def test_ok_ready(self, client):
        """Arquivo processado → 200 com status='ready'."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = self._doc_result({
            "id": FILE_ID, "status": "ready",
            "chunks_count": 12, "error_message": None, "file_name": "relatorio.pdf",
        })
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/files/{FILE_ID}/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["document_id"] == FILE_ID
        assert body["status"] == "ready"
        assert body["chunks_count"] == 12

    def test_ok_processing(self, client):
        """Arquivo ainda sendo processado → 200 com status='processing'."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = self._doc_result({
            "id": FILE_ID, "status": "processing",
            "chunks_count": 0, "error_message": None, "file_name": "relatorio.pdf",
        })
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/files/{FILE_ID}/status")

        assert resp.status_code == 200
        assert resp.json()["status"] == "processing"

    def test_not_found(self, client):
        """Arquivo inexistente → 404."""
        sb, m = _sb("projects", "documents")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["documents"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = self._doc_result(None)
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/files/inexistente/status")

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.get(f"/api/projects/{PROJECT_ID}/files/{FILE_ID}/status")
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 9. POST /api/projects/{project_id}/chat  — Chat com RAG
# ══════════════════════════════════════════════════════════════════════════════

class TestChat:

    def _make_sb(self):
        sb, m = _sb("projects", "chat_messages")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        # histórico para contexto (últimas 10 mensagens)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([])
        # inserção das duas mensagens (user + assistant)
        m["chat_messages"].insert.return_value.execute.return_value = _ok([FAKE_MSG_USER, FAKE_MSG_ASSISTANT])
        return sb

    def _rag_ok(self) -> QueryResult:
        return QueryResult(
            answer="O tema é inteligência artificial.",
            sources=[Source(file_name="relatorio.pdf", page_number=1, score=0.95)],
            tokens=TokenUsage(prompt=100, completion=50, total=150),
            status="success",
        )

    def test_ok(self, client):
        """Mensagem válida → 200 com user_message, assistant_message e tokens."""
        setup_auth(self._make_sb())
        with patch("app.api.projects.router.query_documents", return_value=self._rag_ok()):
            resp = client.post(
                f"/api/projects/{PROJECT_ID}/chat",
                json={"message": "Qual é o tema do documento?"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "user_message" in body
        assert "assistant_message" in body
        assert body["tokens"]["total"] == 150
        assert body["user_message"]["role"] == "user"
        assert body["assistant_message"]["role"] == "assistant"

    def test_invalid_empty_message(self, client):
        """Mensagem vazia ('') → 422 Unprocessable Entity."""
        setup_auth()
        resp = client.post(f"/api/projects/{PROJECT_ID}/chat", json={"message": ""})
        assert resp.status_code == 422

    def test_invalid_message_too_long(self, client):
        """Mensagem com mais de 4000 chars → 422."""
        setup_auth()
        resp = client.post(f"/api/projects/{PROJECT_ID}/chat", json={"message": "x" * 4001})
        assert resp.status_code == 422

    def test_invalid_missing_message(self, client):
        """Payload sem campo 'message' → 422."""
        setup_auth()
        resp = client.post(f"/api/projects/{PROJECT_ID}/chat", json={})
        assert resp.status_code == 422

    def test_project_not_found(self, client):
        """Chat em projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.post(
            f"/api/projects/inexistente/chat",
            json={"message": "Olá"},
        )
        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.post(
            f"/api/projects/{PROJECT_ID}/chat",
            json={"message": "Olá"},
        )
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
# 10. GET /api/projects/{project_id}/history  — Histórico do chat
# ══════════════════════════════════════════════════════════════════════════════

class TestHistory:

    def test_ok(self, client):
        """Histórico com mensagens → 200 com lista ordenada."""
        sb, m = _sb("projects", "chat_messages")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([FAKE_MSG_USER, FAKE_MSG_ASSISTANT])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/history")

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert len(body) == 2
        assert body[0]["role"] == "user"
        assert body[1]["role"] == "assistant"

    def test_empty_history(self, client):
        """Projeto sem histórico → 200 com lista vazia."""
        sb, m = _sb("projects", "chat_messages")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/history")

        assert resp.status_code == 200
        assert resp.json() == []

    def test_limit_param(self, client):
        """Parâmetro ?limit=1 → 200 com no máximo 1 mensagem."""
        sb, m = _sb("projects", "chat_messages")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _ok(FAKE_PROJECT_STUB)
        m["chat_messages"].select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = _ok([FAKE_MSG_USER])
        setup_auth(sb)

        resp = client.get(f"/api/projects/{PROJECT_ID}/history?limit=1")

        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_project_not_found(self, client):
        """Histórico de projeto inexistente → 404."""
        sb, m = _sb("projects")
        m["projects"].select.return_value.eq.return_value.single.return_value.execute.return_value = _empty()
        setup_auth(sb)

        resp = client.get("/api/projects/inexistente/history")

        assert resp.status_code == 404

    def test_no_auth(self, client):
        """Sem token → 403."""
        resp = client.get(f"/api/projects/{PROJECT_ID}/history")
        assert resp.status_code == 403
