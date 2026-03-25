'use client'

import { useEffect } from 'react'
import Link from 'next/link'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1 }}>L</span>
      </div>
      <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 400, color: '#085041' }}>Lore</span>
    </div>
  )
}

export default function PrivacyPage() {
  useEffect(() => {
    const fonts = document.createElement('link')
    fonts.rel = 'stylesheet'
    fonts.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap'
    document.head.appendChild(fonts)
  }, [])

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #F1EFE8; color: #1C1C1A; line-height: 1.6; }
    ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #F1EFE8; } ::-webkit-scrollbar-thumb { background: #C8C6BC; border-radius: 3px; }
    .prose h2 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 400; color: #1C1C1A; margin: 36px 0 12px; }
    .prose h3 { font-size: 15px; font-weight: 500; color: #1C1C1A; margin: 24px 0 8px; }
    .prose p { font-size: 15px; color: #3A3A38; line-height: 1.75; margin-bottom: 14px; font-weight: 300; }
    .prose ul { padding-left: 20px; margin-bottom: 14px; }
    .prose ul li { font-size: 15px; color: #3A3A38; line-height: 1.75; margin-bottom: 6px; font-weight: 300; }
    .prose a { color: #0F6E56; text-decoration: none; }
    .prose a:hover { text-decoration: underline; }
  `

  return (
    <>
      <style>{css}</style>

      {/* Nav */}
      <nav style={{ background: 'rgba(241,239,232,0.93)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(200,198,188,0.6)', height: 60, display: 'flex', alignItems: 'center', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 40px 100px' }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F6E56', marginBottom: 12 }}>Legal</p>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.15, color: '#1C1C1A', marginBottom: 8 }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 14, color: '#7A7870', marginBottom: 48 }}>Última atualização: 19 de março de 2026</p>

        <div className="prose">
          <p>
            A sua privacidade é importante para nós. Esta Política de Privacidade descreve como o Lore coleta, utiliza, armazena e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>

          <h2>1. Quem Somos</h2>
          <p>
            O Lore é operado pela Lore Tecnologia Ltda., responsável pelo tratamento dos dados pessoais coletados por meio de nossa plataforma. Em caso de dúvidas, entre em contato pelo e-mail <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>.
          </p>

          <h2>2. Dados que Coletamos</h2>
          <h3>2.1 Dados fornecidos por você</h3>
          <ul>
            <li><strong>Cadastro:</strong> nome completo, endereço de e-mail e senha (armazenada de forma criptografada);</li>
            <li><strong>Pagamento:</strong> informações de cobrança processadas diretamente pelo Stripe — não armazenamos dados de cartão;</li>
            <li><strong>Documentos:</strong> arquivos que você carrega na plataforma para fins de indexação e consulta.</li>
          </ul>
          <h3>2.2 Dados coletados automaticamente</h3>
          <ul>
            <li>Endereço IP e dados de geolocalização aproximada;</li>
            <li>Tipo de dispositivo, sistema operacional e navegador;</li>
            <li>Páginas acessadas, horários e duração das sessões;</li>
            <li>Logs de uso das funcionalidades da plataforma.</li>
          </ul>

          <h2>3. Como Usamos seus Dados</h2>
          <p>Utilizamos suas informações para:</p>
          <ul>
            <li>Criar e gerenciar sua conta e assinatura;</li>
            <li>Processar pagamentos e emitir cobranças;</li>
            <li>Fornecer e melhorar as funcionalidades da plataforma;</li>
            <li>Enviar comunicações transacionais (confirmações, alertas de conta);</li>
            <li>Enviar comunicações de produto e novidades, respeitando sua preferência de opt-out;</li>
            <li>Cumprir obrigações legais e regulatórias;</li>
            <li>Prevenir fraudes e garantir a segurança do serviço.</li>
          </ul>

          <h2>4. Base Legal para o Tratamento</h2>
          <p>Tratamos seus dados com base nas seguintes hipóteses legais previstas na LGPD:</p>
          <ul>
            <li><strong>Execução de contrato:</strong> para fornecer o serviço contratado;</li>
            <li><strong>Consentimento:</strong> para comunicações de marketing (revogável a qualquer momento);</li>
            <li><strong>Legítimo interesse:</strong> para segurança, prevenção de fraudes e melhoria do serviço;</li>
            <li><strong>Cumprimento de obrigação legal:</strong> quando exigido por lei.</li>
          </ul>

          <h2>5. Compartilhamento de Dados</h2>
          <p>Não vendemos seus dados pessoais. Podemos compartilhá-los apenas com:</p>
          <ul>
            <li><strong>Stripe:</strong> processamento de pagamentos;</li>
            <li><strong>Supabase:</strong> banco de dados e autenticação;</li>
            <li><strong>OpenAI:</strong> processamento de consultas por inteligência artificial;</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação;</li>
            <li><strong>Autoridades competentes:</strong> quando exigido por lei ou ordem judicial.</li>
          </ul>
          <p>
            Todos os fornecedores são selecionados com base em seus padrões de segurança e privacidade, e processam dados apenas conforme nossas instruções.
          </p>

          <h2>6. Armazenamento e Segurança</h2>
          <p>
            Seus dados são armazenados em servidores seguros com criptografia em repouso e em trânsito (TLS/SSL). Adotamos controles de acesso, autenticação multifator e monitoramento contínuo para proteger suas informações contra acessos não autorizados, perdas ou vazamentos.
          </p>
          <p>
            Apesar de nossos esforços, nenhum sistema é completamente invulnerável. Em caso de incidente de segurança que afete seus dados, notificaremos você conforme exigido pela LGPD.
          </p>

          <h2>7. Retenção de Dados</h2>
          <p>
            Mantemos seus dados pelo tempo necessário para prestar o serviço e cumprir obrigações legais. Após o encerramento da sua conta, excluímos ou anonimizamos seus dados em até 90 dias, exceto quando a retenção for exigida por lei.
          </p>

          <h2>8. Seus Direitos (LGPD)</h2>
          <p>Como titular dos dados, você tem direito a:</p>
          <ul>
            <li>Confirmar a existência de tratamento dos seus dados;</li>
            <li>Acessar os dados que temos sobre você;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Solicitar a portabilidade dos seus dados para outro serviço;</li>
            <li>Revogar o consentimento dado a qualquer momento;</li>
            <li>Obter informações sobre com quem compartilhamos seus dados.</li>
          </ul>
          <p>
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>. Responderemos em até 15 dias úteis.
          </p>

          <h2>9. Cookies e Tecnologias Similares</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma (como manutenção de sessão e preferências de usuário). Não utilizamos cookies de rastreamento publicitário de terceiros. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento de algumas funcionalidades.
          </p>

          <h2>10. Links para Sites de Terceiros</h2>
          <p>
            Nossa plataforma pode conter links para sites externos. Não somos responsáveis pelas práticas de privacidade desses sites e recomendamos que você leia as políticas de privacidade de cada site que visitar.
          </p>

          <h2>11. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. Notificaremos você por e-mail ou por aviso na plataforma sobre mudanças significativas. A data da última atualização será sempre indicada no topo deste documento.
          </p>

          <h2>12. Contato e Encarregado de Dados (DPO)</h2>
          <p>
            Para qualquer questão relacionada à privacidade ou ao tratamento dos seus dados pessoais, entre em contato com nosso encarregado de dados:<br />
            E-mail: <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#1C1C1A', padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Início', href: '/' },
              { label: 'Termos de uso', href: '/terms' },
              { label: 'Privacidade', href: '/privacy' },
              { label: 'Contato', href: '/contact' },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ fontSize: 13, color: l.href === '/privacy' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = l.href === '/privacy' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)')}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Lore. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  )
}
