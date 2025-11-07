const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const Message = require("../../model/message/main");
const { enqueueMessage } = require("../../middleware/queue/main");

const lib = require('jarmlib');

const wa = require('../../middleware/baileys/main');
const activeWebSockets = require('../../middleware/websocket/connectionStore');

const messageController = {};

messageController.send = async (req, res) => {
  let message = {};
  let options = {};

  let reply_message = req.body.reply ? JSON.parse(req.body.reply.message) : null;

  // const urlRegex = /(https?:\/\/[^\s]+)/g;
  // const found = req.body.content.match(urlRegex);

  // if (found && found.length > 0) {
  //   options.linkPreview = true;

  //   const og = await getOGData(found[0]);

  //   message.contextInfo = {
  //     externalAdReply: {
  //       title: og.title,
  //       body: og.body,
  //       thumbnail: og.thumbnail,
  //       mediaType: 1,
  //       renderLargerThumbnail: true,
  //       sourceUrl: og.sourceUrl,
  //       renderLargerThumbnail: true
  //     }
  //   }
  // }

  if (req.body.type == "text") {
    message.text = req.body.content;
  }

  if (reply_message) {
    options.quoted = reply_message;
  }

  // console.log(req.body.jid, message, options);

  if (wa.isConnected()) {
    let response = await wa.getSocket()
      .sendMessage(req.body.jid, message, options);
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

messageController.receipt = async ({ data }) => {
  if (!data.key.fromMe) { return; }

  let sender = data.key.remoteJid.split("@")[0];
  if (sender == "status") return;

  const isGroup = data.key.remoteJid.split("@")[1] == "g.us" ? true : false;
  if (isGroup) { return; }

  let contact = (await Contact.findByJid(data.key.remoteJid))[0] || null;

  if (!contact) {
    contact = new Contact();
    contact.jid = data.key.remoteJid;
    contact.datetime = lib.date.timestamp.generate();
    contact.autochat = data.key.fromMe ? 1 : 0;
    contact.flow_step = data.key.fromMe ? 1 : 0;
    contact.created = data.key.fromMe ? 1 : 0;
    contact.notify = 1;

    if (data.key.fromMe) {
      let contact_list = (await ContactList.filter({
        strict_params: {
          keys: ["jid"],
          values: [contact.jid]
        },
        limit: 1
      }))[0];

      if (contact_list?.segment) {
        contact.segment = contact_list.segment;
        contact.business = contact_list.business;

        let cl = new ContactList();
        cl.jid = contact.jid;
        cl.sent_datetime = lib.date.timestamp.generate();
        cl.status = "Concluído";
        await cl.update();
        // enviar socket aqui
      }
    }

    if (isGroup) {
      // const metadata = await getGroupMetadataCached(wa.getSocket(), data.key.remoteJid);
      // contact.name = metadata?.subject || null;
    } else {
      // contact.business = !data.key.fromMe && data.pushName
      //   ? data.pushName : null;
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
      // const metadata = await getGroupMetadataCached(wa.getSocket(), data.key.remoteJid);
      // update_contact.name = metadata?.subject || null;
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

  // Descompacta mensagens aninhadas (viewOnce, ephemeral, etc.)
  let msg = data.message;
  if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
  if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage.message;

  if (msg.extendedTextMessage) {
    message.type = "text";
    message.content = msg.extendedTextMessage.text;
  }

  if (msg.conversation) {
    message.type = "text";
    message.content = msg.conversation;
  }

  if (msg.imageMessage) {
    message.type = "image";
    message.content = "image";
    // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
  }

  if (msg.audioMessage) {
    message.type = "audio";
    message.content = "audio";
    // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
  }

  if (msg.videoMessage) {
    message.type = "video";
    message.content = "video";
    // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
  }

  if (msg.reactionMessage) {
    message.type = "reaction";
    message.target_id = msg.reactionMessage.key.id;
    message.content = msg.reactionMessage.text;
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
        return;

        if (contact.typing) { return; }

        let contact_chat = new Contact();
        contact_chat.jid = data.key.remoteJid;
        contact_chat.typing = "waiting";
        await contact_chat.update();

        enqueueMessage({
          contact_jid: contact.jid,
          priority: parseInt(contact.flow_step) + 1
        });

        // await messageController.sendByAi(contact_info);
      }
    }

    for (const [sessionID, ws] of activeWebSockets.entries()) {
      if (ws.readyState === 1) {
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