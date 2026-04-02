/**
 * Feature Flags do Frontend — Lore
 * Lidas das variáveis de ambiente da Vercel (NEXT_PUBLIC_*)
 * Para ativar: adicione a variável na Vercel e faça redeploy
 */

function flag(name: string, defaultValue = false): boolean {
  const val = process.env[`NEXT_PUBLIC_FEATURE_${name}`]
  if (val === undefined) return defaultValue
  return ['true', '1', 'yes', 'on'].includes(val.toLowerCase())
}

export const Features = {
  // Lore Estoq — mostra seção de integração API nas settings
  ESTOQ: flag('ESTOQ', false),

  // Widget embeddable — mostra seção de API Key nas settings
  WIDGET: flag('WIDGET', false),

  // Log de auditoria — mostra aba de histórico de consultas
  AUDIT_LOG: flag('AUDIT_LOG', false),

  // Google Drive autosync — mostra opção de sincronização automática
  DRIVE_AUTOSYNC: flag('DRIVE_AUTOSYNC', false),

  // Plano anual com desconto — mostra opção na página de preços
  ANNUAL_PLAN: flag('ANNUAL_PLAN', false),

  // Exportar PDF — mostra botão de exportar no chat
  EXPORT_PDF: flag('EXPORT_PDF', false),

  // Modo demo — mostra banner "teste sem cadastro"
  DEMO_MODE: flag('DEMO_MODE', false),

  // Histórico de conversas — painel lateral com sessões anteriores
  HISTORY: flag('HISTORY', false),

  // Relatório de uso — métricas de perguntas, sessões e tempo economizado
  USAGE_REPORT: flag('USAGE_REPORT', false),
} as const
