"""
Feature Flags do Lore
Para ativar uma feature: mude a variável de ambiente no Railway para "true"
e faça redeploy. Para desativar: mude para "false".
"""
import os

def flag(name: str, default: bool = False) -> bool:
    """Lê uma feature flag do ambiente."""
    val = os.getenv(f"FEATURE_{name}", str(default)).lower()
    return val in ("true", "1", "yes", "on")


# ── FEATURES DISPONÍVEIS ──────────────────────────────────

class Features:

    # Lore Estoq — integração com API REST de estoque
    # Variável: FEATURE_ESTOQ=true
    ESTOQ = flag("ESTOQ", default=False)

    # Widget embeddable — chat em iframe no site do cliente
    # Variável: FEATURE_WIDGET=true
    WIDGET = flag("WIDGET", default=False)

    # Log de auditoria — quem perguntou o quê e quando
    # Variável: FEATURE_AUDIT_LOG=true
    AUDIT_LOG = flag("AUDIT_LOG", default=False)

    # Sincronização automática Google Drive (cron a cada X horas)
    # Variável: FEATURE_DRIVE_AUTOSYNC=true
    DRIVE_AUTOSYNC = flag("DRIVE_AUTOSYNC", default=False)

    # Plano de pagamento anual com desconto
    # Variável: FEATURE_ANNUAL_PLAN=true
    ANNUAL_PLAN = flag("ANNUAL_PLAN", default=False)

    # Suporte a múltiplos idiomas (EN, ES)
    # Variável: FEATURE_MULTILANG=true
    MULTILANG = flag("MULTILANG", default=False)

    # Resumo semanal por e-mail para o dono do projeto
    # Variável: FEATURE_WEEKLY_DIGEST=true
    WEEKLY_DIGEST = flag("WEEKLY_DIGEST", default=False)

    # Exportar conversa como PDF
    # Variável: FEATURE_EXPORT_PDF=true
    EXPORT_PDF = flag("EXPORT_PDF", default=False)

    # API pública do Lore (para desenvolvedores integrarem)
    # Variável: FEATURE_PUBLIC_API=true
    PUBLIC_API = flag("PUBLIC_API", default=False)

    # Modo de demonstração — sem necessidade de cadastro
    # Variável: FEATURE_DEMO_MODE=true
    DEMO_MODE = flag("DEMO_MODE", default=False)

    # Histórico de conversas — sessões de chat por projeto
    # Variável: FEATURE_HISTORY=true
    HISTORY = flag("HISTORY", default=False)

    # Relatório de uso — métricas de perguntas, sessões e tempo economizado
    # Variável: FEATURE_USAGE_REPORT=true
    USAGE_REPORT = flag("USAGE_REPORT", default=False)

    # Lore Jurídico — templates jurídicos pré-configurados para escritórios
    # Variável: FEATURE_JURIDICO=true
    JURIDICO = flag("JURIDICO", default=False)
