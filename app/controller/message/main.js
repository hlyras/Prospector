const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");
const activeWebSockets = require('../../middleware/websocket/connectionStore');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');
// ChatGPTAPI
const ChatGPTAPI = require('../../middleware/chatgpt/main');

const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const { downloadMedia } = require('../../middleware/baileys/controller');

const messageController = {};

messageController.send = async (req, res) => {
  if (wa.isConnected()) {
    let response = await wa.getSocket().sendMessage(req.body.jid, {
      text: req.body.content
    });
    res.send(response);
  } else {
    let msg = "WhatsApp não está pronto para enviar mensagens.";
    res.send({ msg });
  }
};

messageController.sendByAi = async (contact) => {
  const flow = [`Boa tarde é da empresa ${contact.business}?`,
    "Oi, meu nome é Gabriel, represento a Cotálogo e nossa proposta é aprimorar a apresentação, divulgação e atendimento das empresas através de um catálogo digital como esse: \n\n\
\
suaempresa.cotalogo.com\n\n\
\
Gostaria de ter um personalizado para sua empresa ? ",
    "Legal, esse catálogo é criado através de nossa plataforma que pode ser acessada pelo celular ou computador.\n\n\
\
Através da plataforma você tem total controle do catálogo, podendo adicionar e atualizar os produtos por conta própria.\n\n\
\
O catálogo custa R$49, 90 por mês mas não exige assinatura, funciona como créditos de celular onde você recarrega e utiliza por 30 dias.\n\n\
\
Nós daremos consultoria gratuita durante a construção do seu catálogo.\n\n\
\
Qual é o seu nome?",
    "Eu posso criar um esboço do seu catálogo, gostaria de ver como fica?",
    "Legal, me envia por favor a foto da sua logomarca e de 2 produtos com nome e preço."
  ];

  let message_options = {
    props: [
      "message.type",
      "message.datetime",
      "message.content",
      "message.from_me",
    ],
    strict_params: { keys: [], values: [] },
    order_params: [["message.datetime", "desc"]],
    limit: 5
  };

  lib.Query.fillParam("message.jid", contact.jid, message_options.strict_params);
  let message_history = await Message.filter(message_options);

  let history = "";
  for (let i = parseInt(message_history.length) - 1; i >= 0; i--) {
    let sender = message_history[i].from_me ? "Bot" : "Cliente";
    let content = message_history[i].content || "";

    // Adiciona ao histórico com quebra de linha
    history += `[${sender}]: ${content}\n`;
  };

  console.log('flow[contact.flow_step]', flow[contact.flow_step]);
  console.log('history', history);

  let response = await ChatGPTAPI({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
Você é um autobot fazendo a prospecção de uma empresa.
Seu nome é Gabriel e sua conversa deve ser humanizada simulando uma pessoa real.
Você é representante da Cotálogo, uma empresa provedora de catálogos digitais.
      
Você receberá:
1. Um histórico de mensagens.
2. A pergunta que deveria ter sido respondida.
3. A próxima pergunta do fluxo

Sua primeira tarefa é analisar se as últimas mensagens do cliente responde a essa pergunta.
A segunda tarefa é identificar se o cliente fez alguma pergunta.
A terceira tarefa é identificar se a próxima pergunta do fluxo responde a pergunta do cliente ou não. 
A "resposta_indicada" deve ser compativel com a próxima pergunta, pois será usada a "resposta_indicada" antes da próxima pergunta na mesma mensagem.

Retorne APENAS em JSON no formato:
{
  "respondeu": true|false,
  "justificativa": "explicação breve"
  "perguntou": true|false,
  "resposta_indicada:": "Você deve fornecer a resposta ideal para a pergunta do cliente."
}
      `},
      {
        role: "system",
        content: `
Histórico:
${history}

Pergunta que deveria ser respondida:
${flow[parseInt(contact.flow_step)]}

Próxima pergunta do fluxo:
${flow[parseInt(contact.flow_step) + 1]}
        `
      }
    ]
  });

  console.log(response);

  // console.log(message_history[i].content);
  // messages.push({
  //   "role": `${message_history[i].from_me ? "system" : "user"}`,
  //   "content": `${message_history[i].content}`
  // });

  // [Cliente]: Olá, tudo bem?
  // [Bot]: Olá! Qual é o seu nome?
  // [Cliente]: João

  // let response = await ChatGPTAPI(JSON.stringify({
  //   model: "gpt-4o-mini",
  //   messages: [
  //     {
  //       role: "system",
  //       content: `
  //       Você receberá:
  //       1. Um histórico de mensagens.
  //       2. A pergunta que deveria ter sido respondida.

  //       Sua tarefa é analisar se as últimas mensagens do cliente responde a essa pergunta.
  //       Retorne APENAS em JSON no formato:
  //       {
  //         "respondeu": true|false,
  //         "justificativa": "explicação breve"
  //       }
  //     `
  //     },
  //     {
  //       role: "user",
  //       content: `
  //       Histórico:
  //       ${history}

  //       Pergunta que deveria ser respondida:
  //       ${flow[contact.flow_step]}
  //     `
  //     }
  //   ]
  // }));

  // console.log("Resposta do CHATGPT: ", response);

  // await wa.getSocket().sendMessage(jid, {
  //   text: response
  // });

  // let step = 0;

  // console.log(flow);

  // let message_options = {
  //   props: [
  //     "message.type",
  //     "message.datetime",
  //     "message.content",
  //     "message.from_me",
  //   ],
  //   strict_params: { keys: [], values: [] },
  //   order_params: [["message.datetime", "desc"]],
  //   limit: 10
  // };

  // lib.Query.fillParam("message.jid", jid, message_options.strict_params);
  // let message_history = await Message.filter(message_options);

  // const messages = [
  //   {
  //     role: "system",
  //     content: `Você é um chatbot comercial. Deve seguir exatamente as mensagens do fluxo na ordem. Fluxo: ${flow.join("\n\n")}`
  //   },
  //   { role: "system", content: `Passo atual: ${step}` },
  //   ...message_history
  // ];
};

// messageController.sendByAi = async (jid) => {
//   console.log(jid);

//   let message_options = {
//     props: [
//       "message.type",
//       "message.datetime",
//       "message.content",
//       "message.from_me",
//     ],
//     strict_params: { keys: [], values: [] },
//     order_params: [["message.datetime", "desc"]],
//     limit: 10
//   };

//   lib.Query.fillParam("message.jid", jid, message_options.strict_params);
//   let message_history = await Message.filter(message_options);

//   let messages = [{
//     role: "system",
//     content: `Você é um chatbot que está fazendo uma prospecção ativa.Você deve fazer as seguintes 4 perguntas na ordem, não deve alterar as palavras das mensagens pois cada uma tem um objetivo: \
//       Caso o cliente pergunte algo fora do fluxo, responda a pergunta dele de acordo com as informações disponíveis na mensagem 2 e logo após responder faça a próxima mensagem do fluxo.
//       As mensagens do fluxo NÃO DEVEM SER MODIFICADAS, as mensagens devem ser enviadas estritamente como informadas e com quebras de linhas.

//       1. Oi, meu nome é Gabriel, represento a Cotálogo e nossa proposta é aprimorar a apresentação, divulgação e atendimento das empresas através de um catálogo digital como esse:

//       suaempresa.cotalogo.com

//       Gostaria de ter um personalizado para sua empresa ?

//       2. Legal, esse catálogo é criado através de nossa plataforma que pode ser acessada pelo celular ou computador.

//       Através da plataforma você tem total controle do catálogo, podendo adicionar e atualizar os produtos por conta própria.

//       O catálogo custa R$49, 90 por mês mas não exige assinatura, funciona como créditos de celular onde você recarrega e utiliza por 30 dias.

//       Nós daremos consultoria gratuita durante a construção do seu catálogo.

//       Qual é o seu nome ?

//       3. Eu posso criar um esboço do seu catálogo, gostaria de ver como fica ?

//       4. Legal, me envia por favor a foto da sua logomarca e de 2 produtos com nome e preço.

//       -> Analise o histórico enviado a seguir e com base na última mensagem da conversa escolha a próxima que deve ser enviada.`
//   }];

//   for (let i = message_history.length - 1; i >= 0; i--) {
//     // console.log(message_history[i].content);
//     messages.push({
//       "role": `${message_history[i].from_me ? "system" : "user"}`,
//       "content": `${message_history[i].content}`
//     });
//   };

//   console.log(messages);

//   let response = await ChatGPTAPI(messages);
//   console.log("Resposta do CHATGPT: ", response);

//   await wa.getSocket().sendMessage(jid, {
//     text: response
//   });
// };

messageController.receipt = async ({ data }) => {
  let sender = data.key.remoteJid.split("@")[0];
  if (sender == "status") return;

  const isGroup = data.key.remoteJid.split("@")[1] == "g.us" ? true : false;

  let contact = (await Contact.findByJid(data.key.remoteJid))[0] || null;

  if (!contact) {
    let contact = new Contact();
    contact.jid = data.key.remoteJid;
    contact.autochat = 0;
    contact.created = 0;

    let profile_picture = await getProfilePicWithTimeout(wa.getSocket(), data.key.remoteJid);
    contact.profile_picture = profile_picture;
    data.profile_picture = profile_picture;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      contact.name = metadata.subject ? metadata.subject : null;
    } else {
      contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
      contact.name = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    try { await contact.create(); }
    catch (error) { console.log("User not created: ", error); }
  }

  if (contact && !data.key.fromMe) {
    let contact = new Contact();
    contact.jid = data.key.remoteJid;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      contact.name = metadata.subject ? metadata.subject : null;
    } else {
      contact.name = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    try { await contact.update(); }
    catch (error) { console.log("User not updated: ", error); }
  }

  let message = new Message();
  message.wa_id = data.key.id;
  message.jid = data.key.remoteJid;
  message.participant = isGroup ? data.key.participant : null;
  message.from_me = data.key.fromMe ? 1 : 0;
  message.datetime = data.messageTimestamp * 1000;
  message.raw = JSON.stringify(data);

  if (data.message.extendedTextMessage) {
    message.type = "text";
    message.content = data.message.extendedTextMessage.text;
  }

  if (data.message.conversation) {
    message.type = "conversation";
    message.content = data.message.conversation;
  }

  if (data.message.imageMessage) {
    message.type = "image";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  if (data.message.audioMessage) {
    message.type = "audio";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  if (data.message.videoMessage) {
    message.type = "video";
    message.content = await downloadMedia(data, wa.getSocket());
  }

  try {
    let message_create = await message.create();
    if (message_create.err) { console.log(message_create.err); }
    message.id = message_create.insertId;

    console.log('autochat', contact.autochat);
    console.log('data.key.fromMe', data.key.fromMe);

    if (contact.autochat == 1 && !data.key.fromMe) {
      let contact_chat = new Contact();
      contact_chat.jid = data.key.remoteJid;
      contact_chat.typing = Date.now();
      await contact_chat.update();

      setTimeout(async () => {
        const updatedContact = (await Contact.findByJid(contact.jid))[0];

        const lastMessageDelay = Date.now() - updatedContact.typing;

        if (lastMessageDelay >= 3000) {
          await contact_chat.resetTyping();
          await messageController.sendByAi(contact);
        }
      }, 3000);
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      if (ws.readyState === 1) { // ws.OPEN
        ws.send(JSON.stringify({ data, message }));
      }
    };
  } catch (error) {
    console.log(error);
  }
};

messageController.filter = async (req, res) => {
  try {
    let message_options = {
      props: [],
      strict_params: { keys: [], values: [] }
    };

    lib.Query.fillParam("message.jid", req.body.jid, message_options.strict_params);

    let messages = await Message.filter(message_options);

    if (!messages.length) {
      return res.send(messages);
    }

    res.send(messages);
  } catch (error) {
    console.log(error);
    res.send({ msg: "Ocorreu um erro ao filtrar os contatos" });
  }
};

module.exports = messageController;
