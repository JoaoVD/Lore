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

export default function TermsPage() {
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
          Termos de Uso
        </h1>
        <p style={{ fontSize: 14, color: '#7A7870', marginBottom: 48 }}>Última atualização: 19 de março de 2026</p>

        <div className="prose">
          <p>
            Bem-vindo ao Lore. Ao acessar ou utilizar nossa plataforma, você concorda com os presentes Termos de Uso. Leia-os com atenção antes de utilizar nossos serviços.
          </p>

          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao criar uma conta ou utilizar qualquer funcionalidade do Lore, você declara ter lido, compreendido e concordado com estes Termos de Uso e com nossa <a href="/privacy">Política de Privacidade</a>. Caso não concorde com qualquer disposição, não utilize nossos serviços.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            O Lore é uma plataforma de inteligência artificial voltada para gestão de conhecimento empresarial. Permite que empresas carreguem documentos e possibilitem que seus colaboradores façam perguntas em linguagem natural, recebendo respostas fundamentadas nos documentos cadastrados.
          </p>

          <h2>3. Cadastro e Conta</h2>
          <h3>3.1 Elegibilidade</h3>
          <p>
            Para utilizar o Lore, você deve ter ao menos 18 anos de idade e capacidade legal para celebrar contratos. Ao se cadastrar em nome de uma empresa, você declara ter autorização para vincular a empresa a estes termos.
          </p>
          <h3>3.2 Responsabilidade pela Conta</h3>
          <p>
            Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado pelo e-mail <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>.
          </p>

          <h2>4. Uso Permitido</h2>
          <p>Você pode usar o Lore para:</p>
          <ul>
            <li>Carregar documentos da sua empresa para fins de gestão de conhecimento;</li>
            <li>Realizar consultas em linguagem natural sobre o conteúdo dos documentos;</li>
            <li>Integrar o widget do Lore ao seu site ou sistema interno;</li>
            <li>Compartilhar acesso com colaboradores da sua organização.</li>
          </ul>

          <h2>5. Uso Proibido</h2>
          <p>É expressamente vedado:</p>
          <ul>
            <li>Utilizar o serviço para fins ilegais ou não autorizados;</li>
            <li>Carregar conteúdo que viole direitos de terceiros, incluindo propriedade intelectual;</li>
            <li>Tentar acessar sistemas ou dados de outros usuários;</li>
            <li>Realizar engenharia reversa, descompilar ou desmontar qualquer parte da plataforma;</li>
            <li>Revender ou sublicenciar o serviço sem autorização prévia por escrito;</li>
            <li>Utilizar scripts automatizados para sobrecarregar ou prejudicar a infraestrutura do Lore.</li>
          </ul>

          <h2>6. Conteúdo do Usuário</h2>
          <h3>6.1 Propriedade</h3>
          <p>
            Você mantém todos os direitos sobre os documentos e conteúdos que carrega na plataforma. Ao enviar conteúdo, você nos concede uma licença limitada, não exclusiva e revogável para processar esse conteúdo com o único propósito de fornecer o serviço.
          </p>
          <h3>6.2 Responsabilidade pelo Conteúdo</h3>
          <p>
            Você é o único responsável pelo conteúdo que carrega. Não carregue informações confidenciais de terceiros sem a devida autorização ou que violem leis aplicáveis, incluindo a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h2>7. Planos e Pagamentos</h2>
          <h3>7.1 Planos Disponíveis</h3>
          <p>
            O Lore oferece planos gratuito e pagos. Os planos pagos são cobrados mensalmente ou anualmente, conforme escolha do usuário no momento da contratação.
          </p>
          <h3>7.2 Trial Gratuito</h3>
          <p>
            Planos pagos incluem um período de trial gratuito de 14 dias. Nenhum valor é cobrado durante esse período. Após o trial, a cobrança é iniciada automaticamente, salvo cancelamento prévio.
          </p>
          <h3>7.3 Cancelamento e Reembolso</h3>
          <p>
            Você pode cancelar sua assinatura a qualquer momento pelo painel de controle. O acesso permanece ativo até o fim do período já pago. Reembolsos são avaliados caso a caso — entre em contato com <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>.
          </p>

          <h2>8. Disponibilidade do Serviço</h2>
          <p>
            Buscamos manter o Lore disponível 24 horas por dia, 7 dias por semana, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas ou emergenciais com ou sem aviso prévio. Não somos responsáveis por prejuízos decorrentes de indisponibilidades temporárias.
          </p>

          <h2>9. Propriedade Intelectual</h2>
          <p>
            O Lore, incluindo seu código-fonte, design, marca, logotipos, textos e funcionalidades, é de propriedade exclusiva da Lore Tecnologia Ltda. Nada nestes termos transfere qualquer direito de propriedade intelectual ao usuário, exceto a licença de uso descrita neste documento.
          </p>

          <h2>10. Limitação de Responsabilidade</h2>
          <p>
            Na máxima extensão permitida pela lei, o Lore não será responsável por danos indiretos, incidentais, especiais ou consequentes, incluindo perda de dados, lucros cessantes ou interrupção de negócios, mesmo que tenhamos sido informados sobre a possibilidade de tais danos.
          </p>

          <h2>11. Alterações nos Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Notificaremos você por e-mail ou por aviso na plataforma com pelo menos 15 dias de antecedência em caso de alterações materiais. O uso continuado do serviço após a data de vigência constitui aceitação dos novos termos.
          </p>

          <h2>12. Encerramento</h2>
          <p>
            Podemos suspender ou encerrar sua conta caso você viole estes Termos. Você pode encerrar sua conta a qualquer momento acessando as configurações ou solicitando pelo e-mail <a href="mailto:suporte@uselore.com.br">suporte@uselore.com.br</a>.
          </p>

          <h2>13. Lei Aplicável e Foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </p>

          <h2>14. Contato</h2>
          <p>
            Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco:<br />
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
              <Link key={l.label} href={l.href} style={{ fontSize: 13, color: l.href === '/terms' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = l.href === '/terms' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)')}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Lore. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  )
}
