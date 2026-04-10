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

export default function TermosPage() {
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
        Termos de Uso
      </h1>
      <p style={{ fontSize: 12, color: '#999', margin: '0 0 48px 0', fontFamily: 'system-ui, sans-serif' }}>
        Última atualização: 10 de abril de 2026
      </p>

      <Section title="1. Aceitação dos Termos">
        <p>Ao acessar ou utilizar a plataforma Lore (&quot;Plataforma&quot;), operada por João Vitor Dalseno (&quot;Lore&quot;, &quot;nós&quot;), você (&quot;Usuário&quot;) concorda com estes Termos de Uso. Caso não concorde, não utilize a Plataforma.</p>
      </Section>

      <Section title="2. Descrição do Serviço">
        <p>O Lore é uma plataforma de software como serviço (SaaS) voltada para escritórios de advocacia, que oferece: (a) geração automatizada de documentos jurídicos com apoio de inteligência artificial; (b) gestão de prazos processuais com alertas automáticos; (c) busca inteligente em documentos internos do escritório; (d) gestão de clientes e processos.</p>
      </Section>

      <Section title="3. Cadastro e Conta">
        <p style={{ marginBottom: 8 }}>3.1 Para utilizar o Lore, o Usuário deve criar uma conta fornecendo informações verdadeiras, precisas e atualizadas.</p>
        <p style={{ marginBottom: 8 }}>3.2 O Usuário é responsável pela confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.</p>
        <p>3.3 O Lore reserva-se o direito de suspender ou encerrar contas que violem estes Termos ou que apresentem informações falsas.</p>
      </Section>

      <Section title="4. Planos e Pagamento">
        <p style={{ marginBottom: 8 }}>4.1 O Lore oferece período de teste gratuito de 14 (quatorze) dias, sem necessidade de cadastro de cartão de crédito.</p>
        <p style={{ marginBottom: 8 }}>4.2 Após o período de teste, a continuidade do serviço está condicionada à contratação de um dos planos pagos disponíveis.</p>
        <p style={{ marginBottom: 8 }}>4.3 Os pagamentos são processados pela plataforma Stripe, sujeitos aos termos e condições desta.</p>
        <p style={{ marginBottom: 8 }}>4.4 Os valores dos planos são cobrados de forma recorrente, mensal ou anual, conforme escolha do Usuário no momento da contratação.</p>
        <p>4.5 O Lore reserva-se o direito de reajustar os preços mediante aviso prévio de 30 (trinta) dias ao Usuário.</p>
      </Section>

      <Section title="5. Cancelamento e Reembolso">
        <p style={{ marginBottom: 8 }}>5.1 O Usuário pode cancelar sua assinatura a qualquer momento, sem multa ou fidelidade.</p>
        <p style={{ marginBottom: 8 }}>5.2 O cancelamento tem efeito no final do período de cobrança vigente, sendo mantido o acesso até essa data.</p>
        <p>5.3 Não são realizados reembolsos proporcionais por períodos não utilizados, salvo nas hipóteses previstas no Código de Defesa do Consumidor (Lei nº 8.078/1990), incluindo o direito de arrependimento de 7 (sete) dias para contratações realizadas à distância.</p>
      </Section>

      <Section title="6. Uso Adequado da Plataforma">
        <p style={{ marginBottom: 8 }}>6.1 O Usuário concorda em utilizar o Lore exclusivamente para fins lícitos e de acordo com a legislação brasileira vigente.</p>
        <p style={{ marginBottom: 8 }}>6.2 É vedado ao Usuário: (a) utilizar a Plataforma para fins ilegais ou que violem direitos de terceiros; (b) tentar acessar áreas restritas ou dados de outros usuários; (c) realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da Plataforma; (d) utilizar sistemas automatizados para acessar a Plataforma sem autorização prévia.</p>
        <p>6.3 O Lore não se responsabiliza pelo conteúdo dos documentos gerados pelo Usuário, sendo de responsabilidade exclusiva deste a revisão, adequação e utilização dos documentos produzidos pela Plataforma.</p>
      </Section>

      <Section title="7. Inteligência Artificial e Limitações">
        <p style={{ marginBottom: 8 }}>7.1 Os documentos gerados pela Plataforma são produzidos com apoio de inteligência artificial e devem ser revisados pelo Usuário antes de qualquer utilização profissional.</p>
        <p style={{ marginBottom: 8 }}>7.2 O Lore não garante que os documentos gerados estejam isentos de erros, inadequações ou que atendam às exigências específicas de cada caso concreto.</p>
        <p>7.3 A responsabilidade pela revisão técnica e jurídica dos documentos gerados é integralmente do Usuário, na qualidade de profissional habilitado.</p>
      </Section>

      <Section title="8. Propriedade Intelectual">
        <p style={{ marginBottom: 8 }}>8.1 A Plataforma, incluindo seu código-fonte, design, marcas e conteúdo, é de propriedade exclusiva do Lore e protegida pelas leis de propriedade intelectual aplicáveis.</p>
        <p>8.2 Os documentos e dados inseridos pelo Usuário na Plataforma pertencem ao próprio Usuário, que concede ao Lore licença limitada para processá-los com a finalidade de prestar os serviços contratados.</p>
      </Section>

      <Section title="9. Disponibilidade do Serviço">
        <p style={{ marginBottom: 8 }}>9.1 O Lore envida seus melhores esforços para manter a Plataforma disponível 24 (vinte e quatro) horas por dia, 7 (sete) dias por semana.</p>
        <p>9.2 Não obstante, o Lore não garante disponibilidade ininterrupta e não se responsabiliza por eventuais indisponibilidades decorrentes de manutenção, falhas técnicas ou fatores alheios ao seu controle.</p>
      </Section>

      <Section title="10. Limitação de Responsabilidade">
        <p style={{ marginBottom: 8 }}>10.1 O Lore não será responsável por danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou impossibilidade de uso da Plataforma.</p>
        <p>10.2 A responsabilidade total do Lore perante o Usuário, em qualquer hipótese, não excederá o valor pago pelo Usuário nos 3 (três) meses anteriores ao evento que deu origem à reclamação.</p>
      </Section>

      <Section title="11. Modificações dos Termos">
        <p>O Lore poderá modificar estes Termos a qualquer momento, mediante notificação ao Usuário por e-mail ou por aviso na Plataforma com antecedência mínima de 15 (quinze) dias. O uso continuado da Plataforma após a data de vigência das alterações implica aceitação dos novos Termos.</p>
      </Section>

      <Section title="12. Legislação Aplicável e Foro">
        <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Para a resolução de quaisquer conflitos, fica eleito o foro da Comarca de Ribeirão Preto, Estado de São Paulo, com exclusão de qualquer outro, por mais privilegiado que seja.</p>
      </Section>

      <Section title="13. Contato">
        <p>Para dúvidas sobre estes Termos, entre em contato: <a href="mailto:contato@uselore.com.br" style={{ color: '#0F6E56' }}>contato@uselore.com.br</a></p>
      </Section>

      <div style={{ marginTop: 64, paddingTop: 24, borderTop: '0.5px solid #e8e6e0' }}>
        <Link href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none', fontFamily: 'system-ui, sans-serif' }}>
          ← Voltar para o início
        </Link>
      </div>
    </div>
  )
}
