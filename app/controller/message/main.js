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

messageController.sendByAi = async (jid) => {
  console.log(jid);

  let message_options = {
    props: [
      "message.type",
      "message.datetime",
      "message.content",
      "message.from_me",
    ],
    strict_params: { keys: [], values: [] },
    order_params: [["message.datetime", "desc"]],
    limit: 10
  };

  lib.Query.fillParam("message.jid", jid, message_options.strict_params);
  let message_history = await Message.filter(message_options);

  let history_json = "";

  history_json += `
    Você é um chatbot HUMANIZADO chamado Gabriel e está seguindo um fluxo de prospecção comercial com perguntas previamente definidas.\n

REGRAS:\n
1. Você NUNCA DEVE ALTERAR AS MENSAGENS DO FLUXO, apenas na Pergunta 3 substituindo [nome do cliente] pelo nome que ele informar.\n
2. As mensagens devem ser ENVIADAS ESTRITAMENTE COMO ESTÃO, incluindo quebras de linha, pontuação e espaços.\n
3. SE o cliente fizer uma pergunta fora do fluxo, responda de forma clara e objetiva, QUEBRE A LINHA, e em seguida CONTINUE enviando a próxima pergunta do fluxo.\n
4. O fluxo tem 4 perguntas (pergunta 1 a pergunta 4). Siga estritamente essa ordem.\n
5. As mensagens devem estar 100% prontas para envio, SEM explicações ou comentários extras, por exemplo: "Pergunta 1".\n

Estas são as mensagens do fluxo que você deve seguir:

-> Pergunta 1:\n
Oi, meu nome é Gabriel, represento a Cotálogo e nossa proposta é aprimorar a apresentação, divulgação e atendimento das empresas através de um catálogo digital como esse:

suaempresa.cotalogo.com

Gostaria de ter um personalizado para sua empresa?\n

-> Pergunta 2:\n
Legal, esse catálogo é criado através de nossa plataforma que pode ser acessada pelo celular ou computador.

Através da plataforma você tem total controle do catálogo, podendo adicionar e atualizar os produtos por conta própria.

O catálogo custa R$49,90 por mês mas não exige assinatura, funciona como créditos de celular onde você recarrega e utiliza por 30 dias.

Nós daremos consultoria gratuita durante a construção do seu catálogo.  

Qual é o seu nome?\n

Pergunta 3: \n
Eu posso criar um esboço do seu catálogo, gostaria de ver como fica?\n

Pergunta 4: \n
Legal, me envia por favor a foto da sua logomarca e de 2 produtos com nome e preço.\n`;

  history_json += `
  
  -> A seguir o histórico de mensagens da conversa para que você identifique quais perguntas já foram feitas e saber a próxima que deve ser enviada:\n`

  for (let i = message_history.length - 1; i > 0; i--) {
    let message = `${message_history[i].from_me ? "-> system: " : "-> user: "}`;
    message += `${message_history[i].content}; \n`;

    history_json += message;
  };

  console.log(history_json);

  // console.log(history_json);

  let response = await ChatGPTAPI(history_json);
  console.log("Resposta do CHATGPT: ", response);

  await wa.getSocket().sendMessage(jid, {
    text: response
  });
};

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
      contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
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
      let contact = new Contact();
      contact.jid = data.key.remoteJid;
      contact.typing = Date.now();
      await contact.update();

      setTimeout(async () => {
        console.log('settimeout');
        const updatedContact = (await Contact.findByJid(contact.jid))[0];
        console.log('updatedContact', updatedContact);

        const lastMessageDelay = Date.now() - updatedContact.typing;

        console.log('lastMessageDelay', lastMessageDelay);

        if (lastMessageDelay >= 3000) {
          await contact.resetTyping();
          await messageController.sendByAi(contact.jid);
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
