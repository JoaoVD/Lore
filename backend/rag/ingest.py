"""
rag/ingest.py
-------------
Ingests documents (PDF, DOCX, TXT) into a per-tenant Qdrant collection.

Usage:
    from rag.ingest import ingest_document

    result = await ingest_document(
        file_path="/tmp/report.pdf",
        tenant_id="acme",
        project_id="proj-123",
    )
    # {"status": "success", "chunks": 42, "collection": "tenant_acme"}
"""

import logging
import os
from dataclasses import dataclass
from pathlib import Path

from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import TextNode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
CHUNK_SIZE = 512       # tokens
CHUNK_OVERLAP = 50     # tokens
EMBEDDING_DIM = 1536   # text-embedding-3-small output dimension
EMBEDDING_MODEL = "text-embedding-3-small"


# ── Result dataclass ─────────────────────────────────────────────────────────

@dataclass
class IngestResult:
    status: str          # "success" | "error"
    chunks: int
    collection: str
    file_name: str
    message: str = ""

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "chunks": self.chunks,
            "collection": self.collection,
            "file_name": self.file_name,
            "message": self.message,
        }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _collection_name(tenant_id: str) -> str:
    return f"tenant_{tenant_id}"


def _get_qdrant_client() -> QdrantClient:
    """Build Qdrant client from environment variables."""
    qdrant_url = os.environ.get("QDRANT_URL")
    qdrant_api_key = os.environ.get("QDRANT_API_KEY", "")

    if qdrant_url:
        # Qdrant Cloud
        logger.debug("Connecting to Qdrant Cloud at %s", qdrant_url)
        return QdrantClient(url=qdrant_url, api_key=qdrant_api_key or None)

    # Local / Docker fallback
    host = os.environ.get("QDRANT_HOST", "localhost")
    port = int(os.environ.get("QDRANT_PORT", "6333"))
    logger.debug("Connecting to local Qdrant at %s:%s", host, port)
    return QdrantClient(host=host, port=port)


def _ensure_collection(client: QdrantClient, collection: str) -> None:
    """Create the collection and required payload indexes if they do not exist yet."""
    existing = {c.name for c in client.get_collections().collections}
    if collection not in existing:
        logger.info("Creating Qdrant collection '%s'", collection)
        client.create_collection(
            collection_name=collection,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
    else:
        logger.debug("Collection '%s' already exists", collection)

    # Qdrant Cloud requires explicit payload indexes for filtered searches.
    # create_payload_index is idempotent — safe to call on every run.
    for field in ("project_id", "tenant_id", "file_name"):
        logger.debug("Ensuring payload index on '%s.%s'", collection, field)
        client.create_payload_index(
            collection_name=collection,
            field_name=field,
            field_schema=PayloadSchemaType.KEYWORD,
        )


def _validate_file(file_path: Path) -> None:
    """Raise ValueError for unsupported or missing files."""
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{file_path.suffix}'. "
            f"Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )


def _build_embed_model() -> OpenAIEmbedding:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY environment variable is not set.")
    return OpenAIEmbedding(model=EMBEDDING_MODEL, api_key=api_key)


# ── Main function ─────────────────────────────────────────────────────────────

def ingest_document(
    file_path: str | Path,
    tenant_id: str,
    project_id: str,
    original_filename: str | None = None, 
) -> IngestResult:
    """
    Ingest a single document into the tenant's Qdrant collection.

    Args:
        file_path:  Absolute or relative path to the file (PDF, DOCX, TXT).
        tenant_id:  Tenant identifier — determines the Qdrant collection name.
        project_id: Project identifier stored as metadata on every chunk.

    Returns:
        IngestResult with status, chunk count, collection name, and message.
    """
    file_path = Path(file_path)
    display_name = original_filename or file_path.name
    collection = _collection_name(tenant_id)

    logger.info(
        "Starting ingestion | file=%s tenant=%s project=%s",
        display_name, tenant_id, project_id,
    )

    # ── 1. Validate file ─────────────────────────────────────────────────────
    try:
        _validate_file(file_path)
    except (FileNotFoundError, ValueError) as exc:
        logger.error("Validation failed: %s", exc)
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=str(exc),
        )

    # ── 2. Load document ─────────────────────────────────────────────────────
    try:
        logger.info("Loading file with SimpleDirectoryReader...")
        reader = SimpleDirectoryReader(input_files=[str(file_path)])
        documents = reader.load_data()
        logger.info("Loaded %d document page(s)", len(documents))
    except Exception as exc:
        msg = f"Failed to read file '{file_path.name}': {exc}"
        logger.error(msg)
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=msg,
        )

    # ── 3. Split into chunks ──────────────────────────────────────────────────
    try:
        logger.info(
            "Splitting into chunks (size=%d, overlap=%d tokens)...",
            CHUNK_SIZE, CHUNK_OVERLAP,
        )
        splitter = SentenceSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
        nodes: list[TextNode] = splitter.get_nodes_from_documents(documents)
        logger.info("Created %d chunk(s)", len(nodes))
    except Exception as exc:
        msg = f"Chunking failed: {exc}"
        logger.error(msg)
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=msg,
        )

    # ── 4. Attach metadata to each chunk ─────────────────────────────────────
    for node in nodes:
        page = node.metadata.get("page_label") or node.metadata.get("page_number", 1)
        node.metadata.update({
            "project_id": project_id,
            "file_name": display_name,
            "page_number": page,
            "tenant_id": tenant_id,
        })

    # ── 5. Connect to Qdrant and ensure collection exists ────────────────────
    try:
        logger.info("Connecting to Qdrant...")
        qdrant_client = _get_qdrant_client()
        _ensure_collection(qdrant_client, collection)
    except Exception as exc:
        msg = f"Qdrant connection failed: {exc}"
        logger.error(msg)
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=msg,
        )

    # ── 6. Build embedding model and index ───────────────────────────────────
    try:
        logger.info("Building embeddings with '%s'...", EMBEDDING_MODEL)
        embed_model = _build_embed_model()
        vector_store = QdrantVectorStore(
            client=qdrant_client,
            collection_name=collection,
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        VectorStoreIndex(
            nodes=nodes,
            storage_context=storage_context,
            embed_model=embed_model,
            show_progress=False,
        )
    except EnvironmentError as exc:
        logger.error(str(exc))
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=str(exc),
        )
    except Exception as exc:
        msg = f"Embedding/indexing failed: {exc}"
        logger.error(msg)
        return IngestResult(
            status="error", chunks=0, collection=collection,
            file_name=file_path.name, message=msg,
        )

    # ── 7. Done ───────────────────────────────────────────────────────────────
    logger.info(
        "Ingestion complete | chunks=%d collection=%s",
        len(nodes), collection,
    )
    return IngestResult(
        status="success",
        chunks=len(nodes),
        collection=collection,
        file_name=file_path.name,
    )
