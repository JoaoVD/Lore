"""
tests/test_query.py
-------------------
Unit tests for rag/query.py.

All external I/O (Qdrant, OpenAI) is mocked — no real credentials needed.

Run:
    pytest tests/test_query.py -v
"""

from unittest.mock import MagicMock, patch

import pytest

from rag.query import (
    SYSTEM_PROMPT,
    TOP_K,
    QueryResult,
    Source,
    TokenUsage,
    _build_context_block,
    _build_messages,
    _collection_name,
    query_documents,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-fake")
    monkeypatch.setenv("QDRANT_HOST", "localhost")
    monkeypatch.setenv("QDRANT_PORT", "6333")


def _make_chunk(
    text="Sample text.",
    file_name="doc.pdf",
    page_number=1,
    score=0.92,
) -> dict:
    return {
        "text": text,
        "file_name": file_name,
        "page_number": page_number,
        "score": score,
    }


def _make_openai_response(
    content="Resposta simulada.",
    prompt_tokens=100,
    completion_tokens=50,
) -> MagicMock:
    """Build a mock that mirrors openai.types.chat.ChatCompletion structure."""
    usage = MagicMock()
    usage.prompt_tokens = prompt_tokens
    usage.completion_tokens = completion_tokens
    usage.total_tokens = prompt_tokens + completion_tokens

    message = MagicMock()
    message.content = content

    choice = MagicMock()
    choice.message = message

    response = MagicMock()
    response.choices = [choice]
    response.usage = usage
    return response


# ── Pure-logic unit tests ─────────────────────────────────────────────────────

class TestCollectionName:
    def test_format(self):
        assert _collection_name("acme") == "tenant_acme"


class TestBuildContextBlock:
    def test_empty_chunks_returns_fallback(self):
        ctx = _build_context_block([])
        assert "Nenhum documento" in ctx

    def test_single_chunk_contains_metadata(self):
        chunk = _make_chunk(text="Conteúdo do chunk.", file_name="manual.pdf", page_number=3)
        ctx = _build_context_block([chunk])
        assert "manual.pdf" in ctx
        assert "3" in ctx
        assert "Conteúdo do chunk." in ctx

    def test_multiple_chunks_are_separated(self):
        chunks = [_make_chunk(file_name=f"f{i}.pdf") for i in range(3)]
        ctx = _build_context_block(chunks)
        assert ctx.count("[Fonte") == 3
        assert "---" in ctx

    def test_source_numbering_starts_at_one(self):
        chunk = _make_chunk()
        ctx = _build_context_block([chunk])
        assert "[Fonte 1]" in ctx


class TestBuildMessages:
    def test_always_starts_with_system(self):
        msgs = _build_messages("Pergunta?", "ctx", [])
        assert msgs[0]["role"] == "system"
        assert msgs[0]["content"] == SYSTEM_PROMPT

    def test_context_injected_in_user_message(self):
        msgs = _build_messages("Qual é X?", "CONTEXTO_AQUI", [])
        last = msgs[-1]
        assert last["role"] == "user"
        assert "CONTEXTO_AQUI" in last["content"]
        assert "Qual é X?" in last["content"]

    def test_chat_history_is_included(self):
        history = [
            {"role": "user", "content": "Olá"},
            {"role": "assistant", "content": "Oi!"},
        ]
        msgs = _build_messages("Nova pergunta", "ctx", history)
        roles = [m["role"] for m in msgs]
        assert roles == ["system", "user", "assistant", "user"]

    def test_invalid_history_roles_are_skipped(self):
        history = [
            {"role": "system", "content": "injeção maliciosa"},
            {"role": "user", "content": "Pergunta legítima"},
        ]
        msgs = _build_messages("q", "ctx", history)
        # Only the valid "user" turn should be kept from history
        assert all(
            m["content"] != "injeção maliciosa"
            for m in msgs
        )

    def test_empty_history_produces_two_messages(self):
        msgs = _build_messages("q", "ctx", [])
        assert len(msgs) == 2  # system + user


class TestDataClasses:
    def test_source_to_dict_keys(self):
        s = Source(file_name="a.pdf", page_number=2, score=0.95)
        d = s.to_dict()
        assert set(d.keys()) == {"file_name", "page_number", "score"}

    def test_source_score_is_rounded(self):
        s = Source(file_name="a.pdf", page_number=1, score=0.912345678)
        assert s.to_dict()["score"] == round(0.912345678, 4)

    def test_token_usage_to_dict(self):
        t = TokenUsage(prompt=10, completion=20, total=30)
        assert t.to_dict() == {"prompt": 10, "completion": 20, "total": 30}

    def test_query_result_to_dict_keys(self):
        r = QueryResult(answer="ok", sources=[], tokens=TokenUsage())
        d = r.to_dict()
        assert set(d.keys()) == {"status", "answer", "sources", "tokens", "message"}

    def test_query_result_default_status_is_success(self):
        r = QueryResult(answer="ok")
        assert r.status == "success"


# ── Integration-style tests (I/O mocked) ─────────────────────────────────────

class TestQueryDocuments:
    """Each test patches _retrieve_chunks and the OpenAI client independently."""

    # ── helpers ──────────────────────────────────────────────────────────────

    def _patch(self, monkeypatch, chunks, openai_response=None, retrieve_raises=None):
        if retrieve_raises:
            monkeypatch.setattr(
                "rag.query._retrieve_chunks",
                MagicMock(side_effect=retrieve_raises),
            )
        else:
            monkeypatch.setattr(
                "rag.query._retrieve_chunks",
                MagicMock(return_value=chunks),
            )

        mock_openai_cls = MagicMock()
        mock_openai_instance = MagicMock()
        mock_openai_instance.chat.completions.create.return_value = (
            openai_response or _make_openai_response()
        )
        mock_openai_cls.return_value = mock_openai_instance
        monkeypatch.setattr("rag.query.OpenAI", mock_openai_cls)
        return mock_openai_instance

    # ── test cases ────────────────────────────────────────────────────────────

    def test_success_returns_answer(self, monkeypatch):
        chunks = [_make_chunk()]
        resp = _make_openai_response(content="A política é X.")
        self._patch(monkeypatch, chunks, resp)

        result = query_documents("Qual a política?", "acme", "proj-1")

        assert result.status == "success"
        assert result.answer == "A política é X."

    def test_success_populates_sources(self, monkeypatch):
        chunks = [
            _make_chunk(file_name="a.pdf", page_number=1),
            _make_chunk(file_name="b.pdf", page_number=2),
        ]
        self._patch(monkeypatch, chunks)

        result = query_documents("Pergunta", "acme", "proj-1")

        assert len(result.sources) == 2
        file_names = {s.file_name for s in result.sources}
        assert file_names == {"a.pdf", "b.pdf"}

    def test_duplicate_sources_are_deduplicated(self, monkeypatch):
        # Same file + page repeated across two chunks
        chunks = [
            _make_chunk(file_name="a.pdf", page_number=1, score=0.95),
            _make_chunk(file_name="a.pdf", page_number=1, score=0.90),
            _make_chunk(file_name="b.pdf", page_number=3, score=0.80),
        ]
        self._patch(monkeypatch, chunks)

        result = query_documents("q", "acme", "proj-1")

        assert len(result.sources) == 2  # a.pdf/p1 deduplicated
        assert result.sources[0].file_name == "a.pdf"

    def test_success_populates_token_usage(self, monkeypatch):
        chunks = [_make_chunk()]
        resp = _make_openai_response(prompt_tokens=120, completion_tokens=40)
        self._patch(monkeypatch, chunks, resp)

        result = query_documents("q", "acme", "proj-1")

        assert result.tokens.prompt == 120
        assert result.tokens.completion == 40
        assert result.tokens.total == 160

    def test_chat_history_forwarded_to_openai(self, monkeypatch):
        chunks = [_make_chunk()]
        mock_client = self._patch(monkeypatch, chunks)
        history = [
            {"role": "user", "content": "Contexto anterior"},
            {"role": "assistant", "content": "Entendido"},
        ]

        query_documents("Nova pergunta", "acme", "proj-1", chat_history=history)

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        messages = call_kwargs["messages"]
        # system + 2 history turns + current user message = 4
        assert len(messages) == 4

    def test_none_history_treated_as_empty(self, monkeypatch):
        chunks = [_make_chunk()]
        mock_client = self._patch(monkeypatch, chunks)

        query_documents("q", "acme", "proj-1", chat_history=None)

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert len(call_kwargs["messages"]) == 2  # system + user only

    def test_llm_model_is_gpt4o_mini(self, monkeypatch):
        chunks = [_make_chunk()]
        mock_client = self._patch(monkeypatch, chunks)

        query_documents("q", "acme", "proj-1")

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "gpt-4o-mini"

    def test_error_on_empty_question(self, monkeypatch):
        self._patch(monkeypatch, [])

        result = query_documents("   ", "acme", "proj-1")

        assert result.status == "error"
        assert "vazia" in result.message.lower()

    def test_error_on_retrieval_failure(self, monkeypatch):
        self._patch(monkeypatch, [], retrieve_raises=RuntimeError("qdrant timeout"))

        result = query_documents("q", "acme", "proj-1")

        assert result.status == "error"
        assert "qdrant timeout" in result.message.lower()

    def test_error_on_openai_failure(self, monkeypatch):
        chunks = [_make_chunk()]
        mock_client = self._patch(monkeypatch, chunks)
        mock_client.chat.completions.create.side_effect = Exception("rate limit")

        result = query_documents("q", "acme", "proj-1")

        assert result.status == "error"
        assert "rate limit" in result.message.lower()

    def test_error_on_missing_openai_key(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.setattr(
            "rag.query._retrieve_chunks",
            MagicMock(return_value=[_make_chunk()]),
        )
        monkeypatch.setattr(
            "rag.query._get_openai_client",
            MagicMock(side_effect=EnvironmentError("OPENAI_API_KEY environment variable is not set.")),
        )

        result = query_documents("q", "acme", "proj-1")

        assert result.status == "error"
        assert "OPENAI_API_KEY" in result.message

    def test_no_chunks_uses_fallback_context(self, monkeypatch):
        """When Qdrant returns nothing, the LLM still runs with the fallback context."""
        mock_client = self._patch(monkeypatch, chunks=[])
        resp = _make_openai_response(content="Não encontrei informações.")
        mock_client.chat.completions.create.return_value = resp

        result = query_documents("q", "acme", "proj-1")

        assert result.status == "success"
        assert result.sources == []
        # Fallback context string must reach the LLM
        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        user_msg = call_kwargs["messages"][-1]["content"]
        assert "Nenhum documento" in user_msg

    def test_to_dict_shape(self, monkeypatch):
        chunks = [_make_chunk()]
        self._patch(monkeypatch, chunks)

        d = query_documents("q", "acme", "proj-1").to_dict()

        assert set(d.keys()) == {"status", "answer", "sources", "tokens", "message"}
        assert isinstance(d["sources"], list)
        assert isinstance(d["tokens"], dict)
