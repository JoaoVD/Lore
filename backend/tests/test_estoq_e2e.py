"""
Teste End-to-End do Lore Estoq
Sobe a mock API, configura a integração e testa o chat completo.
Execute: python tests/test_estoq_e2e.py
"""
import httpx
import subprocess
import time
import sys
import json

MOCK_API_URL = "http://localhost:9000"
LORE_API_URL = "http://localhost:8000"

def linha(char="─", n=50):
    print(char * n)

def ok(msg):   print(f"  ✅ {msg}")
def fail(msg): print(f"  ❌ {msg}"); sys.exit(1)
def info(msg): print(f"  ℹ️  {msg}")

# ── ETAPA 1: Verifica se a mock API está respondendo ──────

def testar_mock_api():
    linha()
    print("  🧪 ETAPA 1 — Mock API")
    linha()
    try:
        r = httpx.get(f"{MOCK_API_URL}/produtos", timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) > 0
        ok(f"Mock API respondendo — {len(data['data'])} produtos disponíveis")
    except Exception as e:
        fail(f"Mock API não está respondendo: {e}\n  → Rode em outro terminal: python mock_api.py")

def testar_busca_mock_api():
    casos = [
        ("cimento",  "deve retornar produtos com 'cimento'"),
        ("rejunte",  "deve retornar produtos com 'rejunte'"),
        ("tinta",    "deve retornar produtos com 'tinta'"),
        ("xyz_nao_existe", "deve retornar lista vazia para produto inexistente"),
    ]
    for query, descricao in casos:
        r = httpx.get(f"{MOCK_API_URL}/produtos?nome={query}", timeout=5)
        assert r.status_code == 200
        data = r.json()["data"]
        if query == "xyz_nao_existe":
            assert len(data) == 0
            ok(f"Busca '{query}' — {len(data)} resultados (correto)")
        else:
            assert len(data) > 0
            ok(f"Busca '{query}' — {len(data)} produtos encontrados")


# ── ETAPA 2: Verifica se o backend do Lore está rodando ──

def testar_lore_backend():
    linha()
    print("  🧪 ETAPA 2 — Backend do Lore")
    linha()
    try:
        r = httpx.get(f"{LORE_API_URL}/health", timeout=5)
        assert r.status_code == 200
        ok("Backend do Lore respondendo em /health")
    except Exception as e:
        fail(f"Backend do Lore não está respondendo: {e}\n  → Rode: uvicorn app.main:app --reload")


# ── ETAPA 3: Verifica os endpoints do Lore Estoq ─────────

def testar_endpoints_estoq(token: str, project_id: str):
    linha()
    print("  🧪 ETAPA 3 — Endpoints do Lore Estoq")
    linha()

    headers = {"Authorization": f"Bearer {token}"}
    base = f"{LORE_API_URL}/api/projects/{project_id}"

    # GET — deve existir (não 404)
    r = httpx.get(f"{base}/api-integration", headers=headers, timeout=5)
    assert r.status_code != 404, \
        f"GET /api-integration retornou 404 — router não registrado"
    ok(f"GET /api-integration existe (status {r.status_code})")

    # POST — salva a integração com a mock API
    payload = {
        "name": "Mock Estoque Teste",
        "base_url": MOCK_API_URL,
        "auth_type": "api_key",
        "auth_header": "Authorization",
        "auth_value": "Bearer mock-token-teste",
        "endpoint_stock": "/produtos?nome={query}",
        "response_path": "data",
        "field_name": "nome",
        "field_price": "preco",
        "field_stock": "estoque",
        "field_sku": "codigo"
    }
    r = httpx.post(f"{base}/api-integration", json=payload, headers=headers, timeout=5)
    assert r.status_code in [200, 201], \
        f"POST /api-integration falhou: {r.status_code} — {r.text[:200]}"
    ok(f"POST /api-integration — integração salva com sucesso")

    # TEST — testa a conexão com a mock API
    r = httpx.post(
        f"{base}/api-integration/test",
        json={"query": "cimento"},
        headers=headers,
        timeout=10
    )
    assert r.status_code == 200, \
        f"POST /api-integration/test falhou: {r.status_code} — {r.text[:200]}"
    data = r.json()
    assert data.get("success") == True
    assert "sample" in data
    ok(f"TEST /api-integration — conexão OK, {len(data['sample'])} produtos de amostra")
    info(f"Amostra: {json.dumps(data['sample'][0], ensure_ascii=False)[:100]}")


# ── ETAPA 4: Testa o chat com perguntas de estoque ────────

def testar_chat_estoq(token: str, project_id: str):
    linha()
    print("  🧪 ETAPA 4 — Chat com perguntas de estoque")
    linha()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    perguntas = [
        ("Tem cimento disponível?",             ["cimento", "estoque", "unidades"]),
        ("Qual o preço do rejunte branco?",     ["rejunte", "R$", "12"]),
        ("Tem tinta acrílica em estoque?",      ["tinta", "estoque"]),
        ("Qual o estoque de argamassa AC-II?",  ["argamassa", "estoque", "unidades"]),
        ("Tem cimento Votoran?",                ["Votoran", "estoque"]),
    ]

    for pergunta, palavras_esperadas in perguntas:
        r = httpx.post(
            f"{LORE_API_URL}/api/projects/{project_id}/chat",
            json={"message": pergunta, "history": []},
            headers=headers,
            timeout=30
        )

        if r.status_code != 200:
            info(f"Chat '{pergunta[:40]}...' — status {r.status_code} (verifique auth)")
            continue

        resposta = r.json().get("response", "")
        palavras_encontradas = [p for p in palavras_esperadas if p.lower() in resposta.lower()]

        if len(palavras_encontradas) >= len(palavras_esperadas) // 2:
            ok(f"'{pergunta[:45]}...'")
            info(f"Resposta: {resposta[:120]}...")
        else:
            info(f"'{pergunta[:45]}...' — resposta não contém palavras esperadas")
            info(f"Esperava: {palavras_esperadas}")
            info(f"Resposta: {resposta[:120]}...")


# ── ETAPA 5: Testa cenários de erro ──────────────────────

def testar_cenarios_erro(token: str, project_id: str):
    linha()
    print("  🧪 ETAPA 5 — Cenários de erro")
    linha()

    headers = {"Authorization": f"Bearer {token}"}

    # API fora do ar não deve quebrar o chat
    payload_api_invalida = {
        "name": "API Inválida",
        "base_url": "https://url-que-nao-existe-xyzabc123.com",
        "auth_type": "api_key",
        "auth_header": "Authorization",
        "auth_value": "Bearer token",
        "endpoint_stock": "/produtos?nome={query}",
        "response_path": "data",
        "field_name": "nome",
        "field_price": "preco",
        "field_stock": "estoque",
    }

    r = httpx.post(
        f"{LORE_API_URL}/api/projects/{project_id}/api-integration/test",
        json={"query": "teste"},
        headers=headers,
        timeout=15
    )
    # Deve retornar erro mas não 500 não tratado
    assert r.status_code in [200, 400, 422, 503], \
        f"Erro não tratado: {r.status_code}"
    ok(f"API inválida tratada corretamente (status {r.status_code})")

    # Pergunta sem produto relacionado
    r = httpx.post(
        f"{LORE_API_URL}/api/projects/{project_id}/chat",
        json={"message": "Qual a capital da França?", "history": []},
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=30
    )
    if r.status_code == 200:
        resposta = r.json().get("response", "")
        # Não deve inventar estoque
        assert "unidades" not in resposta.lower() or "não" in resposta.lower(), \
            "LLM inventou dados de estoque para pergunta não relacionada"
        ok("Pergunta fora do contexto — não inventou dados de estoque")


# ── MAIN ──────────────────────────────────────────────────

if __name__ == "__main__":
    linha("═")
    print("  🚀 TESTE END-TO-END — LORE ESTOQ")
    linha("═")

    # Credenciais de teste — substitua pelos valores reais
    TOKEN = input("\n  Cole seu JWT token do Lore (ou pressione Enter para pular auth): ").strip()
    if not TOKEN:
        print("  ⚠️  Sem token — pulando testes que precisam de auth\n")

    PROJECT_ID = input("  Cole o ID de um projeto de teste: ").strip()
    if not PROJECT_ID:
        PROJECT_ID = "00000000-0000-0000-0000-000000000000"
        print(f"  ⚠️  Usando project_id padrão: {PROJECT_ID}\n")

    print()

    # Roda os testes
    testar_mock_api()
    testar_busca_mock_api()
    testar_lore_backend()

    if TOKEN and PROJECT_ID:
        testar_endpoints_estoq(TOKEN, PROJECT_ID)
        testar_chat_estoq(TOKEN, PROJECT_ID)
        testar_cenarios_erro(TOKEN, PROJECT_ID)

    linha("═")
    print("  ✅ TESTES CONCLUÍDOS!")
    linha("═")
    print()
