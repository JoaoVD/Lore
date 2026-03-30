'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Article {
  id: string
  question: string
  answer: React.ReactNode
}

interface Category {
  id: string
  icon: string
  label: string
  articles: Article[]
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-brand' : 'text-stone'}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ── Step helper ───────────────────────────────────────────────────────────────

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-3 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 h-5 w-5 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
          <span className="text-sm text-ink/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 bg-brand-light border border-brand/20 rounded-xl px-4 py-3 text-sm text-brand leading-relaxed">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{children}</span>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 leading-relaxed">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>{children}</span>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-stone/20 text-ink font-mono text-xs px-1.5 py-0.5 rounded">{children}</code>
}

// ── Content ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'primeiros-passos',
    icon: '🚀',
    label: 'Primeiros passos',
    articles: [
      {
        id: 'o-que-e-lore',
        question: 'O que é o Lore?',
        answer: (
          <div className="flex flex-col gap-3 text-sm text-ink/80 leading-relaxed">
            <p>
              O <strong>Lore</strong> é uma plataforma de IA que transforma documentos e sistemas da sua empresa em um assistente inteligente via chat. Em vez de perder tempo procurando informações em PDFs, planilhas ou sistemas, qualquer membro da equipe pode simplesmente <em>perguntar</em>.
            </p>
            <p>O Lore possui dois produtos principais:</p>
            <ul className="flex flex-col gap-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-base">📄</span>
                <span><strong>Lore Docs</strong> — indexa PDFs, Word e arquivos de texto. Ideal para manuais, contratos, procedimentos internos e qualquer documentação.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base">📦</span>
                <span><strong>Lore Estoq</strong> — conecta com APIs externas (como sistemas de estoque) para que vendedores consultem disponibilidade e preço em tempo real pelo chat.</span>
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'criar-conta',
        question: 'Como criar minha conta?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80">O cadastro é rápido e não exige cartão de crédito.</p>
            <Steps items={[
              'Acesse <strong>uselore.com.br</strong> e clique em <strong>"Começar grátis"</strong>.',
              'Preencha seu e-mail e crie uma senha segura.',
              'Confirme seu e-mail clicando no link que enviamos para sua caixa de entrada.',
              'Pronto! Você será redirecionado automaticamente para o seu painel.',
            ]} />
            <Tip>Verifique a pasta de spam caso o e-mail de confirmação demore mais de 2 minutos.</Tip>
          </div>
        ),
      },
      {
        id: 'criar-projeto',
        question: 'Como criar meu primeiro projeto?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Projetos são espaços separados — pense em cada projeto como uma "base de conhecimento" independente. Você pode ter um projeto para cada cliente, departamento ou produto.
            </p>
            <Steps items={[
              'No painel principal (<strong>Dashboard</strong>), clique em <strong>"Novo projeto"</strong>.',
              'Dê um nome ao projeto (ex: "Manual Interno", "Estoque 2024").',
              'Adicione uma descrição opcional.',
              'Clique em <strong>"Criar"</strong>. Você será levado direto para o chat do projeto.',
            ]} />
            <Note>No plano gratuito você pode criar até 1 projeto. Faça upgrade para criar mais.</Note>
          </div>
        ),
      },
      {
        id: 'upload-documentos',
        question: 'Como fazer upload de documentos?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              O Lore aceita arquivos <strong>PDF, Word (.docx)</strong> e <strong>texto (.txt)</strong> com até <strong>20 MB</strong> cada.
            </p>
            <Steps items={[
              'Abra o projeto e clique no ícone de <strong>upload</strong> (ou arraste o arquivo para a área indicada).',
              'Aguarde o processamento. O status vai de <strong>"Processando…"</strong> para <strong>"Pronto"</strong> em alguns segundos.',
              'Assim que ficar pronto, comece a fazer perguntas sobre o conteúdo.',
            ]} />
            <Tip>Arquivos muito grandes podem levar até 1 minuto para serem indexados. Não feche a aba durante o processamento.</Tip>
          </div>
        ),
      },
      {
        id: 'usar-chat',
        question: 'Como usar o chat para fazer perguntas?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              O chat funciona em linguagem natural — é só perguntar como faria para um colega de trabalho.
            </p>
            <Steps items={[
              'Abra o projeto que tem os documentos carregados.',
              'Digite sua pergunta no campo de texto e pressione <strong>Enter</strong> (ou clique em enviar).',
              'O Lore vai buscar nos documentos e responder com a informação encontrada, sempre indicando <strong>de qual arquivo e página</strong> veio a resposta.',
            ]} />
            <p className="text-sm text-ink/80 leading-relaxed mt-2">
              Se a informação não estiver nos documentos carregados, o Lore vai dizer isso claramente — ele nunca inventa respostas.
            </p>
            <Note>O histórico de conversa é salvo automaticamente. Você pode retomar de onde parou a qualquer momento.</Note>
          </div>
        ),
      },
    ],
  },
  {
    id: 'google-drive',
    icon: '📁',
    label: 'Google Drive',
    articles: [
      {
        id: 'conectar-google-drive',
        question: 'Como conectar o Google Drive ao Lore?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              A integração com Google Drive permite sincronizar automaticamente arquivos de uma pasta do Drive com o seu projeto.
            </p>
            <Steps items={[
              'Abra o projeto e vá em <strong>Configurações</strong> (ícone de engrenagem ou link no topo).',
              'Role até a seção <strong>"Integrações"</strong>.',
              'Clique em <strong>"Conectar Google Drive"</strong>.',
              'Uma janela do Google vai abrir para você autorizar o acesso. Faça login com a conta que tem os arquivos.',
              'Clique em <strong>"Permitir"</strong> para conceder acesso ao Lore.',
              'Você será redirecionado de volta ao Lore com o Drive conectado.',
            ]} />
            <Note>A conexão com o Google Drive é por <strong>conta do Google</strong>, não por projeto. Uma vez conectado, você pode usar o mesmo Drive em vários projetos.</Note>
          </div>
        ),
      },
      {
        id: 'vincular-pasta',
        question: 'Como vincular uma pasta do Drive ao projeto?',
        answer: (
          <div className="flex flex-col gap-2">
            <Steps items={[
              'Com o Google Drive já conectado, vá em <strong>Configurações → Integrações</strong>.',
              'No seletor de pastas, escolha a pasta que contém seus arquivos.',
              'Clique em <strong>"Salvar pasta"</strong>.',
              'Clique em <strong>"Sincronizar agora"</strong> para importar os arquivos da pasta.',
            ]} />
            <Tip>Cada projeto só pode ter <strong>uma pasta</strong> vinculada. Para mudar, selecione outra pasta e salve novamente.</Tip>
          </div>
        ),
      },
      {
        id: 'sincronizar-drive',
        question: 'Como funciona a sincronização de arquivos do Drive?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              A sincronização importa todos os arquivos <strong>PDF, Word e .txt</strong> da pasta vinculada para o projeto.
            </p>
            <Steps items={[
              'Vá em <strong>Configurações → Integrações → Google Drive</strong>.',
              'Clique em <strong>"Sincronizar agora"</strong>.',
              'O Lore vai verificar quais arquivos são novos e importar apenas eles.',
              'Arquivos já importados anteriormente não são duplicados.',
            ]} />
            <Note>A sincronização não é automática — você precisa clicar em "Sincronizar agora" cada vez que adicionar novos arquivos à pasta do Drive.</Note>
          </div>
        ),
      },
      {
        id: 'desconectar-drive',
        question: 'Como desconectar ou desvincular o Google Drive?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Para remover a pasta vinculada de um projeto específico:
            </p>
            <Steps items={[
              'Vá em <strong>Configurações → Integrações → Google Drive</strong>.',
              'Clique no ícone de <strong>lixeira</strong> ao lado do botão de sincronização.',
              'A pasta será desvinculada, mas os documentos já importados <strong>permanecem</strong> no projeto.',
            ]} />
            <Tip>Remover a vinculação não exclui os documentos já indexados. Para removê-los, delete os arquivos manualmente na aba de documentos do projeto.</Tip>
          </div>
        ),
      },
    ],
  },
  {
    id: 'api-rest',
    icon: '🔌',
    label: 'Integração com API REST',
    articles: [
      {
        id: 'o-que-e-api',
        question: 'O que é a integração com API REST?',
        answer: (
          <div className="flex flex-col gap-3 text-sm text-ink/80 leading-relaxed">
            <p>
              A integração com API REST permite que o Lore consulte <strong>sistemas externos em tempo real</strong> durante o chat — como sistemas de estoque, ERPs ou qualquer API que retorne dados em JSON.
            </p>
            <p>
              Com isso, um vendedor pode simplesmente perguntar:
            </p>
            <div className="bg-brand-light rounded-xl px-4 py-3 flex flex-col gap-2">
              <div className="flex justify-end">
                <span className="bg-brand text-white text-xs px-3 py-1.5 rounded-full">Vendedor: Tem cimento CP-II em estoque?</span>
              </div>
              <div className="flex justify-start">
                <span className="bg-white border border-stone/30 text-ink text-xs px-3 py-1.5 rounded-full">Lore: Cimento CP-II 50kg — 47 un. · R$ 38,90</span>
              </div>
            </div>
            <p>
              Em vez de navegar em telas do sistema, a resposta aparece direto no chat.
            </p>
          </div>
        ),
      },
      {
        id: 'configurar-api-url',
        question: 'Como configurar a URL base e o endpoint de busca?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Você precisa de dois dados do seu sistema:
            </p>
            <ul className="flex flex-col gap-2 text-sm text-ink/80 ml-4">
              <li>
                <strong>URL base</strong> — o endereço raiz da API. Ex: <Code>https://api.meusistema.com.br/v1</Code>
              </li>
              <li>
                <strong>Endpoint de busca</strong> — o caminho específico para buscar produtos/itens. Ex: <Code>/produtos?nome={'{query}'}</Code>
              </li>
            </ul>
            <Note>
              Use <Code>{'{query}'}</Code> no endpoint onde deve entrar o termo que o vendedor digitou no chat. O Lore substitui automaticamente.
            </Note>
            <Steps items={[
              'Vá em <strong>Configurações → Integração com API</strong>.',
              'Preencha o campo <strong>"URL base da API"</strong> com o endereço raiz.',
              'Preencha <strong>"Endpoint de busca"</strong> com o caminho, usando <strong>{query}</strong> como marcador.',
            ]} />
          </div>
        ),
      },
      {
        id: 'configurar-autenticacao',
        question: 'Como configurar a autenticação da API?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              A maioria das APIs exige um token de autenticação. O Lore suporta três formatos:
            </p>
            <div className="flex flex-col gap-2 mt-1">
              {[
                { tipo: 'API Key', header: 'Authorization', valor: 'SuaChaveAqui' },
                { tipo: 'Bearer Token', header: 'Authorization', valor: 'Bearer TOKEN_AQUI' },
                { tipo: 'Basic Auth', header: 'Authorization', valor: 'Basic base64(user:senha)' },
              ].map(({ tipo, header, valor }) => (
                <div key={tipo} className="bg-parchment border border-stone/30 rounded-xl px-4 py-3 text-xs font-mono text-ink/70">
                  <span className="text-brand font-semibold not-italic font-sans text-xs">{tipo}</span>
                  <div className="mt-1">{header}: <span className="text-ink/50">{valor}</span></div>
                </div>
              ))}
            </div>
            <Steps items={[
              'Selecione o <strong>Tipo de auth</strong> correspondente à sua API.',
              'Em <strong>"Header"</strong>, confirme o nome do cabeçalho (geralmente <Code>Authorization</Code>).',
              'Em <strong>"Token / Chave"</strong>, cole o valor do token fornecido pelo seu sistema.',
            ]} />
            <Tip>O token é armazenado de forma segura e nunca é exibido na tela após salvo. Para atualizá-lo, simplesmente digite o novo valor e salve.</Tip>
          </div>
        ),
      },
      {
        id: 'mapear-campos',
        question: 'Como mapear os campos do JSON de resposta?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Cada API retorna os dados com nomes de campos diferentes. Você precisa informar ao Lore como se chamam os campos no seu JSON.
            </p>
            <div className="bg-parchment rounded-xl border border-stone/30 p-4 text-xs font-mono text-ink/70 overflow-x-auto">
              {`{
  "data": [
    {
      "nome": "Cimento CP-II 50kg",    ← field_name
      "preco": "38.90",                ← field_price
      "estoque": 47,                   ← field_stock
      "codigo": "CIM-001"              ← field_sku
    }
  ]
}`}
            </div>
            <div className="flex flex-col gap-1.5 text-sm text-ink/80 mt-1">
              <p>Preencha os campos de mapeamento conforme o exemplo acima:</p>
              <ul className="flex flex-col gap-1 ml-4 text-xs text-ink/70">
                <li><strong>Nome do produto</strong> → nome do campo com a descrição do item</li>
                <li><strong>Preço</strong> → nome do campo com o valor monetário</li>
                <li><strong>Estoque</strong> → nome do campo com a quantidade disponível</li>
                <li><strong>Código / SKU</strong> → nome do campo com o código do produto (opcional)</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: 'caminho-json',
        question: 'O que é o "Caminho da lista no JSON"?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Quando a API retorna os itens dentro de um objeto aninhado, você precisa informar o caminho até a lista.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Se a API retorna:</p>
                <div className="bg-parchment rounded-xl border border-stone/30 p-3 text-xs font-mono text-ink/70">
                  {`{ "data": [ {...}, {...} ] }`}
                </div>
                <p className="text-xs text-brand mt-1 font-medium">→ Caminho: <Code>data</Code></p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink mb-1">Se a API retorna:</p>
                <div className="bg-parchment rounded-xl border border-stone/30 p-3 text-xs font-mono text-ink/70">
                  {`{ "result": { "items": [...] } }`}
                </div>
                <p className="text-xs text-brand mt-1 font-medium">→ Caminho: <Code>result.items</Code></p>
              </div>
            </div>
            <Note>Se a API retorna diretamente um array <Code>[{`{...}`}]</Code>, deixe o campo em branco.</Note>
          </div>
        ),
      },
      {
        id: 'testar-api',
        question: 'Como testar a conexão com a API?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Antes de salvar, use o botão de teste para validar que tudo está configurado corretamente.
            </p>
            <Steps items={[
              'Preencha todos os campos do formulário de integração.',
              'Clique em <strong>"Testar conexão"</strong>.',
              'O Lore vai fazer uma chamada real à sua API com o termo <em>"produto"</em> e mostrar os 3 primeiros resultados.',
              'Verifique se os campos aparecem corretamente (nome, preço, estoque).',
              'Se tudo estiver certo, clique em <strong>"Salvar"</strong>.',
            ]} />
            <Tip>Se o teste falhar, verifique: (1) se a URL base está correta, (2) se o token é válido, (3) se o endpoint aceita o parâmetro de busca como configurado.</Tip>
          </div>
        ),
      },
    ],
  },
  {
    id: 'membros',
    icon: '👥',
    label: 'Membros e Permissões',
    articles: [
      {
        id: 'convidar-membro',
        question: 'Como convidar alguém para o projeto?',
        answer: (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink/80 leading-relaxed">
              Você pode convidar qualquer pessoa que já tenha conta no Lore.
            </p>
            <Steps items={[
              'Vá em <strong>Configurações → Membros e Permissões</strong>.',
              'Na seção "Convidar por e-mail", digite o e-mail da pessoa.',
              'Escolha o nível de acesso: <strong>Viewer</strong> ou <strong>Editor</strong>.',
              'Clique em <strong>"Convidar"</strong>. A pessoa terá acesso imediatamente.',
            ]} />
            <Note>A pessoa convidada precisa ter uma conta ativa no Lore. Se não tiver, peça para ela se cadastrar primeiro em uselore.com.br.</Note>
          </div>
        ),
      },
      {
        id: 'roles',
        question: 'Qual a diferença entre Owner, Editor e Viewer?',
        answer: (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/80">Cada projeto tem três níveis de permissão:</p>
            <div className="flex flex-col gap-2">
              {[
                {
                  role: 'Owner',
                  color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  desc: 'Criador do projeto. Pode fazer tudo: gerenciar membros, configurar integrações, excluir o projeto.',
                },
                {
                  role: 'Editor',
                  color: 'bg-blue-100 text-blue-700 border-blue-200',
                  desc: 'Pode fazer upload e deletar documentos. Não pode gerenciar membros nem alterar configurações.',
                },
                {
                  role: 'Viewer',
                  color: 'bg-stone/20 text-ink/60 border-stone/40',
                  desc: 'Só pode visualizar documentos e usar o chat. Ideal para usuários que só precisam consultar.',
                },
              ].map(({ role, color, desc }) => (
                <div key={role} className="flex items-start gap-3 p-3 bg-parchment rounded-xl border border-stone/30">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${color}`}>
                    {role}
                  </span>
                  <p className="text-sm text-ink/70 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        id: 'alterar-role',
        question: 'Como alterar o nível de acesso de um membro?',
        answer: (
          <div className="flex flex-col gap-2">
            <Steps items={[
              'Vá em <strong>Configurações → Membros e Permissões</strong>.',
              'Localize o membro na lista.',
              'Clique no seletor de role ao lado do nome e escolha o novo nível.',
              'A alteração é salva automaticamente.',
            ]} />
            <Note>Não é possível alterar o role do Owner do projeto.</Note>
          </div>
        ),
      },
      {
        id: 'remover-membro',
        question: 'Como remover um membro do projeto?',
        answer: (
          <div className="flex flex-col gap-2">
            <Steps items={[
              'Vá em <strong>Configurações → Membros e Permissões</strong>.',
              'Clique no ícone de <strong>lixeira</strong> ao lado do membro que deseja remover.',
              'A remoção é imediata — o membro perde o acesso instantaneamente.',
            ]} />
            <Tip>Remover um membro não exclui as mensagens de chat que ele enviou. O histórico é mantido no projeto.</Tip>
          </div>
        ),
      },
    ],
  },
  {
    id: 'planos',
    icon: '💳',
    label: 'Planos e Cobrança',
    articles: [
      {
        id: 'plano-gratis',
        question: 'Como funciona o período gratuito?',
        answer: (
          <div className="flex flex-col gap-2 text-sm text-ink/80 leading-relaxed">
            <p>
              Todo usuário começa com <strong>14 dias grátis</strong> no plano de sua escolha, sem precisar cadastrar cartão de crédito.
            </p>
            <p>
              Durante o período gratuito você tem acesso completo a todas as funcionalidades do plano escolhido. Ao final dos 14 dias, você pode assinar ou continuar no plano gratuito com limitações.
            </p>
            <Note>Você receberá um lembrete por e-mail antes do período gratuito encerrar.</Note>
          </div>
        ),
      },
      {
        id: 'planos-disponiveis',
        question: 'Quais são os planos disponíveis?',
        answer: (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-stone/30 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-1">Pro</p>
                <p className="text-2xl font-bold text-ink mb-3">R$ 180<span className="text-sm font-normal text-ink/50">/mês</span></p>
                <ul className="flex flex-col gap-1.5 text-xs text-ink/70">
                  {['5 projetos', '5 usuários por projeto', 'Documentos ilimitados', 'Suporte por e-mail'].map(f => (
                    <li key={f} className="flex items-center gap-1.5"><span className="text-brand">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-brand rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Business</p>
                <p className="text-2xl font-bold text-white mb-3">R$ 290<span className="text-sm font-normal text-white/60">/mês</span></p>
                <ul className="flex flex-col gap-1.5 text-xs text-white/80">
                  {['Projetos ilimitados', 'Usuários ilimitados', 'Google Drive sync', 'Integração com API REST', 'Suporte prioritário'].map(f => (
                    <li key={f} className="flex items-center gap-1.5"><span className="text-brand-mid">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Link href="/billing" className="inline-flex items-center gap-1.5 text-sm text-brand font-medium hover:underline mt-1">
              Ver detalhes e fazer upgrade →
            </Link>
          </div>
        ),
      },
      {
        id: 'cancelar',
        question: 'Como cancelar ou alterar meu plano?',
        answer: (
          <div className="flex flex-col gap-2 text-sm text-ink/80 leading-relaxed">
            <Steps items={[
              'Acesse <strong>Faturamento</strong> no menu lateral do painel.',
              'Clique em <strong>"Gerenciar assinatura"</strong>.',
              'Você será redirecionado para o portal seguro do Stripe onde pode alterar ou cancelar.',
            ]} />
            <Note>Ao cancelar, você mantém acesso até o final do período já pago. Não há cobrança de multa ou taxas de cancelamento.</Note>
          </div>
        ),
      },
    ],
  },
]

// ── Accordion Item ────────────────────────────────────────────────────────────

function AccordionItem({
  article,
  isOpen,
  onToggle,
  highlight,
}: {
  article: Article
  isOpen: boolean
  onToggle: () => void
  highlight: boolean
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div
      id={article.id}
      className={`border-b border-stone/30 last:border-b-0 transition-colors duration-150 ${highlight ? 'bg-brand-light/60' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-brand-light/40 transition-colors duration-150 group"
      >
        <span className={`text-sm font-medium leading-snug transition-colors duration-150 ${isOpen ? 'text-brand' : 'text-ink group-hover:text-brand'}`}>
          {article.question}
        </span>
        <IconChevron open={isOpen} />
      </button>

      <div
        style={{
          maxHeight: isOpen ? (contentRef.current?.scrollHeight ?? 1000) + 'px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div ref={contentRef} className="px-5 pb-5 pt-1">
          {article.answer}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AjudaPage() {
  const [search, setSearch] = useState('')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Filter articles by search term
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES
    const q = search.toLowerCase()
    return CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) => a.question.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.articles.length > 0)
  }, [search])

  // Auto-open all when searching
  useEffect(() => {
    if (search.trim()) {
      const ids = new Set<string>()
      filteredCategories.forEach((cat) => cat.articles.forEach((a) => ids.add(a.id)))
      setOpenItems(ids)
    }
  }, [search, filteredCategories])

  function toggleItem(id: string) {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function scrollToCategory(id: string) {
    const el = sectionRefs.current[id]
    if (el) {
      const offset = 80
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setActiveCategory(id)
  }

  // Track active section on scroll
  useEffect(() => {
    const handler = () => {
      const offset = 120
      for (const cat of [...CATEGORIES].reverse()) {
        const el = sectionRefs.current[cat.id]
        if (el && el.getBoundingClientRect().top <= offset) {
          setActiveCategory(cat.id)
          break
        }
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const totalArticles = CATEGORIES.reduce((acc, c) => acc + c.articles.length, 0)

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-parchment">

        {/* Hero */}
        <div className="bg-brand pt-14 pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-brand-mid text-sm font-semibold uppercase tracking-widest mb-3">Central de Ajuda</p>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Como podemos ajudar?
            </h1>
            <p className="text-white/70 mb-8 text-base">
              {totalArticles} artigos sobre como usar o Lore
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Buscar artigos… ex: Google Drive, upload, token"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-transparent text-sm text-ink placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-white/40 shadow-lg"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-stone hover:text-ink rounded"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category pills (mobile) */}
        <div className="lg:hidden sticky top-14 z-20 bg-surface border-b border-stone/30 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-brand text-white'
                    : 'bg-stone/20 text-ink/70 hover:bg-brand-light hover:text-brand'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex gap-10">

            {/* Sidebar (desktop) */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 mb-3 px-2">Categorias</p>
                <nav className="flex flex-col gap-0.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-colors duration-150 ${
                        activeCategory === cat.id
                          ? 'bg-brand-light text-brand font-medium'
                          : 'text-ink/70 hover:bg-brand-light/60 hover:text-ink'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-8 p-4 bg-white rounded-xl border border-stone/30">
                  <p className="text-xs font-semibold text-ink mb-1">Não encontrou?</p>
                  <p className="text-xs text-ink/60 mb-3 leading-relaxed">Entre em contato e responderemos em até 24h.</p>
                  <a
                    href="mailto:suporte@uselore.com.br"
                    className="block w-full bg-brand text-white text-center text-xs font-medium px-3 py-2 rounded-lg hover:bg-brand-dark transition-colors duration-150"
                  >
                    Falar com suporte
                  </a>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">

              {/* Search empty state */}
              {search.trim() && filteredCategories.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="text-base font-semibold text-ink mb-2">Nenhum artigo encontrado</p>
                  <p className="text-sm text-ink/60 mb-6">
                    Não encontramos resultados para <strong>"{search}"</strong>.
                  </p>
                  <a
                    href="mailto:suporte@uselore.com.br"
                    className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors duration-150"
                  >
                    Falar com suporte
                  </a>
                </div>
              )}

              {/* Categories */}
              <div className="flex flex-col gap-8">
                {filteredCategories.map((cat) => (
                  <section
                    key={cat.id}
                    ref={(el) => { sectionRefs.current[cat.id] = el }}
                    id={`section-${cat.id}`}
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-xl bg-brand-light flex items-center justify-center text-lg shrink-0">
                        {cat.icon}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-ink">{cat.label}</h2>
                        <p className="text-xs text-ink/50">{cat.articles.length} artigo{cat.articles.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Articles accordion */}
                    <div className="bg-white rounded-2xl border border-stone/30 shadow-sm overflow-hidden">
                      {cat.articles.map((article) => (
                        <AccordionItem
                          key={article.id}
                          article={article}
                          isOpen={openItems.has(article.id)}
                          onToggle={() => toggleItem(article.id)}
                          highlight={search.trim().length > 0}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* Bottom CTA */}
              {!search.trim() && (
                <div className="mt-12 bg-brand rounded-2xl p-8 text-center">
                  <p className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    Ainda tem dúvidas?
                  </p>
                  <p className="text-white/70 text-sm mb-5">
                    Nossa equipe responde em até 24 horas úteis.
                  </p>
                  <a
                    href="mailto:suporte@uselore.com.br"
                    className="inline-flex items-center gap-2 bg-white text-brand px-6 py-3 rounded-xl text-sm font-medium hover:bg-brand-light transition-colors duration-150"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Enviar e-mail para o suporte
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
