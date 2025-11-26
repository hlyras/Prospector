const Contact = require("../../model/contact/main");
const ContactList = require("../../model/contact/list");
const Message = require("../../model/message/main");
const Queue = require("../../model/queue/main");
const { enqueueMessage } = require("../../middleware/queue/main");

const lib = require('jarmlib');

const activeWebSockets = require('../../middleware/websocket/connectionStore');

const messageController = {};

messageController.send = async (req, res) => {
  let message = {};
  let options = {};

  let reply_message = req.body.reply ? JSON.parse(req.body.reply.message) : null;

  console.log(reply_message);

  res.send({ done: "Mensagem enviada" });
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
  // if (!data.key.fromMe) { return; }
  if (!data.message.extendedTextMessage && !data.message.conversation) { return; }

  const isGroup =
    data.key.remoteJid?.endsWith("@g.us") ||
    data.key.remoteJidAlt?.endsWith("@g.us");
  if (isGroup) { return console.log('group message'); }

  const correctJid =
    (data.key.remoteJid?.endsWith("s.whatsapp.net") && data.key.remoteJid) ||
    (data.key.remoteJidAlt?.endsWith("s.whatsapp.net") && data.key.remoteJidAlt) ||
    null;
  if (!correctJid) { return console.log('correctJid inválid'); }

  let contact = (await Contact.findByJid(correctJid))[0] || null;

  if (!contact) {
    contact = new Contact();
    contact.autochat = correctJid;
    contact.datetime = lib.date.timestamp.generate();
    contact.autochat = 0;
    contact.flow_step = 0;
    contact.created = 0;
    contact.notify = 1;
  }

  if (data.key.fromMe) {
    let contact_list = (await ContactList.filter({
      strict_params: {
        keys: ["jid"],
        values: [correctJid]
      },
      limit: 1
    }))[0];

    if (contact_list?.segment && contact_list?.status != 'Concluído') {
      contact.segment = contact_list.segment;
      contact.business = contact_list.business;

      let cl = new ContactList();
      cl.jid = contact.jid;
      cl.sent_datetime = lib.date.timestamp.generate();
      cl.status = "Concluído";
      await cl.update();
    }
  }

  let message = new Message();
  message.wa_id = data.key.id;
  message.jid = contact.jid;
  message.from_me = data.key.fromMe ? 1 : 0;
  message.datetime = data.messageTimestamp * 1000;
  message.raw = JSON.stringify(data);

  let msg = data.message;

  if (msg.extendedTextMessage) {
    message.type = "text";
    message.content = msg.extendedTextMessage.text;
  }

  if (msg.conversation) {
    message.type = "text";
    message.content = msg.conversation;
  }

  try {
    let message_create = await message.create();
    if (message_create.err) { console.log(message_create.err); }
    message.id = message_create.insertId;

    if (contact?.autochat == 1 && !data.key.fromMe && message.type == "text") {
      let queue_contact = (await Queue.filter({
        strict_params: {
          keys: ['contact_jid', 'status'],
          values: [contact.jid, 'Pendente']
        }
      }))[0];

      if (!queue_contact) {
        enqueueMessage({
          contact_jid: contact.jid,
          priority: parseInt(contact.flow_step) + 1,
          user_id: contact.seller_id
        });
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

// messageController.receipt = async ({ data }) => {
//   // if (!data.key.fromMe) { return; }
//   if (!data.message.extendedTextMessage && !data.message.conversation) { return; }

//   const isGroup = data.key.remoteJidAlt.split("@")[1] == "g.us" ? true : false;
//   if (isGroup) { return; }

//   let contact = (await Contact.findByJid(data.key.remoteJidAlt))[0] || null;

//   if (!contact) {
//     contact = new Contact();
//     contact.datetime = lib.date.timestamp.generate();
//     contact.autochat = 0;
//     // contact.flow_step = data.key.fromMe ? 1 : 0;
//     // contact.created = data.key.fromMe ? 1 : 0;
//     contact.notify = 1;

//     if (data.key.fromMe) {
//       let contact_list = (await ContactList.filter({
//         strict_params: {
//           keys: ["jid"],
//           values: [data.key.remoteJidAlt]
//         },
//         limit: 1
//       }))[0];

//       if (contact_list) {
//         contact.jid = data.key.remoteJidAlt;
//       } else {
//         contact_list = (await ContactList.filter({
//           strict_params: {
//             keys: ["jid"],
//             values: [data.key.remoteJid]
//           },
//           limit: 1
//         }))[0];

//         if (contact_list) {
//           contact.jid = data.key.remoteJid;
//         } else {
//           return console.log(`!! Contato não encontrado: ${data}`);
//         }
//       }

//       if (contact_list?.segment) {
//         contact.segment = contact_list.segment;
//         contact.business = contact_list.business;

//         let cl = new ContactList();
//         cl.jid = contact.jid;
//         cl.sent_datetime = lib.date.timestamp.generate();
//         cl.status = "Concluído";
//         await cl.update();
//         // enviar socket aqui
//       }
//     }

//     if (isGroup) {
//       // const metadata = await getGroupMetadataCached(wa.getSocket(), data.key.remoteJidAlt);
//       // contact.name = metadata?.subject || null;
//     } else {
//       // contact.business = !data.key.fromMe && data.pushName
//       //   ? data.pushName : null;
//     }

//     for (const [sessionID, ws] of activeWebSockets.entries()) {
//       data.jid = contact.jid;
//       data.notify_alert = true;

//       if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
//     };

//     try { await contact.create(); }
//     catch (error) { console.log("User not created: ", error); }
//   }

//   if (contact && !data.key.fromMe) {
//     let update_contact = new Contact();
//     update_contact.jid = data.key.remoteJidAlt;
//     update_contact.notify = 1;

//     if (isGroup) {
//       // const metadata = await getGroupMetadataCached(wa.getSocket(), data.key.remoteJidAlt);
//       // update_contact.name = metadata?.subject || null;
//     } else {
//       update_contact.business = !data.key.fromMe && data.pushName ? data.pushName : null;
//     }

//     for (const [sessionID, ws] of activeWebSockets.entries()) {
//       data.jid = contact.jid;
//       data.notify_alert = true;

//       if (contact.status == "conectado") { data.conected = true; }
//       if (contact.status == "interessado") { data.interested = true; }
//       if (contact.status == "demonstração") { data.demo = true; }

//       if (ws.readyState === 1) { ws.send(JSON.stringify({ data })); }
//     };

//     try { await update_contact.update(); }
//     catch (error) { console.log("User not updated: ", error); }
//   }

//   let message = new Message();
//   message.wa_id = data.key.id;
//   message.jid = data.key.remoteJidAlt;
//   message.participant = isGroup ? data.key.participant : null;
//   message.from_me = data.key.fromMe ? 1 : 0;
//   message.datetime = data.messageTimestamp * 1000;
//   message.raw = JSON.stringify(data);

//   // Descompacta mensagens aninhadas (viewOnce, ephemeral, etc.)
//   let msg = data.message;
//   if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
//   if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
//   if (msg.documentWithCaptionMessage) msg = msg.documentWithCaptionMessage.message;

//   if (msg.extendedTextMessage) {
//     message.type = "text";
//     message.content = msg.extendedTextMessage.text;
//   }

//   if (msg.conversation) {
//     message.type = "text";
//     message.content = msg.conversation;
//   }

//   if (msg.imageMessage) {
//     message.type = "image";
//     message.content = "image";
//     // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
//   }

//   if (msg.audioMessage) {
//     message.type = "audio";
//     message.content = "audio";
//     // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
//   }

//   if (msg.videoMessage) {
//     message.type = "video";
//     message.content = "video";
//     // message.content = await queueDownload(() => downloadMedia(msg, wa.getSocket()));
//   }

//   if (msg.reactionMessage) {
//     message.type = "reaction";
//     message.target_id = msg.reactionMessage.key.id;
//     message.content = msg.reactionMessage.text;
//   }

//   try {
//     if (message.type == "reaction") {
//       if (!data.message.reactionMessage.text) {
//         let reaction_message = (await Message.filter({
//           strict_params: {
//             keys: ["jid", "type", "target_id", "from_me"],
//             values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
//           }
//         }))[0];

//         message.origin_id = reaction_message.wa_id;
//         Message.delete(reaction_message.wa_id);
//       } else {
//         let reaction_message = (await Message.filter({
//           strict_params: {
//             keys: ["jid", "type", "target_id", "from_me"],
//             values: [contact.jid, "reaction", message.target_id, data.key.fromMe ? 1 : 0]
//           }
//         }))[0];

//         let message_create = await message.create();
//         if (message_create.err) { console.log(message_create.err); }
//         message.id = message_create.insertId;

//         if (reaction_message) {
//           message.origin_id = reaction_message.wa_id;
//           Message.delete(reaction_message.wa_id);
//         }
//       }
//     } else {
//       let message_create = await message.create();
//       if (message_create.err) { console.log(message_create.err); }
//       message.id = message_create.insertId;

//       if (contact?.autochat == 1 && !data.key.fromMe && message.type == "text") {
//         let queue_contact = (await Queue.filter({
//           strict_params: {
//             keys: ['contact_jid', 'status'],
//             values: [contact.jid, 'Pendente']
//           }
//         }))[0];

//         if (queue_contact) {
//           return;
//         }

//         enqueueMessage({
//           contact_jid: contact.jid,
//           priority: parseInt(contact.flow_step),
//           user_id: contact.seller_id
//         });
//       }
//     }

//     for (const [sessionID, ws] of activeWebSockets.entries()) {
//       if (ws.readyState === 1) {
//         ws.send(JSON.stringify({ data, message }));
//       }
//     };
//   } catch (error) {
//     console.log(error);
//   }
// };

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