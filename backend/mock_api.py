"""
Mock API de Estoque — Lore Estoq
Simula um sistema ERP real para testes locais.
Execute: python mock_api.py
Disponível em: http://localhost:9000
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse

PRODUTOS = [
    {"codigo": "CIM001", "nome": "Cimento CP-II 50kg",           "preco": 38.90,  "estoque": 47},
    {"codigo": "CIM002", "nome": "Cimento CP-V ARI 50kg",        "preco": 42.50,  "estoque": 23},
    {"codigo": "CIM003", "nome": "Cimento Votoran 50kg",         "preco": 36.90,  "estoque": 0},
    {"codigo": "REJ001", "nome": "Rejunte Branco Quartzolit 1kg","preco": 12.50,  "estoque": 12},
    {"codigo": "REJ002", "nome": "Rejunte Cinza Quartzolit 1kg", "preco": 12.50,  "estoque": 34},
    {"codigo": "REJ003", "nome": "Rejunte Preto Quartzolit 1kg", "preco": 13.90,  "estoque": 8},
    {"codigo": "TIN001", "nome": "Tinta Acrílica Branca 18L",    "preco": 189.90, "estoque": 8},
    {"codigo": "TIN002", "nome": "Tinta Acrílica Azul 18L",      "preco": 195.00, "estoque": 5},
    {"codigo": "TIN003", "nome": "Tinta Acrílica Amarela 18L",   "preco": 195.00, "estoque": 0},
    {"codigo": "HID001", "nome": "Registro Gaveta 3/4 Polegada", "preco": 28.90,  "estoque": 31},
    {"codigo": "HID002", "nome": "Registro Gaveta 1 Polegada",   "preco": 34.90,  "estoque": 15},
    {"codigo": "HID003", "nome": "Cano PVC 100mm 6m",            "preco": 45.00,  "estoque": 19},
    {"codigo": "HID004", "nome": "Cano PVC 50mm 6m",             "preco": 28.00,  "estoque": 42},
    {"codigo": "ELE001", "nome": "Fio Elétrico 2.5mm 100m",      "preco": 320.00, "estoque": 7},
    {"codigo": "ELE002", "nome": "Fio Elétrico 4mm 100m",        "preco": 480.00, "estoque": 3},
    {"codigo": "FER001", "nome": "Argamassa AC-II 20kg",         "preco": 22.90,  "estoque": 88},
    {"codigo": "FER002", "nome": "Argamassa AC-III 20kg",        "preco": 26.90,  "estoque": 54},
    {"codigo": "FER003", "nome": "Massa Corrida 25kg",           "preco": 45.00,  "estoque": 22},
    {"codigo": "PIS001", "nome": "Porcelanato Branco 60x60",     "preco": 89.90,  "estoque": 120},
    {"codigo": "PIS002", "nome": "Porcelanato Cinza 60x60",      "preco": 94.90,  "estoque": 85},
]

class MockEstoqueHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        query  = params.get("nome", [""])[0].lower()

        if query:
            resultado = [
                p for p in PRODUTOS
                if any(palavra in p["nome"].lower() for palavra in query.split())
            ]
        else:
            resultado = PRODUTOS

        body = json.dumps({
            "data": resultado,
            "total": len(resultado),
            "success": True
        }, ensure_ascii=False)

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):
        print(f"  >> {args[0]} | status: {args[1]}")

if __name__ == "__main__":
    port = 9000
    print(f"\n{'='*50}")
    print(f"  Mock API de Estoque rodando!")
    print(f"  http://localhost:{port}")
    print(f"  Endpoint: GET /produtos?nome={{query}}")
    print(f"  {len(PRODUTOS)} produtos cadastrados")
    print(f"{'='*50}\n")
    HTTPServer(("localhost", port), MockEstoqueHandler).serve_forever()
