"""
rag/query.py
------------
Queries a per-tenant Qdrant collection using LlamaIndex for retrieval
and the OpenAI Chat Completions API for generation (RAG pattern).

Usage:
    from rag.query import query_documents

    result = query_documents(
        question="Qual é a política de reembolso?",
        tenant_id="acme",
        project_id="proj-123",
        chat_history=[
            {"role": "user",      "content": "Olá"},
            {"role": "assistant", "content": "Olá! Como posso ajudar?"},
        ],
    )
    print(result.answer)
    print(result.sources)
    print(result.tokens)
"""

import logging
import os
from dataclasses import dataclass, field

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.vector_stores import (
    FilterCondition,
    FilterOperator,
    MetadataFilter,
    MetadataFilters,
)
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.qdrant import QdrantVectorStore
from openai import OpenAI
from qdrant_client import QdrantClient

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

TOP_K = 5
LLM_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

SYSTEM_PROMPT = (
    "Você é um assistente especializado nos documentos desta empresa.\n"
    "Responda APENAS com base nos documentos fornecidos.\n"
    "Se a informação não estiver nos documentos, diga claramente que não encontrou.\n"
    "Sempre cite de qual documento e página veio a informação.\n"
    "Responda em português brasileiro."
)


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class Source:
    file_name: str
    page_number: int | str
    score: float = 0.0  # cosine similarity returned by Qdrant

    def to_dict(self) -> dict:
        return {
            "file_name": self.file_name,
            "page_number": self.page_number,
            "score": round(self.score, 4),
        }


@dataclass
class TokenUsage:
    prompt: int = 0
    completion: int = 0
    total: int = 0

    def to_dict(self) -> dict:
        return {
            "prompt": self.prompt,
            "completion": self.completion,
            "total": self.total,
        }


@dataclass
class QueryResult:
    answer: str
    sources: list[Source] = field(default_factory=list)
    tokens: TokenUsage = field(default_factory=TokenUsage)
    status: str = "success"   # "success" | "error"
    message: str = ""         # populated on error

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "answer": self.answer,
            "sources": [s.to_dict() for s in self.sources],
            "tokens": self.tokens.to_dict(),
            "message": self.message,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_qdrant_client() -> QdrantClient:
    url = os.environ.get("QDRANT_URL")
    api_key = os.environ.get("QDRANT_API_KEY", "")
    if url:
        logger.debug("Qdrant Cloud: %s", url)
        return QdrantClient(url=url, api_key=api_key or None)
    host = os.environ.get("QDRANT_HOST", "localhost")
    port = int(os.environ.get("QDRANT_PORT", "6333"))
    logger.debug("Qdrant local: %s:%s", host, port)
    return QdrantClient(host=host, port=port)


def _get_openai_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY environment variable is not set.")
    return OpenAI(api_key=api_key)


def _get_embed_model() -> OpenAIEmbedding:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY environment variable is not set.")
    return OpenAIEmbedding(model=EMBEDDING_MODEL, api_key=api_key)


def _collection_name(tenant_id: str) -> str:
    return f"tenant_{tenant_id}"


def _retrieve_chunks(
    question: str,
    tenant_id: str,
    project_id: str,
) -> list[dict]:
    """
    Query Qdrant for the TOP_K most relevant chunks filtered by project_id.

    Returns a list of dicts with keys: text, file_name, page_number, score.
    """
    collection = _collection_name(tenant_id)
    qdrant_client = _get_qdrant_client()
    embed_model = _get_embed_model()

    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name=collection,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # Load existing index — no new documents are added here
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
    )

    # Filter strictly to this project
    filters = MetadataFilters(
        filters=[
            MetadataFilter(
                key="project_id",
                value=project_id,
                operator=FilterOperator.EQ,
            )
        ],
        condition=FilterCondition.AND,
    )

    retriever = index.as_retriever(
        similarity_top_k=TOP_K,
        filters=filters,
    )

    nodes = retriever.retrieve(question)
    logger.info("Retrieved %d chunk(s) for project '%s'", len(nodes), project_id)

    chunks = []
    for node in nodes:
        meta = node.node.metadata
        chunks.append({
            "text": node.node.get_content(),
            "file_name": meta.get("file_name", "unknown"),
            "page_number": meta.get("page_number", "?"),
            "score": node.score or 0.0,
        })
    return chunks


def _build_context_block(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable context string for the LLM."""
    if not chunks:
        return "(Nenhum documento relevante encontrado para esta consulta.)"
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(
            f"[Fonte {i}] Arquivo: {chunk['file_name']} | Página: {chunk['page_number']}\n"
            f"{chunk['text'].strip()}"
        )
    return "\n\n---\n\n".join(parts)


def _build_messages(
    question: str,
    context: str,
    chat_history: list[dict],
) -> list[dict]:
    """
    Assemble the full message list for the Chat Completions API:
      [system] + [prior turns] + [user message with injected context]
    """
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Validate and include prior conversation turns
    for turn in chat_history:
        role = turn.get("role", "")
        content = turn.get("content", "")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    # Current question wrapped with retrieved context
    user_message = (
        f"Contexto dos documentos:\n\n{context}\n\n"
        f"---\n\nPergunta: {question}"
    )
    messages.append({"role": "user", "content": user_message})
    return messages


# ── Main function ─────────────────────────────────────────────────────────────

def query_documents(
    question: str,
    tenant_id: str,
    project_id: str,
    chat_history: list[dict] | None = None,
) -> QueryResult:
    """
    Run a RAG query against the tenant's document collection.

    Args:
        question:     Natural-language question from the user.
        tenant_id:    Tenant identifier — selects the Qdrant collection.
        project_id:   Filters chunks to this specific project.
        chat_history: Optional list of prior turns as
                      [{"role": "user"|"assistant", "content": "..."}].

    Returns:
        QueryResult with answer, sources, token usage, and status.
    """
    chat_history = chat_history or []

    logger.info(
        "Query | tenant=%s project=%s question=%r turns=%d",
        tenant_id, project_id, question[:80], len(chat_history),
    )

    # ── 1. Validate input ────────────────────────────────────────────────────
    if not question.strip():
        return QueryResult(
            answer="", status="error", message="A pergunta não pode ser vazia."
        )

    # ── 2. Retrieve relevant chunks ──────────────────────────────────────────
    try:
        chunks = _retrieve_chunks(question, tenant_id, project_id)
    except EnvironmentError as exc:
        logger.error(str(exc))
        return QueryResult(answer="", status="error", message=str(exc))
    except Exception as exc:
        msg = f"Retrieval falhou: {exc}"
        logger.error(msg)
        return QueryResult(answer="", status="error", message=msg)

    # ── 3. Build context + messages ──────────────────────────────────────────
    context = _build_context_block(chunks)
    messages = _build_messages(question, context, chat_history)
    logger.debug("Sending %d message(s) to %s", len(messages), LLM_MODEL)

    # ── 4. Call OpenAI Chat Completions ──────────────────────────────────────
    try:
        openai_client = _get_openai_client()
        response = openai_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,    # low temperature for factual, grounded answers
        )
    except EnvironmentError as exc:
        logger.error(str(exc))
        return QueryResult(answer="", status="error", message=str(exc))
    except Exception as exc:
        msg = f"Chamada ao LLM falhou: {exc}"
        logger.error(msg)
        return QueryResult(answer="", status="error", message=msg)

    # ── 5. Parse response ────────────────────────────────────────────────────
    answer = response.choices[0].message.content or ""
    usage = response.usage

    token_usage = TokenUsage(
        prompt=usage.prompt_tokens if usage else 0,
        completion=usage.completion_tokens if usage else 0,
        total=usage.total_tokens if usage else 0,
    )

    # Deduplicate sources (same file + page may appear in multiple chunks)
    seen: set[tuple] = set()
    sources: list[Source] = []
    for chunk in chunks:
        key = (chunk["file_name"], chunk["page_number"])
        if key not in seen:
            seen.add(key)
            sources.append(
                Source(
                    file_name=chunk["file_name"],
                    page_number=chunk["page_number"],
                    score=chunk["score"],
                )
            )

    logger.info(
        "Answer generated | tokens=%d sources=%d",
        token_usage.total, len(sources),
    )

    return QueryResult(
        answer=answer,
        sources=sources,
        tokens=token_usage,
        status="success",
    )
