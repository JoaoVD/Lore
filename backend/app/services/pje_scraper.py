"""
app/services/pje_scraper.py
-----------------------------
Consulta pública ao PJe e e-SAJ para importar prazos processuais.
"""

import re
from datetime import datetime
from typing import Optional

import httpx

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

TRIBUNAIS = {
    "TRT15": {
        "name": "TRT 15ª Região (Campinas)",
        "url": "https://pje.trt15.jus.br/pje/ConsultaPublica/listView.seam",
        "type": "pje",
    },
    "TRT2": {
        "name": "TRT 2ª Região (São Paulo)",
        "url": "https://pje.trt2.jus.br/pje/ConsultaPublica/listView.seam",
        "type": "pje",
    },
    "TJSP": {
        "name": "TJSP",
        "url": "https://esaj.tjsp.jus.br/cpopg/show.do",
        "type": "esaj",
    },
    "TRF3": {
        "name": "TRF 3ª Região",
        "url": "https://pje.trf3.jus.br/pje/ConsultaPublica/listView.seam",
        "type": "pje",
    },
    "STJ": {
        "name": "STJ",
        "url": "https://processo.stj.jus.br/SCON/pesquisar.jsp",
        "type": "stj",
    },
}

KEYWORDS_PRAZO = [
    "prazo", "intimação", "notificação", "audiência",
    "perícia", "sentença", "recurso", "manifestação",
    "juntada", "intimado", "ciência",
]


async def buscar_prazos_processo(numero_processo: str, tribunal: str) -> dict:
    """
    Busca movimentações/prazos de um processo no PJe ou e-SAJ.
    Retorna lista de prazos encontrados prontos para importar.
    """
    if not BS4_AVAILABLE:
        return {"error": "BeautifulSoup4 não instalado. Execute: pip install beautifulsoup4", "prazos": []}

    tribunal_info = TRIBUNAIS.get(tribunal)
    if not tribunal_info:
        supported = ", ".join(TRIBUNAIS.keys())
        return {"error": f"Tribunal '{tribunal}' não suportado. Suportados: {supported}", "prazos": []}

    try:
        if tribunal_info["type"] == "pje":
            return await _buscar_pje(numero_processo, tribunal_info)
        elif tribunal_info["type"] == "esaj":
            return await _buscar_esaj(numero_processo, tribunal_info)
        else:
            return {"error": "Tipo de tribunal não suportado para scraping.", "prazos": []}
    except httpx.TimeoutException:
        return {"error": "Tribunal demorou para responder. Tente novamente.", "prazos": []}
    except Exception as e:
        return {"error": f"Erro ao consultar tribunal: {str(e)}", "prazos": []}


async def _buscar_pje(numero: str, tribunal: dict) -> dict:
    """Consulta pública do PJe — extrai movimentações com prazo."""
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.get(
            tribunal["url"],
            params={"numeroProcesso": numero},
            headers={"User-Agent": "Mozilla/5.0 (compatible; Lore/1.0)"},
        )

    if response.status_code != 200:
        return {
            "error": f"Tribunal retornou status {response.status_code}",
            "prazos": [],
        }

    soup = BeautifulSoup(response.text, "html.parser")
    prazos = []

    rows = soup.find_all("tr", class_=re.compile(r"rich-table-row|movimentacao"))
    for row in rows[:30]:
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        data_text = cells[0].get_text(strip=True)
        desc_text = cells[1].get_text(strip=True)

        try:
            data = datetime.strptime(data_text, "%d/%m/%Y").date()
        except ValueError:
            continue

        if any(kw in desc_text.lower() for kw in KEYWORDS_PRAZO):
            prazos.append({
                "title": desc_text[:120],
                "date": str(data),
                "category": _inferir_categoria(desc_text),
                "source": "pje",
            })

    return {
        "tribunal": tribunal["name"],
        "processo": numero,
        "prazos": prazos,
        "total": len(prazos),
    }


async def _buscar_esaj(numero: str, tribunal: dict) -> dict:
    """Consulta pública do e-SAJ (TJSP)."""
    numero_limpo = re.sub(r"[^0-9]", "", numero)

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.get(
            tribunal["url"],
            params={"processo.codigo": numero_limpo},
            headers={"User-Agent": "Mozilla/5.0 (compatible; Lore/1.0)"},
        )

    soup = BeautifulSoup(response.text, "html.parser")
    prazos = []

    tabela = soup.find("table", {"id": re.compile(r"tabelaTodasMovimentacoes|movimentacoes")})
    if tabela:
        for row in tabela.find_all("tr")[1:30]:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            data_text = cells[0].get_text(strip=True)
            desc_text = cells[1].get_text(strip=True)
            try:
                data = datetime.strptime(data_text, "%d/%m/%Y").date()
            except ValueError:
                continue
            if any(kw in desc_text.lower() for kw in KEYWORDS_PRAZO):
                prazos.append({
                    "title": desc_text[:120],
                    "date": str(data),
                    "category": _inferir_categoria(desc_text),
                    "source": "esaj",
                })

    return {
        "tribunal": tribunal["name"],
        "processo": numero,
        "prazos": prazos,
        "total": len(prazos),
    }


def _inferir_categoria(texto: str) -> str:
    texto = texto.lower()
    if "audiência" in texto:
        return "audiencia"
    if "perícia" in texto:
        return "pericia"
    if "recurso" in texto:
        return "recurso"
    return "prazo"
