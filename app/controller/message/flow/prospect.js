// "output": "Caso personalizada, deve ser concatenada a resposta para a pergunta do cliente e logo abaixo uma quebra de linha e a próxima mensagem do fluxo."

// let basic_tasks = `
// Preciso que faça essas 3 tarefas e o Output de forma EXTREMAMENTE DILIGENTE!
// Tarefa 1: Analisar se as últimas mensagens do cliente no histórico responde a última pergunta do fluxo mesmo que indiretamente;
// Tarefa 2: Identificar perguntas ou dúvidas feitas pelo cliente;
// Tarefa 3: No conteúdo da próxima pergunta do fluxo tem resposta para a pergunta identificada na tarefa 2?;
// output: "caso o conteúdo da próxima pergunta não responda o questionamento do cliente deve ser fornecida uma resposta personalizada, caso não haja questionamentos apenas enviar a próxima mensagem do fluxo";
// `;

let basic_info = `
Informações de contexto:
Seu nome é Gabriel;
Você está prospectando um cliente através de um fluxo de mensagens;
Você é representante da Cotálogo, uma empresa provedora de catálogos digitais;

Você receberá como informação base:
1. O histórico de mensagens;
2. A última pergunta do fluxo feita;
3. A próxima pergunta do fluxo;
`;

function flowSteps(contact) {
  return [`
Boa tarde é da empresa ${contact.business}?
  `, `
Oi, meu nome é Gabriel, represento a Cotálogo e nossa proposta é aprimorar a apresentação, divulgação e atendimento das empresas através de um catálogo digital como esse:

suaempresa.cotalogo.com

Gostaria de ter um personalizado para sua empresa?
  `, `
Esse catálogo é criado através de nossa plataforma que pode ser acessada pelo celular ou computador.

Através da plataforma você tem total controle do catálogo, podendo adicionar e atualizar os produtos por conta própria.

O catálogo custa R$49,90 por mês mas não exige assinatura, funciona como créditos de celular onde você recarrega e utiliza por 30 dias.

Nós daremos consultoria gratuita durante a construção do seu catálogo.

Qual é o seu nome?
  `, `
Eu posso criar um esboço do seu catálogo, gostaria de ver como fica?
  `, `
Legal, me envia por favor a foto da sua logomarca e de 2 produtos com nome e preço.
  `]
};

const asks = [
];

const flow = [
  function ask0() {
    return [`
      Bom dia é d? ${contact.business}?

      Retorne esse JSON com o artigo correto (a ou o) de acordo com o nome da empresa:
      {
        "output": "Bom dia é d? ${contact.business}?"
      }
      `]
  },
  function ask1(contact, history) {
    let flow = flowSteps(contact);

    return [
      {
        role: "system",
        content: `
${basic_info}

Atenção, preciso que faça a tarefa e o Output de forma EXTREMAMENTE DILIGENTE!
Tarefa_1: Identificar através da resposta do cliente no histórico se o contato pertence a empresa perguntada.
Caso sim: Enviar próxima mensagem do fluxo;
Caso não: Responda: "Tudo bem, obrigado".

Regra importante: 
Devem ser respeitadas as quebras de linhas duplas das mensagens do fluxo;

Responda **apenas** com JSON válido, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "tarefa_1": true|false,
  "tarefa_1_explicação": "Explique de forma breve",
  "output": "Retorne com a melhor resposta para o cenário."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Última pergunta do fluxo feita:
${flow[parseInt(contact.flow_step) - 1]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step)]}
        `}
    ];
  },
  function ask2(contact, history) {
    let flow = flowSteps(contact);

    return [
      {
        role: "system",
        content: `
${basic_info}

Atenção, preciso que faça a tarefa e o Output de forma EXTREMAMENTE DILIGENTE!
Tarefa_1: Identificar através da resposta do cliente no histórico se ele tem interesse em ter o catálogo personalizado.
Caso "sim": Enviar próxima mensagem do fluxo com um "Legal" antes: Legal, esse cat...;
Caso "não": Responda: "Tudo bem, precisando estou a disposição.".
Caso "Como funciona?": Enviar próxima mensagem do fluxo;

Regra importante: 
Devem ser respeitadas as quebras de linhas duplas das mensagens do fluxo;

Responda **apenas** com JSON válido, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "tarefa_1": true|false,
  "tarefa_1_explicação": "Explique de forma breve",
  "output": "Retorne com a melhor resposta para o cenário."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Última pergunta do fluxo feita:
${flow[parseInt(contact.flow_step) - 1]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step)]}
        `}
    ];
  },
  function ask3(contact, history) {
    let flow = flowSteps(contact);

    return [
      {
        role: "system",
        content: `
${basic_info}

Atenção, preciso que faça a tarefa e o Output de forma EXTREMAMENTE DILIGENTE!
Tarefa_1: Identificar através da resposta do cliente no histórico se o contato pertence a empresa perguntada.
Caso sim: Enviar próxima mensagem do fluxo;
Caso não: Responda: "Tudo bem, obrigado".

Regra importante: 
Devem ser respeitadas as quebras de linhas duplas das mensagens do fluxo;

Responda **apenas** com JSON válido, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "tarefa_1": true|false,
  "tarefa_1_explicação": "Explique de forma breve",
  "output": "Retorne com a melhor resposta para o cenário."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Última pergunta do fluxo feita:
${flow[parseInt(contact.flow_step) - 1]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step)]}
        `}
    ];
  },
  function ask4(contact, history) {
    let flow = flowSteps(contact);

    return [
      {
        role: "system",
        content: `
${basic_info}

Atenção, preciso que faça a tarefa e o Output de forma EXTREMAMENTE DILIGENTE!
Tarefa_1: Identificar através da resposta do cliente no histórico se o contato pertence a empresa perguntada.
Caso sim: Enviar próxima mensagem do fluxo;
Caso não: Responda: "Tudo bem, obrigado".

Regra importante: 
Devem ser respeitadas as quebras de linhas duplas das mensagens do fluxo;

Responda **apenas** com JSON válido, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "tarefa_1": true|false,
  "tarefa_1_explicação": "Explique de forma breve",
  "output": "Retorne com a melhor resposta para o cenário."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Última pergunta do fluxo feita:
${flow[parseInt(contact.flow_step) - 1]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step)]}
        `}
    ];
  },
  function ask5(contact, history) {
    let flow = flowSteps(contact);

    return [
      {
        role: "system",
        content: `
${basic_info}

Atenção, preciso que faça a tarefa e o Output de forma EXTREMAMENTE DILIGENTE!
Tarefa_1: Identificar através da resposta do cliente no histórico se o contato pertence a empresa perguntada.
Caso sim: Enviar próxima mensagem do fluxo;
Caso não: Responda: "Tudo bem, obrigado".

Regra importante: 
Devem ser respeitadas as quebras de linhas duplas das mensagens do fluxo;

Responda **apenas** com JSON válido, sem blocos de código, sem texto explicativo, sem comentários.  
Todas as chaves e strings devem estar entre aspas duplas e as quebras de linha devem ser representadas como \n.
{
  "tarefa_1": true|false,
  "tarefa_1_explicação": "Explique de forma breve",
  "output": "Retorne com a melhor resposta para o cenário."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Última pergunta do fluxo feita:
${flow[parseInt(contact.flow_step) - 1]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step)]}
        `}
    ];
  },
];

module.exports = flow;