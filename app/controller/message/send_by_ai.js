const Message = require("../../model/message/main");

const { ChatGPTAPI } = require('../../middleware/chatgpt/main');

async function sendByAi(contact) {
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

  let response = await ChatGPTAPI({
    model: "gpt-4o-mini",
    messages: prospect_flow[contact.flow_step](contact, history)
  });

  wa.getSocket().sendPresenceUpdate("available", contact.jid);

  let gpt_response = JSON.parse(response);

  if (contact.flow_step == 1) {
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
      await wa.getSocket().sendMessage(contact.jid, {
        text: gpt_response.output
      });
    }

    contact.update();
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

      // await wa.getSocket().sendMessage("120363403607809452@g.us", {
      //   text: `
      // Telefone: ${contact.jid.split("@")[0]}\n
      // Nome: ${contact.name}\n
      // Empresa: ${contact.business}`
      // });
    }

    if (gpt_response.flow_step == "exit") {
      contact.autochat = 0;
    }

    if (gpt_response.reply == true) {
      await wa.getSocket().sendMessage(contact.jid, {
        text: gpt_response.output
      });
    }

    contact.update();
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
      await wa.getSocket().sendMessage(contact.jid, {
        text: gpt_response.output
      });
    }

    contact.update();
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
      await wa.getSocket().sendMessage(contact.jid, {
        text: gpt_response.output
      });
    }

    contact.update();
  }
};

module.exports = sendByAi;