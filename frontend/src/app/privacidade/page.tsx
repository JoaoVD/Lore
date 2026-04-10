import Link from 'next/link'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, background: '#0F6E56', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 15, color: '#fff',
      }}>L</div>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', fontFamily: 'system-ui, sans-serif' }}>Lore</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1a1a1a', fontWeight: 500, margin: '0 0 12px 0' }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.8, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </div>
    </div>
  )
}

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px', background: '#fff', minHeight: '100vh' }}>

      {/* Nav */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 48, paddingBottom: 24, borderBottom: '0.5px solid #e8e6e0',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <Link href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}>
          ← Voltar
        </Link>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#1a1a1a', fontWeight: 400, margin: '0 0 8px 0' }}>
        Política de Privacidade
      </h1>
      <p style={{ fontSize: 12, color: '#999', margin: '0 0 48px 0', fontFamily: 'system-ui, sans-serif' }}>
        Última atualização: 10 de abril de 2026
      </p>

      <Section title="1. Introdução">
        <p>O Lore ("nós", "nosso") está comprometido com a proteção da privacidade dos seus Usuários. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — "LGPD").</p>
      </Section>

      <Section title="2. Dados Coletados">
        <p style={{ marginBottom: 8 }}><strong>2.1 Dados fornecidos pelo Usuário:</strong></p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px 0' }}>
          <li style={{ marginBottom: 6 }}>Nome completo e endereço de e-mail (no cadastro)</li>
          <li style={{ marginBottom: 6 }}>Informações de pagamento (processadas pela Stripe — não armazenamos dados de cartão de crédito)</li>
          <li style={{ marginBottom: 6 }}>Documentos e arquivos carregados na Plataforma</li>
          <li style={{ marginBottom: 6 }}>Informações de clientes e processos cadastrados</li>
        </ul>
        <p style={{ marginBottom: 8 }}><strong>2.2 Dados coletados automaticamente:</strong></p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Endereço IP e dados de navegação</li>
          <li style={{ marginBottom: 6 }}>Tipo de dispositivo e navegador</li>
          <li style={{ marginBottom: 6 }}>Páginas acessadas e tempo de uso</li>
          <li style={{ marginBottom: 6 }}>Logs de erro e performance</li>
        </ul>
      </Section>

      <Section title="3. Uso dos Dados">
        <p style={{ marginBottom: 8 }}>Utilizamos seus dados para:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Prestar os serviços contratados</li>
          <li style={{ marginBottom: 6 }}>Processar pagamentos e gerenciar sua assinatura</li>
          <li style={{ marginBottom: 6 }}>Enviar alertas de prazos e comunicações relacionadas ao serviço</li>
          <li style={{ marginBottom: 6 }}>Melhorar a Plataforma e desenvolver novos recursos</li>
          <li style={{ marginBottom: 6 }}>Cumprir obrigações legais e regulatórias</li>
          <li style={{ marginBottom: 6 }}>Prevenir fraudes e garantir a segurança da Plataforma</li>
        </ul>
      </Section>

      <Section title="4. Base Legal para Tratamento">
        <p style={{ marginBottom: 8 }}>O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Execução de contrato (prestação dos serviços contratados)</li>
          <li style={{ marginBottom: 6 }}>Legítimo interesse (melhoria dos serviços e segurança)</li>
          <li style={{ marginBottom: 6 }}>Cumprimento de obrigação legal</li>
          <li style={{ marginBottom: 6 }}>Consentimento, quando aplicável</li>
        </ul>
      </Section>

      <Section title="5. Compartilhamento de Dados">
        <p style={{ marginBottom: 8 }}>5.1 O Lore não vende, aluga ou compartilha seus dados pessoais com terceiros para fins comerciais.</p>
        <p style={{ marginBottom: 8 }}>5.2 Compartilhamos dados apenas com:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Supabase (infraestrutura de banco de dados) — com sede nos EUA, adequado ao GDPR e com cláusulas contratuais padrão</li>
          <li style={{ marginBottom: 6 }}>Stripe (processamento de pagamentos) — certificado PCI DSS</li>
          <li style={{ marginBottom: 6 }}>Anthropic (processamento de IA para geração de documentos) — os textos são processados mas não armazenados permanentemente</li>
          <li style={{ marginBottom: 6 }}>Resend (envio de e-mails transacionais)</li>
          <li style={{ marginBottom: 6 }}>Autoridades públicas, quando exigido por lei</li>
        </ul>
      </Section>

      <Section title="6. Segurança dos Dados">
        <p style={{ marginBottom: 8 }}>6.1 Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px 0' }}>
          <li style={{ marginBottom: 6 }}>Criptografia em trânsito (TLS/HTTPS)</li>
          <li style={{ marginBottom: 6 }}>Row Level Security (RLS) no banco de dados — cada escritório acessa apenas seus próprios dados</li>
          <li style={{ marginBottom: 6 }}>Autenticação segura via Supabase Auth</li>
          <li style={{ marginBottom: 6 }}>Backups regulares dos dados</li>
        </ul>
        <p>6.2 Em caso de incidente de segurança que possa afetar seus dados, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD) nos prazos legais aplicáveis.</p>
      </Section>

      <Section title="7. Retenção de Dados">
        <p style={{ marginBottom: 8 }}>7.1 Mantemos seus dados pelo período necessário para a prestação dos serviços e cumprimento das obrigações legais.</p>
        <p>7.2 Após o cancelamento da conta, seus dados serão mantidos por 90 (noventa) dias para fins de backup e, após esse prazo, serão excluídos permanentemente, salvo obrigação legal de retenção.</p>
      </Section>

      <Section title="8. Seus Direitos (LGPD)">
        <p style={{ marginBottom: 8 }}>Como titular de dados pessoais, você tem direito a:</p>
        <ul style={{ paddingLeft: 20, margin: '0 0 12px 0' }}>
          <li style={{ marginBottom: 6 }}>Confirmação da existência de tratamento</li>
          <li style={{ marginBottom: 6 }}>Acesso aos seus dados</li>
          <li style={{ marginBottom: 6 }}>Correção de dados incompletos, inexatos ou desatualizados</li>
          <li style={{ marginBottom: 6 }}>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
          <li style={{ marginBottom: 6 }}>Portabilidade dos dados</li>
          <li style={{ marginBottom: 6 }}>Eliminação dos dados tratados com base no consentimento</li>
          <li style={{ marginBottom: 6 }}>Informação sobre compartilhamento com terceiros</li>
          <li style={{ marginBottom: 6 }}>Revogação do consentimento</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato: <a href="mailto:contato@uselore.com.br" style={{ color: '#0F6E56' }}>contato@uselore.com.br</a>. Responderemos em até 15 (quinze) dias úteis.</p>
      </Section>

      <Section title="9. Cookies">
        <p style={{ marginBottom: 8 }}>9.1 Utilizamos cookies estritamente necessários para o funcionamento da Plataforma (autenticação e preferências do usuário).</p>
        <p>9.2 Não utilizamos cookies de rastreamento ou publicidade.</p>
      </Section>

      <Section title="10. Transferência Internacional de Dados">
        <p>Alguns dos nossos fornecedores (Supabase, Anthropic, Stripe) estão localizados nos Estados Unidos. Essas transferências são realizadas com garantias adequadas de proteção, incluindo cláusulas contratuais padrão aprovadas pela Comissão Europeia e certificações de conformidade.</p>
      </Section>

      <Section title="11. Encarregado de Proteção de Dados (DPO)">
        <p>Responsável: João Vitor Dalseno<br />E-mail: <a href="mailto:contato@uselore.com.br" style={{ color: '#0F6E56' }}>contato@uselore.com.br</a></p>
      </Section>

      <Section title="12. Alterações desta Política">
        <p>Podemos atualizar esta Política periodicamente. Notificaremos você por e-mail sobre alterações relevantes. A data da última atualização consta no início deste documento.</p>
      </Section>

      <Section title="13. Contato e Reclamações">
        <p style={{ marginBottom: 8 }}>Para dúvidas, solicitações ou reclamações sobre privacidade: <a href="mailto:contato@uselore.com.br" style={{ color: '#0F6E56' }}>contato@uselore.com.br</a></p>
        <p>Você também pode registrar reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD): <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: '#0F6E56' }}>www.gov.br/anpd</a></p>
      </Section>

      <div style={{ marginTop: 64, paddingTop: 24, borderTop: '0.5px solid #e8e6e0' }}>
        <Link href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}>
          ← Voltar para o início
        </Link>
      </div>
    </div>
  )
}
