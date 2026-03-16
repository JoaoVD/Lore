"""
tests/test_ingest.py
--------------------
Unit tests for rag/ingest.py.

All external I/O (Qdrant, OpenAI, file reading) is mocked so the suite
runs without real credentials or network access.

Run:
    pytest tests/test_ingest.py -v
"""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from rag.ingest import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_DIM,
    SUPPORTED_EXTENSIONS,
    IngestResult,
    _collection_name,
    _validate_file,
    ingest_document,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    """Inject minimal env vars so config never raises EnvironmentError."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-fake-key")
    monkeypatch.setenv("QDRANT_HOST", "localhost")
    monkeypatch.setenv("QDRANT_PORT", "6333")


@pytest.fixture()
def txt_file(tmp_path: Path) -> Path:
    f = tmp_path / "sample.txt"
    f.write_text("Hello world. " * 200)  # enough text to produce multiple chunks
    return f


@pytest.fixture()
def pdf_file(tmp_path: Path) -> Path:
    """Fake .pdf file (content doesn't matter — reader is mocked)."""
    f = tmp_path / "report.pdf"
    f.write_bytes(b"%PDF-1.4 fake content")
    return f


@pytest.fixture()
def unsupported_file(tmp_path: Path) -> Path:
    f = tmp_path / "data.csv"
    f.write_text("a,b,c")
    return f


# ── Pure-logic unit tests (no I/O) ───────────────────────────────────────────

class TestCollectionName:
    def test_format(self):
        assert _collection_name("acme") == "tenant_acme"

    def test_special_chars(self):
        assert _collection_name("my-org_01") == "tenant_my-org_01"


class TestConstants:
    def test_chunk_size(self):
        assert CHUNK_SIZE == 512

    def test_chunk_overlap(self):
        assert CHUNK_OVERLAP == 50

    def test_embedding_dim(self):
        assert EMBEDDING_DIM == 1536

    def test_supported_extensions(self):
        assert {".pdf", ".docx", ".txt"} == SUPPORTED_EXTENSIONS


class TestValidateFile:
    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError, match="not found"):
            _validate_file(tmp_path / "ghost.txt")

    def test_unsupported_extension_raises(self, unsupported_file):
        with pytest.raises(ValueError, match="Unsupported"):
            _validate_file(unsupported_file)

    def test_valid_txt_passes(self, txt_file):
        _validate_file(txt_file)  # must not raise

    def test_valid_pdf_passes(self, pdf_file):
        _validate_file(pdf_file)  # must not raise


class TestIngestResult:
    def test_to_dict_keys(self):
        result = IngestResult(
            status="success", chunks=10,
            collection="tenant_x", file_name="f.txt",
        )
        d = result.to_dict()
        assert set(d.keys()) == {"status", "chunks", "collection", "file_name", "message"}

    def test_to_dict_values(self):
        result = IngestResult(
            status="error", chunks=0,
            collection="tenant_x", file_name="f.txt", message="oops",
        )
        assert result.to_dict()["status"] == "error"
        assert result.to_dict()["message"] == "oops"


# ── Integration-style tests (external I/O mocked) ────────────────────────────

def _make_fake_node(page: int = 1) -> MagicMock:
    node = MagicMock()
    node.metadata = {"page_label": str(page)}
    return node


def _mock_pipeline(monkeypatch, nodes: list, reader_raises=False, qdrant_raises=False):
    """
    Patch all external dependencies so ingest_document runs offline.
    Returns the mocked QdrantClient instance for further assertions.
    """
    # SimpleDirectoryReader
    if reader_raises:
        monkeypatch.setattr(
            "rag.ingest.SimpleDirectoryReader",
            MagicMock(side_effect=RuntimeError("read error")),
        )
    else:
        mock_reader = MagicMock()
        mock_reader.return_value.load_data.return_value = [MagicMock()]
        monkeypatch.setattr("rag.ingest.SimpleDirectoryReader", mock_reader)

    # SentenceSplitter
    mock_splitter = MagicMock()
    mock_splitter.return_value.get_nodes_from_documents.return_value = nodes
    monkeypatch.setattr("rag.ingest.SentenceSplitter", mock_splitter)

    # QdrantClient
    mock_qdrant_cls = MagicMock()
    mock_qdrant_instance = MagicMock()
    mock_qdrant_instance.get_collections.return_value.collections = []
    if qdrant_raises:
        mock_qdrant_cls.side_effect = ConnectionError("qdrant down")
    else:
        mock_qdrant_cls.return_value = mock_qdrant_instance
    monkeypatch.setattr("rag.ingest.QdrantClient", mock_qdrant_cls)

    # QdrantVectorStore
    monkeypatch.setattr("rag.ingest.QdrantVectorStore", MagicMock())

    # StorageContext
    monkeypatch.setattr(
        "rag.ingest.StorageContext",
        MagicMock(from_defaults=MagicMock(return_value=MagicMock())),
    )

    # VectorStoreIndex
    monkeypatch.setattr("rag.ingest.VectorStoreIndex", MagicMock())

    # OpenAIEmbedding
    monkeypatch.setattr("rag.ingest.OpenAIEmbedding", MagicMock())

    return mock_qdrant_instance


class TestIngestDocument:
    def test_success_returns_correct_chunk_count(self, monkeypatch, txt_file):
        nodes = [_make_fake_node(i) for i in range(5)]
        _mock_pipeline(monkeypatch, nodes)

        result = ingest_document(txt_file, tenant_id="acme", project_id="proj-1")

        assert result.status == "success"
        assert result.chunks == 5
        assert result.collection == "tenant_acme"
        assert result.file_name == txt_file.name

    def test_success_creates_collection_when_missing(self, monkeypatch, txt_file):
        nodes = [_make_fake_node()]
        qdrant_instance = _mock_pipeline(monkeypatch, nodes)

        ingest_document(txt_file, tenant_id="new_tenant", project_id="proj-99")

        qdrant_instance.create_collection.assert_called_once()
        call_kwargs = qdrant_instance.create_collection.call_args
        assert call_kwargs.kwargs["collection_name"] == "tenant_new_tenant"

    def test_success_skips_collection_creation_when_exists(self, monkeypatch, txt_file):
        nodes = [_make_fake_node()]
        qdrant_instance = _mock_pipeline(monkeypatch, nodes)

        # Simulate collection already present
        existing = MagicMock()
        existing.name = "tenant_acme"
        qdrant_instance.get_collections.return_value.collections = [existing]

        ingest_document(txt_file, tenant_id="acme", project_id="proj-1")

        qdrant_instance.create_collection.assert_not_called()

    def test_metadata_is_attached_to_nodes(self, monkeypatch, txt_file):
        nodes = [_make_fake_node(page=3)]
        _mock_pipeline(monkeypatch, nodes)

        ingest_document(txt_file, tenant_id="acme", project_id="proj-42")

        meta = nodes[0].metadata
        assert meta["project_id"] == "proj-42"
        assert meta["file_name"] == txt_file.name
        assert meta["tenant_id"] == "acme"
        assert "page_number" in meta

    def test_error_on_missing_file(self, tmp_path):
        result = ingest_document(
            tmp_path / "nonexistent.pdf",
            tenant_id="acme",
            project_id="proj-1",
        )
        assert result.status == "error"
        assert result.chunks == 0
        assert "not found" in result.message.lower()

    def test_error_on_unsupported_extension(self, unsupported_file):
        result = ingest_document(
            unsupported_file, tenant_id="acme", project_id="proj-1"
        )
        assert result.status == "error"
        assert "unsupported" in result.message.lower()

    def test_error_on_reader_failure(self, monkeypatch, txt_file):
        nodes = [_make_fake_node()]
        _mock_pipeline(monkeypatch, nodes, reader_raises=True)

        result = ingest_document(txt_file, tenant_id="acme", project_id="proj-1")

        assert result.status == "error"
        assert "read error" in result.message.lower()

    def test_error_on_qdrant_connection_failure(self, monkeypatch, txt_file):
        nodes = [_make_fake_node()]
        _mock_pipeline(monkeypatch, nodes, qdrant_raises=True)

        result = ingest_document(txt_file, tenant_id="acme", project_id="proj-1")

        assert result.status == "error"
        assert "qdrant" in result.message.lower()

    def test_error_on_missing_openai_key(self, monkeypatch, txt_file):
        nodes = [_make_fake_node()]
        _mock_pipeline(monkeypatch, nodes)
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)

        # OpenAIEmbedding is already mocked, so re-patch _build_embed_model directly
        monkeypatch.setattr(
            "rag.ingest._build_embed_model",
            MagicMock(side_effect=EnvironmentError("OPENAI_API_KEY environment variable is not set.")),
        )

        result = ingest_document(txt_file, tenant_id="acme", project_id="proj-1")

        assert result.status == "error"
        assert "OPENAI_API_KEY" in result.message

    def test_to_dict_on_success(self, monkeypatch, txt_file):
        nodes = [_make_fake_node(), _make_fake_node()]
        _mock_pipeline(monkeypatch, nodes)

        result = ingest_document(txt_file, tenant_id="acme", project_id="proj-1")
        d = result.to_dict()

        assert d["status"] == "success"
        assert d["chunks"] == 2
        assert d["collection"] == "tenant_acme"
