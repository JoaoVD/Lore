"""
Motor de Geração Padrão Diamante
Usa Claude para gerar documentos jurídicos de elite com:
- Templates estruturados por seção
- Estilo aprendido do escritório (feedback loop)
- Escrita rebuscada e técnica padrão dos melhores escritórios brasileiros
"""
import os
from typing import Optional

import anthropic

_client: Optional[anthropic.AsyncAnthropic] = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")

SECTION_LABELS = {
    "cabecalho":    "CABEÇALHO E ENDEREÇAMENTO",
    "qualificacao": "QUALIFICAÇÃO DAS PARTES",
    "fatos":        "DOS FATOS",
    "direito":      "DO DIREITO",
    "pedidos":      "DOS PEDIDOS",
    "fechamento":   "ENCERRAMENTO E ASSINATURA",
}


async def generate_diamond_document(
    template: dict,
    variables: dict,
    project_id: str,
    supabase,
    section: Optional[str] = None,
) -> dict:
    """
    Gera um documento jurídico completo no Padrão Diamante.

    1. Carrega o estilo aprendido do escritório
    2. Monta o prompt com toda a inteligência
    3. Gera seção por seção para máxima qualidade
    """
    style = await get_office_style(project_id, supabase)
    structure = template.get("structure", {})
    content_parts = []

    sections_to_generate = [section] if section else list(structure.keys())

    for sec_name in sections_to_generate:
        sec_data = structure.get(sec_name, {})
        if not sec_data.get("instrucao"):
            continue

        sec_content = await _generate_section(
            section_name=sec_name,
            instruction=sec_data["instrucao"],
            example=sec_data.get("exemplo", ""),
            variables=variables,
            tone_guide=template.get("tone_guide", ""),
            office_style=style,
            document_area=template.get("area", ""),
        )
        content_parts.append(sec_content)

    full_document = "\n\n".join(content_parts)

    for key, value in variables.items():
        full_document = full_document.replace(f"{{{{{key}}}}}", str(value or f"{{{{{key}}}}}"))

    return {
        "content": full_document,
        "sections": len(content_parts),
        "model": MODEL,
        "style_applied": bool(style),
    }


async def _generate_section(
    section_name: str,
    instruction: str,
    example: str,
    variables: dict,
    tone_guide: str,
    office_style: Optional[dict],
    document_area: str,
) -> str:
    """Gera uma seção específica do documento com Claude."""
    example_filled = example
    for key, value in variables.items():
        if value:
            example_filled = example_filled.replace(f"{{{{{key}}}}}", str(value))

    style_instruction = ""
    if office_style and office_style.get("style_summary"):
        style_instruction = (
            f"\nESTILO DO ESCRITÓRIO (aprendi com as edições anteriores):\n"
            f"{office_style['style_summary']}\n\n"
            f"Adapte a escrita a este estilo específico do escritório.\n"
        )

    label = SECTION_LABELS.get(section_name, section_name.upper())

    filled_vars = "\n".join(
        f"- {k}: {v}" for k, v in variables.items() if v and str(v).strip()
    )

    prompt = (
        f"Você é um advogado sênior brasileiro especialista em {document_area}, "
        f"com 20 anos de experiência nos melhores escritórios do país.\n\n"
        f"Sua tarefa: redigir a seção \"{label}\" de um documento jurídico no mais alto padrão técnico.\n\n"
        f"DADOS DO CASO:\n{filled_vars}\n\n"
        f"INSTRUÇÃO PARA ESTA SEÇÃO:\n{instruction}\n\n"
        f"REFERÊNCIA DE ESTILO (use como base, não copie):\n"
        f"{example_filled[:500] if example_filled else 'Sem referência disponível.'}\n\n"
        f"GUIA DE TOM:\n{tone_guide}\n"
        f"{style_instruction}\n"
        f"REGRAS ABSOLUTAS:\n"
        f"1. Escrita EXTREMAMENTE formal, técnica e rebuscada — padrão dos melhores escritórios brasileiros\n"
        f"2. Use vocabulário jurídico preciso: \"ora Reclamante\", \"consoante dispõe\", \"à luz do que preceitua\", "
        f"\"importa salientar\", \"cumpre destacar\", \"conforme melhor se demonstrará\"\n"
        f"3. Cite legislação específica quando relevante (CLT, CC, CPC, CF)\n"
        f"4. NUNCA use linguagem coloquial ou simples\n"
        f"5. Paragrafação adequada, sem blocos de texto monolíticos\n"
        f"6. Use {{{{variavel}}}} para dados que não foram fornecidos (não invente)\n"
        f"7. Retorne APENAS o texto da seção, sem explicações ou comentários\n\n"
        f"Redija agora a seção \"{label}\":"
    )

    client = _get_client()
    message = await client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def get_office_style(project_id: str, supabase) -> Optional[dict]:
    """Busca o estilo aprendido do escritório."""
    try:
        result = (
            supabase.table("office_style")
            .select("*")
            .eq("project_id", project_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception:
        return None


async def save_feedback_and_learn(
    project_id: str,
    document_id: str,
    section: str,
    original: str,
    edited: str,
    user_id: str,
    supabase,
) -> None:
    """
    Salva a edição do advogado e, a cada 5 feedbacks,
    atualiza o resumo de estilo do escritório.
    """
    if not edited or original == edited:
        return

    supabase.table("document_feedback").insert({
        "project_id":    project_id,
        "document_id":   document_id,
        "original_text": original,
        "edited_text":   edited,
        "section":       section,
        "created_by":    user_id,
    }).execute()

    count_result = (
        supabase.table("document_feedback")
        .select("id", count="exact")
        .eq("project_id", project_id)
        .execute()
    )
    total = count_result.count or 0

    if total % 5 == 0:
        await _update_office_style(project_id, total, supabase)


async def _update_office_style(project_id: str, total_feedbacks: int, supabase) -> None:
    """
    Analisa os feedbacks acumulados e gera um novo resumo de estilo.
    Claude analisa o que o advogado costuma corrigir e aprende.
    """
    feedbacks = (
        supabase.table("document_feedback")
        .select("original_text, edited_text, section")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    if not feedbacks.data or len(feedbacks.data) < 3:
        return

    examples = "\n\n".join(
        f"SEÇÃO: {f['section']}\n"
        f"ANTES: {f['original_text'][:300]}\n"
        f"DEPOIS: {f['edited_text'][:300]}"
        for f in feedbacks.data[:10]
    )

    analysis_prompt = (
        f"Analise as seguintes edições feitas por um advogado nos documentos gerados por IA.\n"
        f"Identifique padrões de escrita, preferências de vocabulário, estilo e tom específicos deste escritório.\n\n"
        f"EDIÇÕES ANALISADAS:\n{examples}\n\n"
        f"Retorne um resumo conciso (máximo 200 palavras) descrevendo:\n"
        f"1. Preferências de vocabulário jurídico específico\n"
        f"2. Estrutura preferida de parágrafos\n"
        f"3. Expressões que o advogado prefere usar\n"
        f"4. O que o advogado costuma corrigir/melhorar\n"
        f"5. Tom geral preferido (mais formal, mais objetivo, etc.)\n\n"
        f"Seja específico e acionável — este resumo será usado para guiar a geração dos próximos documentos."
    )

    client = _get_client()
    message = await client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": analysis_prompt}],
    )
    style_summary = message.content[0].text

    existing = (
        supabase.table("office_style")
        .select("id")
        .eq("project_id", project_id)
        .execute()
    )

    if existing.data:
        supabase.table("office_style").update({
            "style_summary":   style_summary,
            "total_feedbacks": total_feedbacks,
            "last_updated":    "now()",
        }).eq("project_id", project_id).execute()
    else:
        supabase.table("office_style").insert({
            "project_id":      project_id,
            "style_summary":   style_summary,
            "total_feedbacks": total_feedbacks,
        }).execute()
