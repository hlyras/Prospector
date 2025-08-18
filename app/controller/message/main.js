const Contact = require("../../model/contact/main");
const Message = require("../../model/message/main");

const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const activeWebSockets = require('../../middleware/websocket/connectionStore');
const { getProfilePicWithTimeout } = require('../../middleware/baileys/controller');
const { downloadMedia } = require('../../middleware/baileys/controller');

const ChatGPTAPI = require('../../middleware/chatgpt/main');
const prospect_flow = require('./flow/prospect');

const messageController = {};

messageController.send = async (req, res) => {
  if (wa.isConnected()) {
    let response = await wa.getSocket()
      .sendMessage(req.body.jid, {
        text: req.body.content
      });
    res.send(response);
  } else {
    let msg = "WhatsApp não está pronto para enviar mensagens.";
    res.send({ msg });
  }
};

messageController.react = async (req, res) => {
  if (wa.isConnected()) {
    let response = await wa.getSocket()
      .sendMessage(req.body.jid, {
        react: {
          text: req.body.content,
          key: req.body.key,
          participant: req.body.participant ?
            req.body.participant : null
        }
      });

    res.send(response);
  } else {
    let msg = "WhatsApp não está pronto para enviar mensagens.";
    res.send({ msg });
  }
};

messageController.sendByAi = async (contact) => {
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

  let gpt_response = JSON.parse(response);

  // console.log(gpt_response);

  // O contato é da empresa?
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
    }

    // if (gpt_response.flow_step == "advance_two") {
    //   contact.status = "interessado";
    //   contact.notify = 1;
    //   contact.flow_step = parseInt(contact.flow_step) + 2;

    //   for (const [sessionID, ws] of activeWebSockets.entries()) {
    //     let data = {
    //       jid: contact.jid,
    //       notify_alert: true,
    //       interested: true
    //     };

    //     if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
    //   };
    // }

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
    contact.notify = 1;

    let profile_picture = await getProfilePicWithTimeout(wa.getSocket(), data.key.remoteJid);
    contact.profile_picture = profile_picture;
    data.profile_picture = profile_picture;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      contact.name = metadata.subject ? metadata.subject : null;
    } else {
      contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      let data = {
        jid: contact.jid,
        notify_alert: true
      };

      if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
    };

    try { await contact.create(); }
    catch (error) { console.log("User not created: ", error); }
  }

  if (contact && !data.key.fromMe) {
    let update_contact = new Contact();
    update_contact.jid = data.key.remoteJid;
    update_contact.notify = 1;

    if (isGroup) {
      const metadata = await wa.getSocket().groupMetadata(data.key.remoteJid);
      update_contact.name = metadata.subject ? metadata.subject : null;
    } else {
      update_contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      let data = {
        jid: contact.jid,
        notify_alert: true
      };

      if (contact.status == "conectado") { data.conected = true; }
      if (contact.status == "interessado") { data.interested = true; }
      if (contact.status == "demonstração") { data.demo = true; }

      if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
    };

    try { await update_contact.update(); }
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
    message.type = "text";
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

  if (data.message.reactionMessage) {
    message.type = "reaction";
    message.target_id = data.message.reactionMessage.key.id;
    message.content = data.message.reactionMessage.text;
  }

  try {
    if (message.type == "reaction") {
      if (!data.message.reactionMessage.text) {
        let reaction_message = (await Message.filter({
          strict_params: {
            keys: ["jid", "type", "target_id", "from_me"],
            values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
          }
        }))[0];

        message.origin_id = reaction_message.wa_id;
        Message.delete(reaction_message.wa_id);
      } else {
        let reaction_message = (await Message.filter({
          strict_params: {
            keys: ["jid", "type", "target_id", "from_me"],
            values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
          }
        }))[0];

        let message_create = await message.create();
        if (message_create.err) { console.log(message_create.err); }
        message.id = message_create.insertId;

        if (reaction_message) {
          message.origin_id = reaction_message.wa_id;
          Message.delete(reaction_message.wa_id);
        }
      }
    } else {
      let message_create = await message.create();
      if (message_create.err) { console.log(message_create.err); }
      message.id = message_create.insertId;

      if (contact?.autochat == 1 && !data.key.fromMe && message.type == "text") {
        let contact_chat = new Contact();
        contact_chat.jid = data.key.remoteJid;
        contact_chat.typing = Date.now();
        await contact_chat.update();

        setTimeout(async () => {
          const updated_contact = (await Contact.findByJid(contact.jid))[0];
          const lastMessageDelay = Date.now() - updated_contact.typing;

          if (lastMessageDelay >= 10000) {
            await contact_chat.resetTyping();
            let contact_info = new Contact();
            contact_info.jid = updated_contact.jid;
            contact_info.business = updated_contact.business;
            contact_info.name = updated_contact.name;
            contact_info.flow_step = parseInt(updated_contact.flow_step);
            contact_info.segment = updated_contact.segment;

            await messageController.sendByAi(contact_info);
          }
        }, 10000);
      }
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      if (ws.readyState === 1) {
        // console.log(message);
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
      strict_params: { keys: [], values: [] },
      order_params: [["message.datetime", "desc"]],
      limit: 200
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
