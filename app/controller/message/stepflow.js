// Fluxo fixo — nunca altere o texto!
const fluxo = [
  `Oi, meu nome é Gabriel, represento a Cotálogo e nossa proposta é aprimorar a apresentação, divulgação e atendimento das empresas através de um catálogo digital como esse:

suaempresa.cotalogo.com

Gostaria de ter um personalizado para sua empresa?`,
  `Legal, esse catálogo é criado através de nossa plataforma que pode ser acessada pelo celular ou computador.

Através da plataforma você tem total controle do catálogo, podendo adicionar e atualizar os produtos por conta própria.

O catálogo custa R$49,90 por mês mas não exige assinatura, funciona como créditos de celular onde você recarrega e utiliza por 30 dias.

Nós daremos consultoria gratuita durante a construção do seu catálogo.

Qual é o seu nome?`,
  `Eu posso criar um esboço do seu catálogo, gostaria de ver como fica?`,
  `Legal, me envia por favor a foto da sua logomarca e de 2 produtos com nome e preço.`
];

// Histórico por cliente (pode ser substituído por DB)
const conversas = {};

/**
 * Retorna as mensagens formatadas para enviar ao ChatGPT
 */
function montarMensagens(clienteId, mensagemUsuario) {
  // Se não existir histórico, cria
  if (!conversas[clienteId]) {
    conversas[clienteId] = {
      step: 0,
      history: []
    };
  }

  const { step, history } = conversas[clienteId];

  // Mensagem fixa para o ChatGPT entender o comportamento
  const systemMessage = {
    role: "system",
    content: `
Você é um chatbot de prospecção ativa para a Cotálogo.
Siga exatamente este fluxo de mensagens, sem modificar nenhuma palavra, pontuação ou quebra de linha:

1. ${fluxo[0]}
2. ${fluxo[1]}
3. ${fluxo[2]}
4. ${fluxo[3]}

Regras:
- Nunca pule etapas.
- Se o usuário fizer uma pergunta fora do fluxo, responda brevemente com base na mensagem 2 e depois envie a próxima mensagem do fluxo.
- Se já enviou uma pergunta e ela não foi respondida, repita-a até obter resposta clara.
- No final, envie somente o texto da resposta (sem dizer 'Próxima mensagem é...').
`
  };

  // Histórico da conversa anterior + nova mensagem do usuário
  const mensagens = [
    systemMessage,
    ...history,
    { role: "user", content: mensagemUsuario }
  ];

  return mensagens;
}

/**
 * Atualiza o passo do fluxo após resposta do ChatGPT
 */
function avancarPasso(clienteId) {
  if (conversas[clienteId]) {
    if (conversas[clienteId].step < fluxo.length - 1) {
      conversas[clienteId].step++;
    }
  }
}

/**
 * Registra a resposta do assistente e atualiza histórico
 */
function registrarResposta(clienteId, resposta) {
  if (!conversas[clienteId]) return;
  conversas[clienteId].history.push({ role: "assistant", content: resposta });
}

/**
 * Registra a pergunta do usuário no histórico
 */
function registrarUsuario(clienteId, pergunta) {
  if (!conversas[clienteId]) return;
  conversas[clienteId].history.push({ role: "user", content: pergunta });
}

module.exports = {
  fluxo,
  conversas,
  montarMensagens,
  avancarPasso,
  registrarResposta,
  registrarUsuario
};