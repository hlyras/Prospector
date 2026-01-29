const Message = require("../../model/message/main");

const { getSession } = require('../../middleware/baileys/main');
const activeWebSockets = require('../../middleware/websocket/connectionStore');
const prospect_flow = require('../../controller/message/flow/prospect');
const { ChatGPTAPI } = require('../../middleware/chatgpt/main');
const lib = require('jarmlib');

function randomizeMessage(message) {
  return [
    {
      role: "system",
      content: `
Reescreva a mensagem abaixo de formas diferentes para evitar filtros antispam. 
ATENÇÃO!!! -> A única regra é que as palavras 'proposta', 'aprimorar', 'apresentação', 'divulgação' e 'atendimento' não podem ser alteradas por sinônimos.
Também não quero que utilize a palavra: 'Missão'

Frase para ser reescrita:
${message}

Tarefa:
Você deverá popular o output do JSON com a nova mensagem:
Atenção o JSON precisa ser formatado corretamente e válido, sem blocos de código, sem texto explicativo, sem comentários.
Todas as chaves e strings devem estar entre aspas duplas. 
Devem ser incluídas duas quebras de linha antes de enviar o link.
{
"output": "Melhor resposta possível para o cliente"
}
      `
    }
  ]
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

async function sendByAi(contact) {
  console.log('send by ai');
  console.log(contact.jid);

  let session = getSession(contact.seller_id);
  if (!session || !session.sock || !session.connected) {
    console.log({ msg: "Sessão WhatsApp não conectada!" });
    return false;
  }

  let message_options = {
    props: [
      "message.type",
      "message.datetime",
      "message.content",
      "message.from_me",
    ],
    strict_params: { keys: [], values: [] },
    order_params: [["message.datetime", "desc"]],
    limit: 20
  };

  lib.Query.fillParam("message.jid", contact.jid, message_options.strict_params);
  let message_history = await Message.filter(message_options);

  let history = "";
  for (let i = parseInt(message_history.length) - 1; i >= 0; i--) {
    let sender = message_history[i].from_me ? "Bot" : "Cliente";
    let content = message_history[i].content || "";
    history += `[${sender}]: ${content}\n`;
  };

  if (contact.flow_step == 5) {
    return true;
  }

  let response = await ChatGPTAPI({
    model: "gpt-4o-mini",
    messages: prospect_flow[contact.flow_step](contact, history)
  });

  let gpt_response = JSON.parse(response);

  if (contact.flow_step == 0) {
    contact.flow_step = parseInt(contact.flow_step) + 1;

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      let data = {
        jid: contact.jid,
        notify_alert: true,
        conected: true
      };

      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ data }));
      }
    };

    await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
      text: gpt_response.output
    });

    contact.update();
    return true;
  }

  // O cliente tem interesse no catálogo?
  else if (contact.flow_step == 1) {
    if (gpt_response.name) {
      contact.name = gpt_response.name;
    }

    if (gpt_response.flow_step == "next") {
      contact.status = "conectado";
      contact.notify = 1;
      contact.flow_step = parseInt(contact.flow_step) + 1;

      for (const [sessionID, ws] of activeWebSockets.entries()) {
        let data = {
          jid: contact.jid,
          notify_alert: true,
          conected: true
        };

        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ data }));
        }
      };
    }

    if (gpt_response.flow_step == "exit") {
      contact.autochat = 0;
    }

    if (gpt_response.reply == true) {
      let randomMessage = JSON.parse(await ChatGPTAPI({
        model: "gpt-4o-mini",
        messages: randomizeMessage(gpt_response.output)
      })).output

      await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
        text: randomMessage
      });

      if (gpt_response.flow_step == "next") {
        await sleep(randInt(3127, 7489));
        await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
          text: "Gostaria de ter um personalizado para sua empresa?"
        });
      }

      contact.update();
      return true;
    }

    contact.update();
    return false;
  }

  // O cliente tem interesse no catálogo?
  else if (contact.flow_step == 2) {
    if (gpt_response.name) {
      contact.name = gpt_response.name;
    }

    if (gpt_response.flow_step == "next") {
      contact.status = "interessado";
      contact.notify = 1;

      if (contact.name) { contact.flow_step = parseInt(contact.flow_step) + 2; }
      else { contact.flow_step = parseInt(contact.flow_step) + 1; }

      for (const [sessionID, ws] of activeWebSockets.entries()) {
        let data = {
          jid: contact.jid,
          notify_alert: true,
          interested: true
        };

        if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
      };

    }

    if (gpt_response.flow_step == "exit") {
      contact.autochat = 0;
    }

    if (gpt_response.reply == true) {
      await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
        text: gpt_response.output
      });

      contact.update();

      return true;
    }

    contact.update();

    return false;
  }

  // Informações / Perguntar o nome ou Oferecer esboço
  else if (contact.flow_step == 3) {
    if (gpt_response.name) {
      contact.name = gpt_response.name;
    }

    if (gpt_response.flow_step == "next") {
      contact.status = "interessado";
      contact.notify = 1;
      contact.flow_step = parseInt(contact.flow_step) + 1;

      for (const [sessionID, ws] of activeWebSockets.entries()) {
        let data = {
          jid: contact.jid,
          notify_alert: true,
          interested: true
        };

        if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
      };
    }

    if (gpt_response.flow_step == "exit") {
      contact.autochat = 0;
    }

    if (gpt_response.reply == true) {
      await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
        text: gpt_response.output
      });

      contact.update();

      return true;
    }

    contact.update();

    return false;
  }

  // O cliente tem interesse no esboço?
  else if (contact.flow_step == 4) {
    if (gpt_response.name) {
      contact.name = gpt_response.name;
    }

    if (gpt_response.flow_step == "next") {
      contact.status = "demonstração";
      contact.notify = 1;
      contact.flow_step = parseInt(contact.flow_step) + 1;
      contact.autochat = 0;

      for (const [sessionID, ws] of activeWebSockets.entries()) {
        let data = {
          jid: contact.jid,
          notify_alert: true,
          interested: true
        };

        if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
      };
    }

    if (gpt_response.flow_step == "exit") {
      contact.autochat = 0;
    }

    if (gpt_response.reply == true) {
      await getSession(contact.seller_id).sock.sendMessage(contact.jid, {
        text: gpt_response.output
      });

      contact.update();

      return true;
    }

    contact.update();

    return false;
  } else {
    return true;
  }
};

module.exports = sendByAi;