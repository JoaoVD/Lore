"""
test_pipeline.py
----------------
End-to-end smoke test for the RAG pipeline.

Steps:
  1. Pre-flight: check required env vars and Qdrant connectivity.
  2. Download a public PDF to a temp file.
  3. Ingest the PDF (ingest_document).
  4. Ask 5 questions and print answers + sources.
  5. Print aggregated token usage and estimated cost.

Usage:
    # 1. Copy and fill credentials
    cp .env.example .env

    # 2. Start Qdrant (Docker)
    docker run -d -p 6333:6333 --name qdrant qdrant/qdrant

    # 3. Run
    python test_pipeline.py
"""

import os
import sys
import tempfile
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────

TENANT_ID = "test"
PROJECT_ID = "demo"

# "Attention Is All You Need" (Vaswani et al., 2017) — arXiv, stable, no auth
PDF_URL = "https://arxiv.org/pdf/1706.03762"
PDF_FALLBACK_URLS = [
    "https://arxiv.org/pdf/1810.04805",  # BERT paper — fallback
]

# GPT-4o-mini pricing (USD per 1 000 tokens, as of early 2025)
PRICE_INPUT_PER_1K = 0.000150
PRICE_OUTPUT_PER_1K = 0.000600

QUESTIONS = [
    "Qual e o tema principal deste artigo e qual problema ele resolve?",
    "Como funciona o mecanismo de atencao (attention) descrito no documento?",
    "Quais foram os resultados obtidos nos experimentos de traducao automatica?",
    "Quais sao as vantagens do modelo Transformer em relacao a RNNs e CNNs?",
    "Faca um resumo executivo do artigo em ate 5 pontos principais.",
]

# ── ANSI colours ───────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):    print(f"{GREEN}[OK]  {msg}{RESET}")
def warn(msg):  print(f"{YELLOW}[!]   {msg}{RESET}")
def err(msg):   print(f"{RED}[ERR] {msg}{RESET}")
def info(msg):  print(f"{CYAN}[>>]  {msg}{RESET}")
def header(msg):print(f"\n{BOLD}{msg}{RESET}")


# ── Pre-flight checks ──────────────────────────────────────────────────────────

def preflight() -> bool:
    header("=" * 60)
    header("PRÉ-REQUISITOS")
    header("=" * 60)

    all_ok = True

    # 1. OpenAI API key
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        err("Variavel de ambiente ausente: OPENAI_API_KEY")
        all_ok = False
    else:
        ok(f"OPENAI_API_KEY = {openai_key[:8]}...")

    # 2. Qdrant — aceita QDRANT_URL (Cloud) ou QDRANT_HOST (local)
    qdrant_url  = os.environ.get("QDRANT_URL", "").strip()
    qdrant_host = os.environ.get("QDRANT_HOST", "").strip()
    qdrant_port = os.environ.get("QDRANT_PORT", "6333").strip()
    qdrant_api_key = os.environ.get("QDRANT_API_KEY", "").strip()

    if qdrant_url:
        ok(f"QDRANT_URL = {qdrant_url[:40]}...")
        # Qdrant Cloud health endpoint requires API key in header
        health_url = qdrant_url.rstrip("/") + "/healthz"
        headers = {"api-key": qdrant_api_key} if qdrant_api_key else {}
    elif qdrant_host:
        ok(f"QDRANT_HOST = {qdrant_host}:{qdrant_port}")
        health_url = f"http://{qdrant_host}:{qdrant_port}/healthz"
        headers = {}
    else:
        err("Defina QDRANT_URL (Cloud) ou QDRANT_HOST (local) no .env")
        all_ok = False
        health_url = ""
        headers = {}

    if health_url:
        info(f"Verificando Qdrant em {health_url[:60]} ...")
        try:
            r = requests.get(health_url, headers=headers, timeout=8)
            if r.status_code in (200, 401):
                # 401 means reachable but unauthenticated — connectivity confirmed
                ok(f"Qdrant acessivel (HTTP {r.status_code})")
            else:
                err(f"Qdrant retornou HTTP {r.status_code}")
                all_ok = False
        except Exception as exc:
            short = str(exc).split("\n")[0][:120]
            err(f"Qdrant inacessivel: {short}")
            err("  Inicie com: docker run -d -p 6333:6333 qdrant/qdrant")
            all_ok = False

    return all_ok


# ── PDF download ───────────────────────────────────────────────────────────────

def download_pdf(dest: Path) -> bool:
    urls = [PDF_URL] + PDF_FALLBACK_URLS
    for url in urls:
        info(f"Baixando PDF: {url}")
        try:
            resp = requests.get(url, timeout=30, stream=True)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            size_kb = dest.stat().st_size / 1024
            ok(f"PDF salvo em {dest}  ({size_kb:.1f} KB)")
            return True
        except Exception as exc:
            warn(f"Falha no download ({url}): {exc}")
    err("Todos os downloads falharam.")
    return False


# ── Formatting helpers ─────────────────────────────────────────────────────────

def print_sources(sources: list) -> None:
    if not sources:
        warn("  Nenhuma fonte retornada.")
        return
    for s in sources:
        d = s.to_dict() if hasattr(s, "to_dict") else s
        print(
            f"   {CYAN}[src] {d['file_name']}  "
            f"pág. {d['page_number']}  "
            f"(score: {d['score']:.4f}){RESET}"
        )


def print_cost(total_prompt: int, total_completion: int) -> None:
    cost_in  = (total_prompt     / 1000) * PRICE_INPUT_PER_1K
    cost_out = (total_completion / 1000) * PRICE_OUTPUT_PER_1K
    total    = cost_in + cost_out
    header("=" * 60)
    header("CONSUMO DE TOKENS E CUSTO ESTIMADO")
    header("=" * 60)
    print(f"  Tokens de entrada  : {total_prompt:>8,}")
    print(f"  Tokens de saída    : {total_completion:>8,}")
    print(f"  Total de tokens    : {total_prompt + total_completion:>8,}")
    print(f"  Custo entrada      : US$ {cost_in:.6f}")
    print(f"  Custo saída        : US$ {cost_out:.6f}")
    print(f"  {BOLD}Custo total estimado: US$ {total:.6f}{RESET}")
    print(
        f"\n  {YELLOW}Modelo: gpt-4o-mini  "
        f"(preços: input US${PRICE_INPUT_PER_1K}/1K | "
        f"output US${PRICE_OUTPUT_PER_1K}/1K){RESET}"
    )


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    # ── 0. Pre-flight ──────────────────────────────────────────────────────
    if not preflight():
        err("\nPré-requisitos não atendidos. Corrija os erros acima e tente novamente.")
        sys.exit(1)

    # ── 1. Import RAG modules (after env is confirmed) ────────────────────
    from rag.ingest import ingest_document
    from rag.query import query_documents

    # ── 2. Download PDF ────────────────────────────────────────────────────
    header("=" * 60)
    header("ETAPA 1 — DOWNLOAD DO PDF")
    header("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = Path(tmpdir) / "sample.pdf"

        if not download_pdf(pdf_path):
            sys.exit(1)

        # ── 3. Ingest ──────────────────────────────────────────────────────
        header("=" * 60)
        header("ETAPA 2 — INGESTÃO")
        header("=" * 60)
        info(f"tenant_id={TENANT_ID!r}  project_id={PROJECT_ID!r}")

        t0 = time.perf_counter()
        ingest_result = ingest_document(
            file_path=pdf_path,
            tenant_id=TENANT_ID,
            project_id=PROJECT_ID,
        )
        elapsed = time.perf_counter() - t0

        if ingest_result.status != "success":
            err(f"Ingestão falhou: {ingest_result.message}")
            sys.exit(1)

        ok(
            f"Ingestão concluída em {elapsed:.1f}s  |  "
            f"chunks={ingest_result.chunks}  "
            f"collection={ingest_result.collection!r}"
        )

        # ── 4. Query loop ──────────────────────────────────────────────────
        header("=" * 60)
        header("ETAPA 3 — PERGUNTAS")
        header("=" * 60)

        total_prompt     = 0
        total_completion = 0
        chat_history: list[dict] = []

        for i, question in enumerate(QUESTIONS, start=1):
            print(f"\n{BOLD}[{i}/{len(QUESTIONS)}] {question}{RESET}")

            t0 = time.perf_counter()
            result = query_documents(
                question=question,
                tenant_id=TENANT_ID,
                project_id=PROJECT_ID,
                chat_history=chat_history,
            )
            elapsed = time.perf_counter() - t0

            if result.status != "success":
                err(f"  Erro na query: {result.message}")
                continue

            # Print answer
            print(f"\n  {result.answer}\n")

            # Print sources
            info(f"  Fontes ({len(result.sources)}):")
            print_sources(result.sources)

            # Token info for this turn
            t = result.tokens
            print(
                f"\n  {YELLOW}tokens — "
                f"prompt: {t.prompt} | "
                f"completion: {t.completion} | "
                f"total: {t.total} | "
                f"tempo: {elapsed:.1f}s{RESET}"
            )

            total_prompt     += t.prompt
            total_completion += t.completion

            # Accumulate history for multi-turn context
            chat_history.append({"role": "user",      "content": question})
            chat_history.append({"role": "assistant",  "content": result.answer})

        # ── 5. Cost summary ────────────────────────────────────────────────
        print_cost(total_prompt, total_completion)


if __name__ == "__main__":
    main()
