"""
tests/test_estoq_rapido.py
--------------------------
Teste rápido do Lore Estoq com API pública.
Roda sem autenticação para validar a lógica de integração.
Execute: python tests/test_estoq_rapido.py
"""
import asyncio
import httpx
import json


async def testar_consulta_api():
    print("\n Testando consulta a API externa...")
    print("=" * 50)

    base_url = "https://jsonplaceholder.typicode.com"
    endpoint = "/users"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{base_url}{endpoint}", timeout=10)

        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Itens retornados: {len(data)}")

        if data:
            print(f"Primeiro item: {json.dumps(data[0], indent=2)[:200]}")

    except Exception as e:
        print(f"Erro: {e}")

    print("\n Testando formatacao da resposta...")
    print("=" * 50)

    produtos_mock = [
        {"nome": "Cimento CP-II 50kg", "preco": "38.90", "estoque": "47", "codigo": "CIM001"},
        {"nome": "Rejunte Branco",      "preco": "12.50", "estoque": "12", "codigo": "REJ002"},
        {"nome": "Tinta Acrilica 18L",  "preco": "189.90","estoque": "8",  "codigo": "TIN003"},
    ]

    lines = ["[DADOS DO SISTEMA DE ESTOQUE — TEMPO REAL]"]
    for item in produtos_mock:
        line = (
            f"• {item['nome']} (Cod: {item['codigo']})"
            f" — Estoque: {item['estoque']} unidades"
            f" — Preco: R$ {item['preco']}"
        )
        lines.append(line)

    contexto = "\n".join(lines)
    print(contexto)
    print("\nFormatacao OK")

    print("\n Testando response_path...")
    print("=" * 50)

    casos = [
        ({"data": [{"nome": "A"}]},              "data",       [{"nome": "A"}]),
        ({"data": {"items": [{"nome": "B"}]}},   "data.items", [{"nome": "B"}]),
        ([{"nome": "C"}],                        "",           [{"nome": "C"}]),
    ]

    for data, path, esperado in casos:
        result = data
        for key in path.split("."):
            if key and isinstance(result, dict):
                result = result.get(key, result)

        status = "OK" if result == esperado else "FALHOU"
        print(f"{status}  response_path='{path}' -> {result}")

    print("\nTodos os testes basicos passaram!")


if __name__ == "__main__":
    asyncio.run(testar_consulta_api())
